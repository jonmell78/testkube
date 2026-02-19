const path = require('path');
const fs = require('fs');
const request = require('supertest');

const TEST_DB = path.join(__dirname, '../../test-integration.db');
process.env.DB_PATH = TEST_DB;
process.env.NODE_ENV = 'test';

const app = require('../../src/app');
const { closeDb, getDb } = require('../../src/db');

afterAll(() => {
  closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

beforeEach(() => {
  getDb().exec('DELETE FROM tasks');
});

// Helper
async function createTask(overrides = {}) {
  const res = await request(app)
    .post('/api/tasks')
    .send({ title: 'Default task', ...overrides });
  return res.body;
}

// ---- Health check ----
describe('GET /health', () => {
  test('returns 200 with ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ---- POST /api/tasks ----
describe('POST /api/tasks', () => {
  test('creates a task with title only', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Write tests' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Write tests');
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('pending');
    expect(res.body.priority).toBe('medium');
  });

  test('creates a task with all fields', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Full task',
        description: 'Complete description',
        status: 'in_progress',
        priority: 'high',
        due_date: '2025-06-15T00:00:00.000Z',
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('in_progress');
    expect(res.body.priority).toBe('high');
  });

  test('returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/tasks').send({ description: 'No title' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('returns 400 for invalid status', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Bad status', status: 'unknown' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid priority', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Bad priority', priority: 'critical' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid due_date format', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Bad date', due_date: 'not-a-date' });
    expect(res.status).toBe(400);
  });
});

// ---- GET /api/tasks ----
describe('GET /api/tasks', () => {
  test('returns empty array when no tasks', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all tasks', async () => {
    await createTask({ title: 'Task 1' });
    await createTask({ title: 'Task 2' });
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filters tasks by status', async () => {
    await createTask({ title: 'Pending task', status: 'pending' });
    await createTask({ title: 'Done task', status: 'completed' });
    const res = await request(app).get('/api/tasks?status=pending');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Pending task');
  });

  test('filters tasks by priority', async () => {
    await createTask({ title: 'Low', priority: 'low' });
    await createTask({ title: 'High', priority: 'high' });
    const res = await request(app).get('/api/tasks?priority=high');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].priority).toBe('high');
  });

  test('searches tasks by title', async () => {
    await createTask({ title: 'Fix the login bug' });
    await createTask({ title: 'Write documentation' });
    const res = await request(app).get('/api/tasks?search=login');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Fix the login bug');
  });

  test('returns 400 for invalid status filter', async () => {
    const res = await request(app).get('/api/tasks?status=invalid');
    expect(res.status).toBe(400);
  });
});

// ---- GET /api/tasks/stats ----
describe('GET /api/tasks/stats', () => {
  test('returns zero stats when no tasks', async () => {
    const res = await request(app).get('/api/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 0, pending: 0, in_progress: 0, completed: 0 });
  });

  test('returns correct task counts by status', async () => {
    await createTask({ status: 'pending' });
    await createTask({ status: 'pending' });
    await createTask({ status: 'in_progress' });
    await createTask({ status: 'completed' });
    const res = await request(app).get('/api/tasks/stats');
    expect(res.body.total).toBe(4);
    expect(res.body.pending).toBe(2);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.completed).toBe(1);
  });
});

// ---- GET /api/tasks/:id ----
describe('GET /api/tasks/:id', () => {
  test('returns a task by ID', async () => {
    const task = await createTask({ title: 'Find me' });
    const res = await request(app).get(`/api/tasks/${task.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Find me');
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app).get('/api/tasks/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  test('returns 400 for invalid UUID', async () => {
    const res = await request(app).get('/api/tasks/not-a-uuid');
    expect(res.status).toBe(400);
  });
});

// ---- PUT /api/tasks/:id ----
describe('PUT /api/tasks/:id', () => {
  test('updates a task', async () => {
    const task = await createTask({ title: 'Original' });
    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .send({ title: 'Updated', status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.status).toBe('completed');
  });

  test('partial update preserves unchanged fields', async () => {
    const task = await createTask({ title: 'Stable', priority: 'high', description: 'keep this' });
    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .send({ title: 'Changed title' });
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high');
    expect(res.body.description).toBe('keep this');
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .put('/api/tasks/00000000-0000-0000-0000-000000000000')
      .send({ title: 'Ghost' });
    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid status in update', async () => {
    const task = await createTask();
    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid UUID in update', async () => {
    const res = await request(app)
      .put('/api/tasks/bad-id')
      .send({ title: 'test' });
    expect(res.status).toBe(400);
  });
});

// ---- DELETE /api/tasks/:id ----
describe('DELETE /api/tasks/:id', () => {
  test('deletes an existing task and returns 204', async () => {
    const task = await createTask({ title: 'Bye bye' });
    const res = await request(app).delete(`/api/tasks/${task.id}`);
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/tasks/${task.id}`);
    expect(getRes.status).toBe(404);
  });

  test('returns 404 when deleting non-existent task', async () => {
    const res = await request(app).delete('/api/tasks/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid UUID on delete', async () => {
    const res = await request(app).delete('/api/tasks/bad-id');
    expect(res.status).toBe(400);
  });
});

// ---- Full CRUD lifecycle ----
describe('Full CRUD lifecycle', () => {
  test('create → read → update → delete', async () => {
    // Create
    const create = await request(app).post('/api/tasks').send({ title: 'Lifecycle task', priority: 'low' });
    expect(create.status).toBe(201);
    const id = create.body.id;

    // Read
    const read = await request(app).get(`/api/tasks/${id}`);
    expect(read.status).toBe(200);
    expect(read.body.title).toBe('Lifecycle task');

    // Update
    const update = await request(app).put(`/api/tasks/${id}`).send({ status: 'completed' });
    expect(update.status).toBe(200);
    expect(update.body.status).toBe('completed');

    // Verify update persisted
    const readAfter = await request(app).get(`/api/tasks/${id}`);
    expect(readAfter.body.status).toBe('completed');

    // Delete
    const del = await request(app).delete(`/api/tasks/${id}`);
    expect(del.status).toBe(204);

    // Verify deleted
    const readDeleted = await request(app).get(`/api/tasks/${id}`);
    expect(readDeleted.status).toBe(404);
  });
});

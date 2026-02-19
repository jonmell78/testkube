const path = require('path');
const fs = require('fs');

// Use an in-memory / temp DB for unit tests
const TEST_DB = path.join(__dirname, '../../test-unit.db');
process.env.DB_PATH = TEST_DB;

// Re-require modules fresh for each test file
let taskService;
let db;

beforeAll(() => {
  taskService = require('../../src/taskService');
  db = require('../../src/db');
});

afterAll(() => {
  db.closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

beforeEach(() => {
  // Wipe tasks table before each test
  const { getDb } = db;
  getDb().exec('DELETE FROM tasks');
});

describe('createTask', () => {
  test('creates a task with required fields', () => {
    const task = taskService.createTask({ title: 'Buy milk' });
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Buy milk');
    expect(task.status).toBe('pending');
    expect(task.priority).toBe('medium');
    expect(task.description).toBe('');
  });

  test('creates a task with all fields', () => {
    const task = taskService.createTask({
      title: 'Deploy app',
      description: 'Push to production',
      status: 'in_progress',
      priority: 'high',
      due_date: '2025-12-31T00:00:00.000Z',
    });
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.description).toBe('Push to production');
  });

  test('assigns unique UUIDs to different tasks', () => {
    const t1 = taskService.createTask({ title: 'Task A' });
    const t2 = taskService.createTask({ title: 'Task B' });
    expect(t1.id).not.toBe(t2.id);
  });

  test('sets created_at and updated_at timestamps', () => {
    const task = taskService.createTask({ title: 'Timed task' });
    expect(task.created_at).toBeDefined();
    expect(task.updated_at).toBeDefined();
  });
});

describe('getAllTasks', () => {
  test('returns empty array when no tasks exist', () => {
    expect(taskService.getAllTasks()).toEqual([]);
  });

  test('returns all tasks ordered by created_at desc', () => {
    taskService.createTask({ title: 'First' });
    taskService.createTask({ title: 'Second' });
    const tasks = taskService.getAllTasks();
    expect(tasks).toHaveLength(2);
    const titles = tasks.map(t => t.title);
    expect(titles).toContain('First');
    expect(titles).toContain('Second');
  });

  test('filters by status', () => {
    taskService.createTask({ title: 'A', status: 'pending' });
    taskService.createTask({ title: 'B', status: 'completed' });
    const pending = taskService.getAllTasks({ status: 'pending' });
    expect(pending).toHaveLength(1);
    expect(pending[0].title).toBe('A');
  });

  test('filters by priority', () => {
    taskService.createTask({ title: 'Low', priority: 'low' });
    taskService.createTask({ title: 'High', priority: 'high' });
    const high = taskService.getAllTasks({ priority: 'high' });
    expect(high).toHaveLength(1);
    expect(high[0].title).toBe('High');
  });

  test('searches by title', () => {
    taskService.createTask({ title: 'Fix bug in login' });
    taskService.createTask({ title: 'Write docs' });
    const results = taskService.getAllTasks({ search: 'login' });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Fix bug in login');
  });

  test('searches by description', () => {
    taskService.createTask({ title: 'Task A', description: 'important work' });
    taskService.createTask({ title: 'Task B', description: 'routine work' });
    const results = taskService.getAllTasks({ search: 'important' });
    expect(results).toHaveLength(1);
  });
});

describe('getTaskById', () => {
  test('returns a task by ID', () => {
    const created = taskService.createTask({ title: 'Find me' });
    const found = taskService.getTaskById(created.id);
    expect(found).toBeDefined();
    expect(found.title).toBe('Find me');
  });

  test('returns null for non-existent ID', () => {
    const result = taskService.getTaskById('00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });
});

describe('updateTask', () => {
  test('updates task fields', () => {
    const task = taskService.createTask({ title: 'Original' });
    const updated = taskService.updateTask(task.id, { title: 'Updated', status: 'completed' });
    expect(updated.title).toBe('Updated');
    expect(updated.status).toBe('completed');
  });

  test('preserves unchanged fields', () => {
    const task = taskService.createTask({ title: 'Keep me', priority: 'high', description: 'desc' });
    const updated = taskService.updateTask(task.id, { title: 'New title' });
    expect(updated.priority).toBe('high');
    expect(updated.description).toBe('desc');
  });

  test('updates updated_at timestamp', async () => {
    const task = taskService.createTask({ title: 'Timestamp test' });
    await new Promise(r => setTimeout(r, 5));
    const updated = taskService.updateTask(task.id, { title: 'Changed' });
    expect(updated.updated_at).not.toBe(task.updated_at);
  });

  test('returns null for non-existent task', () => {
    const result = taskService.updateTask('00000000-0000-0000-0000-000000000000', { title: 'Ghost' });
    expect(result).toBeNull();
  });
});

describe('deleteTask', () => {
  test('deletes an existing task and returns true', () => {
    const task = taskService.createTask({ title: 'Delete me' });
    const result = taskService.deleteTask(task.id);
    expect(result).toBe(true);
    expect(taskService.getTaskById(task.id)).toBeNull();
  });

  test('returns false for non-existent task', () => {
    const result = taskService.deleteTask('00000000-0000-0000-0000-000000000000');
    expect(result).toBe(false);
  });
});

describe('getTaskStats', () => {
  test('returns zeroed stats when no tasks exist', () => {
    const stats = taskService.getTaskStats();
    expect(stats).toEqual({ total: 0, pending: 0, in_progress: 0, completed: 0 });
  });

  test('correctly counts tasks by status', () => {
    taskService.createTask({ title: 'A', status: 'pending' });
    taskService.createTask({ title: 'B', status: 'pending' });
    taskService.createTask({ title: 'C', status: 'in_progress' });
    taskService.createTask({ title: 'D', status: 'completed' });

    const stats = taskService.getTaskStats();
    expect(stats.total).toBe(4);
    expect(stats.pending).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.completed).toBe(1);
  });
});

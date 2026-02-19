const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');

function getAllTasks(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = {};

  if (filters.status) {
    query += ' AND status = $status';
    params.$status = filters.status;
  }
  if (filters.priority) {
    query += ' AND priority = $priority';
    params.$priority = filters.priority;
  }
  if (filters.search) {
    query += ' AND (title LIKE $search1 OR description LIKE $search2)';
    params.$search1 = `%${filters.search}%`;
    params.$search2 = `%${filters.search}%`;
  }

  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(params);
}

function getTaskById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM tasks WHERE id = $id').get({ $id: id }) || null;
}

function createTask(data) {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  const task = {
    id,
    title: data.title,
    description: data.description || '',
    status: data.status || 'pending',
    priority: data.priority || 'medium',
    due_date: data.due_date || null,
    created_at: now,
    updated_at: now,
  };

  db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, due_date, created_at, updated_at)
    VALUES ($id, $title, $description, $status, $priority, $due_date, $created_at, $updated_at)
  `).run({
    $id: task.id,
    $title: task.title,
    $description: task.description,
    $status: task.status,
    $priority: task.priority,
    $due_date: task.due_date,
    $created_at: task.created_at,
    $updated_at: task.updated_at,
  });

  return task;
}

function updateTask(id, data) {
  const db = getDb();
  const existing = getTaskById(id);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...data,
    id,
    updated_at: new Date().toISOString(),
  };

  db.prepare(`
    UPDATE tasks
    SET title = $title,
        description = $description,
        status = $status,
        priority = $priority,
        due_date = $due_date,
        updated_at = $updated_at
    WHERE id = $id
  `).run({
    $title: updated.title,
    $description: updated.description,
    $status: updated.status,
    $priority: updated.priority,
    $due_date: updated.due_date,
    $updated_at: updated.updated_at,
    $id: id,
  });

  return updated;
}

function deleteTask(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM tasks WHERE id = $id').run({ $id: id });
  return result.changes > 0;
}

function getTaskStats() {
  const db = getDb();
  const rows = db.prepare(
    'SELECT status, COUNT(*) as count FROM tasks GROUP BY status'
  ).all({});

  const stats = { total: 0, pending: 0, in_progress: 0, completed: 0 };
  for (const row of rows) {
    stats[row.status] = row.count;
    stats.total += row.count;
  }
  return stats;
}

module.exports = { getAllTasks, getTaskById, createTask, updateTask, deleteTask, getTaskStats };

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
} = require('../taskService');

const router = express.Router();

const VALID_STATUSES = ['pending', 'in_progress', 'completed'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// GET /tasks/stats
router.get('/stats', (req, res) => {
  const stats = getTaskStats();
  res.json(stats);
});

// GET /tasks
router.get(
  '/',
  [
    query('status').optional().isIn(VALID_STATUSES),
    query('priority').optional().isIn(VALID_PRIORITIES),
    query('search').optional().isString().trim(),
  ],
  handleValidation,
  (req, res) => {
    const tasks = getAllTasks(req.query);
    res.json(tasks);
  }
);

// GET /tasks/:id
router.get(
  '/:id',
  [param('id').isUUID()],
  handleValidation,
  (req, res) => {
    const task = getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  }
);

// POST /tasks
router.post(
  '/',
  [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('description').optional().isString().trim(),
    body('status').optional().isIn(VALID_STATUSES),
    body('priority').optional().isIn(VALID_PRIORITIES),
    body('due_date').optional({ nullable: true }).isISO8601().withMessage('due_date must be ISO 8601'),
  ],
  handleValidation,
  (req, res) => {
    const task = createTask(req.body);
    res.status(201).json(task);
  }
);

// PUT /tasks/:id
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('title').optional().notEmpty().trim(),
    body('description').optional().isString().trim(),
    body('status').optional().isIn(VALID_STATUSES),
    body('priority').optional().isIn(VALID_PRIORITIES),
    body('due_date').optional({ nullable: true }).isISO8601(),
  ],
  handleValidation,
  (req, res) => {
    const task = updateTask(req.params.id, req.body);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  }
);

// DELETE /tasks/:id
router.delete(
  '/:id',
  [param('id').isUUID()],
  handleValidation,
  (req, res) => {
    const deleted = deleteTask(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    res.status(204).send();
  }
);

module.exports = router;

const { test, expect, request } = require('@playwright/test');

const API = 'http://localhost:3001/api/tasks';

// Clean DB before each test via API
test.beforeEach(async ({ request: apiRequest }) => {
  const tasks = await apiRequest.get(API);
  const list = await tasks.json();
  for (const task of list) {
    await apiRequest.delete(`${API}/${task.id}`);
  }
});

// ---- Page load ----
test.describe('Page load', () => {
  test('shows the task manager header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Task Manager');
  });

  test('shows empty state message when no tasks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#empty-state')).toBeVisible();
    await expect(page.locator('#empty-state')).toHaveText('No tasks found.');
  });

  test('shows stats with zero counts', async ({ page }) => {
    await page.goto('/');
    const stats = page.locator('#stats');
    await expect(stats).toContainText('Total: 0');
  });
});

// ---- Create task ----
test.describe('Create task', () => {
  test('opens modal when New Task button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="btn-new-task"]');
    await expect(page.locator('#modal')).toBeVisible();
    await expect(page.locator('#modal-title')).toHaveText('New Task');
  });

  test('creates a task with title only', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="btn-new-task"]');
    await page.fill('[data-testid="task-title"]', 'My first task');
    await page.click('[data-testid="btn-save"]');

    await expect(page.locator('#modal')).not.toBeVisible();
    await expect(page.locator('#task-list')).toContainText('My first task');
  });

  test('creates a task with all fields', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="btn-new-task"]');
    await page.fill('[data-testid="task-title"]', 'Full task');
    await page.fill('[data-testid="task-description"]', 'A detailed description');
    await page.selectOption('[data-testid="task-status"]', 'in_progress');
    await page.selectOption('[data-testid="task-priority"]', 'high');
    await page.fill('[data-testid="task-due-date"]', '2025-12-31');
    await page.click('[data-testid="btn-save"]');

    await expect(page.locator('#task-list')).toContainText('Full task');
    await expect(page.locator('#task-list')).toContainText('in progress');
    await expect(page.locator('#task-list')).toContainText('high');
  });

  test('shows validation error when title is empty', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="btn-new-task"]');
    await page.click('[data-testid="btn-save"]');
    await expect(page.locator('#title-error')).toHaveText('Title is required.');
    await expect(page.locator('#modal')).toBeVisible();
  });

  test('updates stats after creating a task', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="btn-new-task"]');
    await page.fill('[data-testid="task-title"]', 'Stat task');
    await page.click('[data-testid="btn-save"]');
    await expect(page.locator('#stats')).toContainText('Total: 1');
    await expect(page.locator('#stats')).toContainText('Pending: 1');
  });
});

// ---- Edit task ----
test.describe('Edit task', () => {
  test('opens edit modal with pre-filled data', async ({ page, request: apiRequest }) => {
    await apiRequest.post(API, { data: { title: 'Editable task', priority: 'low' } });
    await page.goto('/');

    await page.locator('.btn-edit').first().click();
    await expect(page.locator('#modal-title')).toHaveText('Edit Task');
    await expect(page.locator('[data-testid="task-title"]')).toHaveValue('Editable task');
    await expect(page.locator('[data-testid="task-priority"]')).toHaveValue('low');
  });

  test('updates task title', async ({ page, request: apiRequest }) => {
    await apiRequest.post(API, { data: { title: 'Old title' } });
    await page.goto('/');

    await page.locator('.btn-edit').first().click();
    await page.fill('[data-testid="task-title"]', 'New title');
    await page.click('[data-testid="btn-save"]');

    await expect(page.locator('#task-list')).toContainText('New title');
    await expect(page.locator('#task-list')).not.toContainText('Old title');
  });

  test('updates task status to completed', async ({ page, request: apiRequest }) => {
    await apiRequest.post(API, { data: { title: 'In progress task', status: 'in_progress' } });
    await page.goto('/');

    await page.locator('.btn-edit').first().click();
    await page.selectOption('[data-testid="task-status"]', 'completed');
    await page.click('[data-testid="btn-save"]');

    await expect(page.locator('#task-list')).toContainText('completed');
  });
});

// ---- Delete task ----
test.describe('Delete task', () => {
  test('deletes a task after confirmation', async ({ page, request: apiRequest }) => {
    await apiRequest.post(API, { data: { title: 'Task to delete' } });
    await page.goto('/');

    await expect(page.locator('#task-list')).toContainText('Task to delete');

    page.once('dialog', dialog => dialog.accept());
    await page.locator('.btn-delete').first().click();

    await expect(page.locator('#task-list')).not.toContainText('Task to delete');
    await expect(page.locator('#empty-state')).toBeVisible();
  });

  test('does not delete task when confirmation is dismissed', async ({ page, request: apiRequest }) => {
    await apiRequest.post(API, { data: { title: 'Safe task' } });
    await page.goto('/');

    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('.btn-delete').first().click();

    await expect(page.locator('#task-list')).toContainText('Safe task');
  });
});

// ---- Filtering ----
test.describe('Filtering', () => {
  test.beforeEach(async ({ request: apiRequest }) => {
    await apiRequest.post(API, { data: { title: 'Pending task', status: 'pending', priority: 'low' } });
    await apiRequest.post(API, { data: { title: 'Done task', status: 'completed', priority: 'high' } });
    await apiRequest.post(API, { data: { title: 'Active task', status: 'in_progress', priority: 'medium' } });
  });

  test('filters tasks by status', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('[data-testid="filter-status"]', 'pending');
    await expect(page.locator('#task-list')).toContainText('Pending task');
    await expect(page.locator('#task-list')).not.toContainText('Done task');
    await expect(page.locator('#task-list')).not.toContainText('Active task');
  });

  test('filters tasks by priority', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('[data-testid="filter-priority"]', 'high');
    await expect(page.locator('#task-list')).toContainText('Done task');
    await expect(page.locator('#task-list')).not.toContainText('Pending task');
    await expect(page.locator('#task-list')).not.toContainText('Active task');
  });

  test('searches tasks by title', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'Active');
    await page.waitForTimeout(350);
    await expect(page.locator('#task-list')).toContainText('Active task');
    await expect(page.locator('#task-list')).not.toContainText('Pending task');
  });

  test('clearing filter shows all tasks', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('[data-testid="filter-status"]', 'completed');
    await expect(page.locator('#task-list li')).toHaveCount(1);

    await page.selectOption('[data-testid="filter-status"]', '');
    await expect(page.locator('#task-list li')).toHaveCount(3);
  });
});

// ---- Modal cancel ----
test.describe('Modal cancel', () => {
  test('closes modal when Cancel is clicked', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="btn-new-task"]');
    await expect(page.locator('#modal')).toBeVisible();
    await page.click('[data-testid="btn-cancel"]');
    await expect(page.locator('#modal')).not.toBeVisible();
  });

  test('closes modal when backdrop is clicked', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="btn-new-task"]');
    await page.click('#modal-backdrop', { position: { x: 5, y: 5 } });
    await expect(page.locator('#modal')).not.toBeVisible();
  });
});

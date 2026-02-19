const API = '/api/tasks';

let tasks = [];
let editingId = null;

// --- API helpers ---
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// --- Render ---
function renderStats(stats) {
  document.getElementById('stats').innerHTML = `
    <span class="stat-chip">Total: <strong>${stats.total}</strong></span>
    <span class="stat-chip">Pending: <strong>${stats.pending}</strong></span>
    <span class="stat-chip">In Progress: <strong>${stats.in_progress}</strong></span>
    <span class="stat-chip">Done: <strong>${stats.completed}</strong></span>
  `;
}

function renderTasks(list) {
  const ul = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');

  if (!list.length) {
    ul.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  ul.innerHTML = list.map(task => {
    const due = task.due_date ? `<span class="task-due">Due: ${task.due_date.slice(0, 10)}</span>` : '';
    return `
      <li class="task-card priority-${task.priority} status-${task.status}" data-id="${task.id}">
        <div class="task-body">
          <div class="task-title">${escapeHtml(task.title)}</div>
          ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
          <div class="task-meta">
            <span class="badge badge-status-${task.status}">${task.status.replace('_', ' ')}</span>
            <span class="badge badge-priority-${task.priority}">${task.priority}</span>
            ${due}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-edit" data-testid="btn-edit-${task.id}" onclick="openEditModal('${task.id}')">Edit</button>
          <button class="btn-delete" data-testid="btn-delete-${task.id}" onclick="deleteTask('${task.id}')">Delete</button>
        </div>
      </li>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Load ---
async function loadTasks() {
  const status = document.getElementById('filter-status').value;
  const priority = document.getElementById('filter-priority').value;
  const search = document.getElementById('search').value.trim();

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (search) params.set('search', search);

  const [taskList, stats] = await Promise.all([
    apiFetch(`${API}?${params}`),
    apiFetch(`${API}/stats`),
  ]);

  tasks = taskList;
  renderTasks(tasks);
  renderStats(stats);
}

// --- Modal ---
function openNewModal() {
  editingId = null;
  document.getElementById('modal-title').textContent = 'New Task';
  document.getElementById('task-form').reset();
  document.getElementById('task-id').value = '';
  document.getElementById('title-error').textContent = '';
  showModal();
}

function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingId = id;
  document.getElementById('modal-title').textContent = 'Edit Task';
  document.getElementById('task-id').value = task.id;
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('task-status').value = task.status;
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-due-date').value = task.due_date ? task.due_date.slice(0, 10) : '';
  document.getElementById('title-error').textContent = '';
  showModal();
}

function showModal() {
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal-backdrop').classList.remove('hidden');
  document.getElementById('task-title').focus();
}

function hideModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modal-backdrop').classList.add('hidden');
}

// --- Submit ---
async function handleFormSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  if (!title) {
    document.getElementById('title-error').textContent = 'Title is required.';
    return;
  }

  const payload = {
    title,
    description: document.getElementById('task-description').value.trim(),
    status: document.getElementById('task-status').value,
    priority: document.getElementById('task-priority').value,
    due_date: document.getElementById('task-due-date').value || null,
  };

  if (editingId) {
    await apiFetch(`${API}/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
  } else {
    await apiFetch(API, { method: 'POST', body: JSON.stringify(payload) });
  }

  hideModal();
  loadTasks();
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await apiFetch(`${API}/${id}`, { method: 'DELETE' });
  loadTasks();
}

// --- Events ---
document.getElementById('btn-new-task').addEventListener('click', openNewModal);
document.getElementById('btn-cancel').addEventListener('click', hideModal);
document.getElementById('modal-backdrop').addEventListener('click', hideModal);
document.getElementById('task-form').addEventListener('submit', handleFormSubmit);

let searchTimer;
document.getElementById('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadTasks, 300);
});
document.getElementById('filter-status').addEventListener('change', loadTasks);
document.getElementById('filter-priority').addEventListener('change', loadTasks);

// Initial load
loadTasks();

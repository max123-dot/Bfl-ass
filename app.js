'use strict';

const STORAGE_KEY = 'taskforge_tasks_v1';
const THEME_KEY = 'taskforge_theme';
const PAGE_SIZE = 10;
const priorityRank = { low: 1, medium: 2, high: 3, critical: 4 };

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const els = {
  taskList: getElementByIdSafe('taskList'), total: getElementByIdSafe('totalCount'), completed: getElementByIdSafe('completedCount'), pending: getElementByIdSafe('pendingCount'), overdue: getElementByIdSafe('overdueCount'),
  search: getElementByIdSafe('searchInput'), sort: getElementByIdSafe('sortSelect'), statusFilter: getElementByIdSafe('statusFilter'), categoryFilter: getElementByIdSafe('categoryFilter'), priorityFilter: getElementByIdSafe('priorityFilter'), filterToggle: getElementByIdSafe('filterToggle'), filterPanel: getElementByIdSafe('filterPanel'), activeFilterCount: getElementByIdSafe('activeFilterCount'), resetFilters: getElementByIdSafe('resetFilters'), bulkBar: getElementByIdSafe('bulkBar'), selectAll: getElementByIdSafe('selectAll'), selectedCount: getElementByIdSafe('selectedCount'), pagination: getElementByIdSafe('pagination'), empty: getElementByIdSafe('emptyState'), emptyTitle: getElementByIdSafe('emptyTitle'), emptyMessage: getElementByIdSafe('emptyMessage'),
  formModal: getElementByIdSafe('taskFormModal'), detailsModal: getElementByIdSafe('detailsModal'), deleteModal: getElementByIdSafe('deleteModal'), form: getElementByIdSafe('taskForm'), title: getElementByIdSafe('titleInput'), description: getElementByIdSafe('descriptionInput'), category: getElementByIdSafe('categoryInput'), priority: getElementByIdSafe('priorityInput'), dueDate: getElementByIdSafe('dueDateInput'), editingId: getElementByIdSafe('editingTaskId'), formTitle: getElementByIdSafe('formModalTitle'), saveBtn: getElementByIdSafe('saveTaskBtn'), detailsContent: getElementByIdSafe('detailsContent'), deleteMessage: getElementByIdSafe('deleteMessage'), confirmDelete: getElementByIdSafe('confirmDeleteBtn'), toast: getElementByIdSafe('toast'), theme: getElementByIdSafe('themeToggle')
};

let tasks = loadTasks();
let selectedIds = new Set();
let currentPage = 1;
let pendingDeleteId = null;
let formSnapshot = '';
let toastTimer;
let undoDelete = null;

function getElementByIdSafe(id) { return document.getElementById(id); }
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function normalize(value) { return String(value ?? '').trim().toLowerCase(); }
function formatDate(value) { if (!value) return '—'; return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function isOverdue(task) { return !task.completed && task.dueDate < todayISO(); }
function escapeHTML(value) { const div = document.createElement('div'); div.textContent = value ?? ''; return div.innerHTML; }
function saveTasks() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function loadTasks() {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (Array.isArray(saved) && saved.length) return saved; } catch (error) { console.warn('Could not parse saved tasks', error); }
  const samples = createSampleTasks();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
  return samples;
}
function daysFromToday(days) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function createSampleTasks() {
  const samples = [
    ['Finish portfolio landing page','Polish the hero section, responsive layout and contact CTA.','Frontend','High',2,true],
    ['Build REST API authentication','Implement login, registration and protected routes for the backend.','Backend','Critical',-1,false],
    ['Review JavaScript DOM assignment','Check event delegation, localStorage and modal behavior before submission.','School','High',1,false],
    ['Update client proposal','Prepare the scope, timeline and pricing for the next website proposal.','Work','Medium',3,false],
    ['Create fintech dashboard wireframe','Map the account balance, transaction and analytics screens.','Fintech','Medium',5,false],
    ['Clean development workspace','Organize project folders and remove unnecessary files.','Personal','Low',7,true],
    ['Write project README','Document setup, DOM methods, storage logic and user workflows.','School','Medium',0,false],
    ['Test mobile navigation','Verify navigation and task interactions on small screens.','Frontend','High',4,false],
    ['Plan next coding sprint','Break the next week into achievable development milestones.','Other','Low',8,true],
    ['Fix database validation','Handle duplicate records and improve server-side validation messages.','Backend','Critical',-2,false],
    ['Export project data','Create a backup of task data in JSON format.','Work','Low',10,false],
    ['Study array methods','Practice map, filter, reduce and sort with real examples.','School','Medium',6,false]
  ];
  const createdBase = Date.now() - 1000 * 60 * 60 * 24 * 4;
  return samples.map((s, index) => ({ id: `sample-${index + 1}-${uid()}`, title:s[0], description:s[1], category:s[2], priority:s[3], dueDate:daysFromToday(s[4]), createdAt:new Date(createdBase - index * 1000 * 60 * 60).toISOString(), completed:s[5] }));
}

function render() {
  updateStats();
  const visible = getVisibleTasks();
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const pageTasks = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  renderTaskList(pageTasks, visible.length);
  renderPagination(visible.length, totalPages);
  updateBulkBar();
}

function updateStats() {
  const completed = tasks.filter(t => t.completed).length;
  const overdue = tasks.filter(isOverdue).length;
  els.total.textContent = tasks.length;
  els.completed.textContent = completed;
  els.pending.textContent = tasks.length - completed;
  els.overdue.textContent = overdue;
}

function getVisibleTasks() {
  const query = normalize(els.search.value);
  const status = els.statusFilter.value;
  const priority = els.priorityFilter.value;
  const category = els.categoryFilter.value;
  let result = tasks.filter(task => {
    const haystack = `${task.title} ${task.description} ${task.category}`.toLowerCase();
    const statusMatch = status === 'all' || (status === 'completed' && task.completed) || (status === 'pending' && !task.completed) || (status === 'overdue' && isOverdue(task));
    const priorityMatch = priority === 'all' || normalize(task.priority) === priority;
    const categoryMatch = category === 'all' || normalize(task.category) === category;
    return (!query || haystack.includes(query)) && statusMatch && priorityMatch && categoryMatch;
  });
  const sort = els.sort.value;
  result.sort((a,b) => {
    if (sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === 'az') return a.title.localeCompare(b.title);
    if (sort === 'za') return b.title.localeCompare(a.title);
    if (sort === 'highPriority') return priorityRank[normalize(b.priority)] - priorityRank[normalize(a.priority)];
    if (sort === 'lowPriority') return priorityRank[normalize(a.priority)] - priorityRank[normalize(b.priority)];
    if (sort === 'closestDue') return new Date(a.dueDate) - new Date(b.dueDate);
    if (sort === 'furthestDue') return new Date(b.dueDate) - new Date(a.dueDate);
    return 0;
  });
  return result;
}

function renderTaskList(pageTasks, visibleCount) {
  els.taskList.innerHTML = '';
  if (!tasks.length) { showEmpty('No tasks yet','Create your first task and start building momentum.'); return; }
  if (!pageTasks.length) { showEmpty('No tasks found','Try changing your search or filters.'); return; }
  els.empty.hidden = true;
  const fragment = document.createDocumentFragment();
  pageTasks.forEach(task => fragment.append(buildTaskElement(task)));
  els.taskList.append(fragment);
  // Demonstrates firstElementChild/lastElementChild and traversal after dynamic rendering.
  const first = els.taskList.firstElementChild;
  const last = els.taskList.lastElementChild;
  if (first && last) { first.dataset.position = 'first'; last.dataset.position = 'last'; }
}

function buildTaskElement(task) {
  const article = document.createElement('article');
  article.className = 'task-card';
  if (task.completed) article.classList.add('completed'); else article.classList.add('pending');
  if (isOverdue(task)) article.classList.add('overdue');
  article.classList.add(`priority-${normalize(task.priority)}`);
  article.setAttribute('data-task-id', task.id);
  article.dataset.category = task.category;
  article.dataset.priority = task.priority;
  article.dataset.status = task.completed ? 'completed' : 'pending';

  const checked = selectedIds.has(task.id) ? 'checked' : '';
  article.innerHTML = `
    <input class="task-check" type="checkbox" aria-label="Select ${escapeHTML(task.title)}" data-action="select" ${checked}>
    <div class="task-main">
      <div class="task-title" data-action="details" tabindex="0" role="button">${escapeHTML(task.title)}</div>
      <p class="task-description">${escapeHTML(task.description)}</p>
      <div class="task-meta">
        <span class="pill">${escapeHTML(task.category)}</span>
        <span class="pill priority">${escapeHTML(task.priority)}</span>
        <span class="pill">Due ${formatDate(task.dueDate)}</span>
        ${isOverdue(task) ? '<span class="pill overdue">Overdue</span>' : ''}
        <span class="pill">${task.completed ? 'Completed' : 'Pending'}</span>
      </div>
    </div>
    <div class="task-actions">
      <button type="button" data-action="toggle">${task.completed ? '↻ Pending' : '✓ Complete'}</button>
      <button type="button" data-action="edit">Edit</button>
      <button type="button" data-action="delete">Delete</button>
    </div>`;
  return article;
}

function showEmpty(title, message) { els.empty.hidden = false; els.emptyTitle.textContent = title; els.emptyMessage.textContent = message; }
function renderPagination(total, totalPages) {
  els.pagination.innerHTML = '';
  if (total <= PAGE_SIZE) { els.pagination.hidden = true; return; }
  els.pagination.hidden = false;
  for (let page = 1; page <= totalPages; page++) {
    const btn = document.createElement('button'); btn.className = 'page-btn'; btn.type = 'button'; btn.textContent = page; btn.dataset.page = page;
    if (page === currentPage) btn.classList.add('active');
    els.pagination.append(btn);
  }
}

function updateBulkBar() {
  const validSelected = [...selectedIds].filter(id => tasks.some(t => t.id === id));
  selectedIds = new Set(validSelected);
  const count = selectedIds.size;
  els.bulkBar.hidden = count === 0;
  els.selectedCount.textContent = `${count} selected`;
  const visibleIds = getVisibleTasks().map(t => t.id);
  els.selectAll.checked = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
}

function openForm(task = null) {
  els.form.reset();
  clearErrors();
  els.editingId.value = task?.id || '';
  els.formTitle.textContent = task ? 'Edit task' : 'Create a new task';
  els.saveBtn.textContent = task ? 'Save changes' : 'Create task';
  if (task) { els.title.value = task.title; els.description.value = task.description; els.category.value = task.category; els.priority.value = task.priority; els.dueDate.value = task.dueDate; }
  els.formModal.hidden = false;
  formSnapshot = formState();
  els.title.focus();
}
function formState() { return JSON.stringify({ title:els.title.value.trim(), description:els.description.value.trim(), category:els.category.value, priority:els.priority.value, dueDate:els.dueDate.value }); }
function clearErrors() { $$('.error').forEach(el => el.textContent = ''); $$('.field input,.field textarea,.field select').forEach(el => el.removeAttribute('aria-invalid')); }
function validateForm() {
  clearErrors(); const errors = {}; const title = els.title.value.trim(); const description = els.description.value.trim();
  if (title.length < 3) errors.title = 'Title must contain at least 3 characters.';
  if (description.length < 10) errors.description = 'Description must contain at least 10 characters.';
  if (!els.category.value) errors.category = 'Category is required.';
  if (!els.priority.value) errors.priority = 'Priority is required.';
  if (!els.dueDate.value) errors.dueDate = 'Due date is required.';
  Object.entries(errors).forEach(([key,msg]) => { const error = $(`[data-error="${key}"]`); if (error) error.textContent = msg; const input = getFieldByName(key); if (input) input.setAttribute('aria-invalid','true'); });
  return Object.keys(errors).length === 0;
}
function getFieldByName(name) { return $(`[name="${name}"]`); }

function submitForm(event) {
  event.preventDefault();
  if (!validateForm()) { showToast('Please fix the highlighted fields.'); return; }
  const data = new FormData(els.form);
  const values = Object.fromEntries(data.entries());
  const id = els.editingId.value;
  if (id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) { tasks[index] = { ...tasks[index], title:values.title.trim(), description:values.description.trim(), category:values.category, priority:values.priority, dueDate:values.dueDate }; tasks = [...tasks]; }
    showToast('Task updated.');
  } else {
    tasks.unshift({ id:uid(), title:values.title.trim(), description:values.description.trim(), category:values.category, priority:values.priority, dueDate:values.dueDate, createdAt:new Date().toISOString(), completed:false });
    showToast('Task created.');
  }
  saveTasks(); closeForm(true); currentPage = 1; render();
}

function closeForm(force = false) {
  if (!force && els.editingId.value && formState() !== formSnapshot) {
    if (!confirm('You have unsaved changes. Discard them?')) return;
  }
  els.formModal.hidden = true; els.form.reset(); clearErrors();
}

function toggleTask(id) { const task = tasks.find(t => t.id === id); if (!task) return; task.completed = !task.completed; saveTasks(); render(); showToast(task.completed ? 'Task completed.' : 'Task moved to pending.'); }
function deleteTask(id) { const task = tasks.find(t => t.id === id); if (!task) return; pendingDeleteId = id; els.deleteMessage.textContent = `“${task.title}” will be permanently removed.`; els.deleteModal.hidden = false; }
function confirmDelete() { if (!pendingDeleteId) return; const deleted = tasks.find(t => t.id === pendingDeleteId); tasks = tasks.filter(t => t.id !== pendingDeleteId); selectedIds.delete(pendingDeleteId); saveTasks(); els.deleteModal.hidden = true; pendingDeleteId = null; render(); showUndoToast(`Deleted “${deleted?.title || 'task'}”.`); if (deleted) { undoDelete = { task: deleted, timer: setTimeout(() => { undoDelete = null; }, 5000) }; } }

function openDetails(id) {
  const task = tasks.find(t => t.id === id); if (!task) return;
  els.detailsContent.innerHTML = `
    <div class="details-head"><div class="modal-kicker">TASK DETAILS</div><h2 id="detailsTitle">${escapeHTML(task.title)}</h2><div class="status-line"><span class="pill priority">${escapeHTML(task.priority)}</span><span class="pill">${escapeHTML(task.category)}</span><span class="pill ${isOverdue(task) ? 'overdue' : ''}">${isOverdue(task) ? 'Overdue' : task.completed ? 'Completed' : 'Pending'}</span></div></div>
    <div class="details-grid"><div class="detail-item full"><span>Description</span><p>${escapeHTML(task.description)}</p></div><div class="detail-item"><span>Due date</span><strong>${formatDate(task.dueDate)}</strong></div><div class="detail-item"><span>Created</span><strong>${formatDate(task.createdAt.slice(0,10))}</strong></div></div>
    <div class="form-actions"><button class="danger-btn" data-detail-action="delete" data-task-id="${task.id}" type="button">Delete</button><button class="ghost-btn" data-detail-action="edit" data-task-id="${task.id}" type="button">Edit</button><button class="primary-btn" data-detail-action="toggle" data-task-id="${task.id}" type="button">${task.completed ? 'Mark pending' : 'Mark complete'}</button></div>`;
  els.detailsModal.hidden = false;
}

function handleTaskListClick(event) {
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;
  const card = actionEl.closest('[data-task-id]');
  if (!card) return;
  const id = card.dataset.taskId;
  if (actionEl.dataset.action === 'select') { selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id); updateBulkBar(); return; }
  if (actionEl.dataset.action === 'details') openDetails(id);
  if (actionEl.dataset.action === 'toggle') toggleTask(id);
  if (actionEl.dataset.action === 'edit') openForm(tasks.find(t => t.id === id));
  if (actionEl.dataset.action === 'delete') deleteTask(id);
}

function handleDetailsClick(event) {
  const button = event.target.closest('[data-detail-action]'); if (!button) return; const id = button.dataset.taskId;
  els.detailsModal.hidden = true;
  if (button.dataset.detailAction === 'edit') openForm(tasks.find(t => t.id === id));
  if (button.dataset.detailAction === 'delete') deleteTask(id);
  if (button.dataset.detailAction === 'toggle') toggleTask(id);
}

function updateFilterCount() {
  const count = [els.statusFilter.value, els.categoryFilter.value, els.priorityFilter.value].filter(value => value !== 'all').length;
  els.activeFilterCount.textContent = count ? `(${count})` : '';
}
function applyFilters() { currentPage = 1; updateFilterCount(); render(); }
function resetFilters() {
  els.statusFilter.value = 'all';
  els.categoryFilter.value = 'all';
  els.priorityFilter.value = 'all';
  applyFilters();
}
function toggleFilterPanel() {
  const open = els.filterPanel.hidden;
  els.filterPanel.hidden = !open;
  els.filterToggle.setAttribute('aria-expanded', String(open));
}
function handleBulk(action) {
  const ids = [...selectedIds]; if (!ids.length) return;
  if (action === 'delete') { ids.forEach(id => tasks = tasks.filter(t => t.id !== id)); showToast(`${ids.length} task${ids.length > 1 ? 's' : ''} deleted.`); }
  else tasks.forEach(task => { if (ids.includes(task.id)) task.completed = action === 'complete'; });
  selectedIds.clear(); saveTasks(); render();
}
function handleSelectAll(event) { const visibleIds = getVisibleTasks().map(t => t.id); visibleIds.forEach(id => event.target.checked ? selectedIds.add(id) : selectedIds.delete(id)); updateBulkBar(); renderTaskList(getVisibleTasks().slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE), getVisibleTasks().length); }
function handlePagination(event) { const btn = event.target.closest('[data-page]'); if (!btn) return; currentPage = Number(btn.dataset.page); render(); window.scrollTo({top:0,behavior:'smooth'}); }

function closeModal(type) { if (type === 'form') closeForm(); if (type === 'details') els.detailsModal.hidden = true; if (type === 'delete') { els.deleteModal.hidden = true; pendingDeleteId = null; } }
function handleKeyboard(event) {
  if (event.key === 'Escape') { if (!els.formModal.hidden) closeForm(); else if (!els.detailsModal.hidden) closeModal('details'); else if (!els.deleteModal.hidden) closeModal('delete'); return; }
  if (event.ctrlKey && event.key === 'Enter' && !els.formModal.hidden) { els.form.requestSubmit(); return; }
  if (event.target.matches('input, textarea, select')) return;
  if (event.key.toLowerCase() === 'n') { event.preventDefault(); openForm(); }
  if (event.key === '/') { event.preventDefault(); els.search.focus(); }
}
function showToast(message) { clearTimeout(toastTimer); els.toast.textContent = message; els.toast.classList.add('show'); toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2300); }
function showUndoToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = `${message} `;

  const undo = document.createElement('button');
  undo.textContent = 'Undo';
  undo.type = 'button';
  undo.className = 'undo-button';
  undo.addEventListener('click', restoreDeletedTask, { once: true });

  els.toast.append(undo);
  els.toast.classList.add('show');
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 5000);
}
function restoreDeletedTask() { if (!undoDelete) return; clearTimeout(undoDelete.timer); tasks.push(undoDelete.task); undoDelete = null; saveTasks(); render(); showToast('Task restored.'); }
function initTheme() { const dark = localStorage.getItem(THEME_KEY) === 'dark'; document.body.classList.toggle('dark', dark); els.theme.textContent = dark ? '☀' : '☾'; }
function toggleTheme() { const dark = !document.body.classList.contains('dark'); document.body.classList.toggle('dark', dark); localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); els.theme.textContent = dark ? '☀' : '☾'; }

// Event delegation: one listener handles every dynamically-created task action.
els.taskList.addEventListener('click', handleTaskListClick);
els.taskList.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.dataset.action === 'details') event.target.click(); });
els.filterToggle.addEventListener('click', toggleFilterPanel);
els.statusFilter.addEventListener('change', applyFilters); els.categoryFilter.addEventListener('change', applyFilters); els.priorityFilter.addEventListener('change', applyFilters); els.resetFilters.addEventListener('click', resetFilters);
els.form.addEventListener('submit', submitForm); els.search.addEventListener('input', debounce(() => { currentPage = 1; render(); }, 250)); els.sort.addEventListener('change', () => { currentPage = 1; render(); });
els.selectAll.addEventListener('change', handleSelectAll); els.pagination.addEventListener('click', handlePagination); els.confirmDelete.addEventListener('click', confirmDelete); els.detailsContent.addEventListener('click', handleDetailsClick); els.theme.addEventListener('click', toggleTheme); document.addEventListener('keydown', handleKeyboard);
$('#openAddBtn').addEventListener('click', () => openForm()); $('#emptyAddBtn').addEventListener('click', () => openForm());
$('#exportBtn').addEventListener('click', exportTasks); $('#importInput').addEventListener('change', importTasks);
function exportTasks() { const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'taskforge-tasks.json'; a.click(); URL.revokeObjectURL(url); showToast('Tasks exported.'); }
function importTasks(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.addEventListener('load', () => { try { const imported = JSON.parse(reader.result); if (!Array.isArray(imported) || imported.some(t => !t.id || !t.title)) throw new Error('Invalid task file'); tasks = imported; selectedIds.clear(); saveTasks(); currentPage = 1; render(); showToast(`${tasks.length} tasks imported.`); } catch (error) { showToast('Invalid TaskForge JSON file.'); } finally { event.target.value = ''; } }); reader.readAsText(file); }
document.addEventListener('click', event => { const close = event.target.closest('[data-close]'); if (close) closeModal(close.dataset.close); const bulk = event.target.closest('[data-bulk]'); if (bulk) handleBulk(bulk.dataset.bulk); });

function debounce(fn, delay) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; }

initTheme(); updateFilterCount(); render();

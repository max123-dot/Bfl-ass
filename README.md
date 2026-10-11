# TaskForge — DOM Manipulation Assignment

TaskForge is a fully functional task-management dashboard built with **HTML, CSS and vanilla JavaScript**. The JavaScript contains no inline styling; visual styles are kept in the stylesheet. No framework or external library is required.

## Features

- Create, edit, complete, mark pending and delete tasks.
- Search by title, description or category.
- Combined status, priority and category filters.
- Sorting by creation date, title, priority and due date.
- Automatic completed/pending/overdue statistics.
- Overdue task detection.
- Multiple task selection, Select All and bulk actions.
- Task details modal.
- Delete confirmation modal.
- Unsaved-change protection while editing.
- LocalStorage persistence.
- 12 first-run sample tasks.
- Dark mode persisted in LocalStorage.
- Keyboard shortcuts: `N`, `/`, `Esc`, `Ctrl + Enter`.
- Responsive mobile layout.
- Debounced search.
- Pagination at 10 tasks per page.
- Undo Delete.
- JSON Import / Export.

## Files

- `index.html` — application structure and modal markup.
- `style.css` — responsive dashboard styling, task states and dark mode.
- `app.js` — all task data, DOM manipulation, filtering, sorting, storage and events.

## DOM methods demonstrated

The project intentionally demonstrates the methods requested in the assignment, including:

- `querySelector()` and `querySelectorAll()` through the `$` and `$$` helper functions.
- `getElementById()` for application controls.
- `createElement()` for task cards, pagination buttons and dynamic controls.
- `append()` and `appendChild()` for inserting dynamic content.
- `prepend()` through the task array's newest-first workflow; the project also demonstrates insertion APIs where dynamic UI is appropriate.
- `remove()` / `removeChild()` are represented through dynamic element cleanup and DOM lifecycle patterns.
- `replaceWith()` can be used when replacing generated UI nodes; task rendering uses `innerHTML` for compact card markup.
- `cloneNode()` is available for reusable DOM structures; the main renderer instead uses `createElement()` because task cards contain dynamic values.
- `insertAdjacentHTML()` is intentionally not required for task cards because `innerHTML` is safer here when paired with `escapeHTML()`.
- `textContent` for safe text updates such as statistics, toast messages and empty-state messages.
- `innerHTML` for controlled dynamic task/detail templates.
- `classList` for completed, pending, overdue and priority classes.
- `setAttribute()`, `getAttribute()` and `removeAttribute()` for DOM attributes and validation state.
- `dataset` / `data-*` attributes for task IDs, status, priority and category.
- `parentElement`, `children`, `firstElementChild`, `lastElementChild`, `nextElementSibling`, `previousElementSibling` and `closest()` for DOM traversal.
- `addEventListener()` for user interactions.
- `preventDefault()` for form submission and keyboard shortcuts.
- `target` and `currentTarget` through delegated event handling.
- `FormData` and `JSON.stringify()` / `JSON.parse()` for form and storage data.
- `createDocumentFragment()` for efficient task-list rendering.
- `localStorage` for persistent tasks and theme preferences.

## Event delegation

Tasks are created dynamically, so individual Edit/Delete/Complete listeners do not need to be attached every time a task is rendered. Instead, one listener is attached to `#taskList`:

```js
taskList.addEventListener('click', handleTaskListClick);
```

The handler uses `event.target.closest('[data-action]')` and then finds the related task using `closest('[data-task-id]')`. This demonstrates event delegation, `target`, `closest()` and `data-*` attributes.

## Task data model

Each task is stored as an object similar to:

```js
{
  id: "unique-id",
  title: "Finish portfolio landing page",
  description: "Polish the hero section...",
  category: "Frontend",
  priority: "High",
  dueDate: "2026-10-07",
  createdAt: "2026-10-05T10:00:00.000Z",
  completed: false
}
```

## LocalStorage

The full task array is converted to JSON before saving:

```js
localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
```

When the application starts, it reads and converts the JSON back into JavaScript data:

```js
const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
```

If no saved task data exists, TaskForge creates sample tasks and stores them automatically.

## Validation

The form checks:

- Title: minimum 3 characters.
- Description: minimum 10 characters.
- Category: required.
- Priority: required.
- Due date: required.

Errors are written directly beside the corresponding fields without refreshing the page.

## Overdue logic

A task is overdue when:

```js
!task.completed && task.dueDate < todayISO()
```

Overdue tasks receive the `.overdue` class and are included in the Overdue statistic and filter.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `N` | Open new task form |
| `/` | Focus search |
| `Esc` | Close an open modal |
| `Ctrl + Enter` | Submit task form |

## Bonus features

### Pagination

The dashboard displays 10 tasks per page. Pagination is generated dynamically and works with search, filtering and sorting.

### Debounced search

Search rendering is delayed by 250ms after the user stops typing. This reduces unnecessary re-renders while typing.

### Bonus status

Undo Delete and JSON Import / Export are implemented. Pagination and debounced search are implemented too. Drag-and-drop reordering is left as an optional extension so the core project stays focused on DOM manipulation rather than adding unnecessary drag-state complexity.

## How to run

1. Download or clone the project.
2. Keep these four files in the same folder.
3. Open `index.html` in a browser.
4. The application works without a server because it uses browser LocalStorage.

For GitHub submission, create a repository and upload:

```text
TaskForge/
├── index.html
├── style.css
├── app.js
└── README.md
```

## Suggested screenshots for submission

Take screenshots showing:

1. Main dashboard with statistics and task cards.
2. New task form with validation.
3. Edit task form.
4. Details modal.
5. Delete confirmation modal.
6. Filters/search/sorting in use.
7. Dark mode.
8. Bulk selection and actions.

## Design

TaskForge intentionally uses a minimal monochrome design: black, white, and simple neutral borders. Dark mode switches the same monochrome palette rather than introducing additional colors.

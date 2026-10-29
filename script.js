
"use strict";

const STORAGE_KEY = "taskflow_student_tasks_v1";

const $ = (id) => document.getElementById(id);

const elements = {
  taskList: $("taskList"),
  emptyState: $("emptyState"),
  totalCount: $("totalCount"),
  pendingCount: $("pendingCount"),
  completedCount: $("completedCount"),
  overdueCount: $("overdueCount"),
  progressPercent: $("progressPercent"),
  progressRing: $("progressRing"),
  progressTotal: $("progressTotal"),
  progressDone: $("progressDone"),
  progressRemaining: $("progressRemaining"),
  tasksHeading: $("tasksHeading"),
  tasksSubtitle: $("tasksSubtitle"),
  breadcrumb: $("breadcrumb"),
  pageTitle: $("pageTitle"),
  resultCount: $("resultCount"),
  searchInput: $("searchInput"),
  priorityFilter: $("priorityFilter"),
  categoryFilter: $("categoryFilter"),
  dialog: $("taskDialog"),
  form: $("taskForm"),
  dialogTitle: $("dialogTitle"),
  taskId: $("taskId"),
  taskTitle: $("taskTitle"),
  taskDescription: $("taskDescription"),
  taskCategory: $("taskCategory"),
  taskPriority: $("taskPriority"),
  taskDueDate: $("taskDueDate"),
  saveTaskBtn: $("saveTaskBtn"),
  formMessage: $("formMessage"),
  toast: $("toast")
};

const views = {
  all: {
    title: "Dashboard",
    heading: "Your tasks",
    subtitle: "Everything you need to stay on track"
  },
  today: {
    title: "Today's Tasks",
    heading: "Today's tasks",
    subtitle: "Tasks due today and tasks past their deadline"
  },
  upcoming: {
    title: "Upcoming",
    heading: "Upcoming tasks",
    subtitle: "Your future deadlines, organized"
  },
  completed: {
    title: "Completed",
    heading: "Completed tasks",
    subtitle: "A record of the work you've finished"
  }
};

let tasks = loadTasks();
let currentView = "all";
let toastTimeout;

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.completed === "boolean" &&
      ["High", "Medium", "Low"].includes(task.priority) &&
      ["Study", "Project", "Personal", "Other"].includes(task.category)
    );
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    showToast("Unable to save. Check your browser storage.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "No due date";

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function isOverdue(task) {
  return Boolean(
    task.dueDate &&
    task.dueDate < todayString() &&
    !task.completed
  );
}

function showToast(message) {
  clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");

  toastTimeout = setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2600);
}

function updateDashboard() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter(isOverdue).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  elements.totalCount.textContent = total;
  elements.pendingCount.textContent = pending;
  elements.completedCount.textContent = completed;
  elements.overdueCount.textContent = overdue;

  elements.progressPercent.textContent = `${percent}%`;
  elements.progressTotal.textContent = total;
  elements.progressDone.textContent = completed;
  elements.progressRemaining.textContent = pending;

  elements.progressRing.style.background =
    `conic-gradient(var(--purple) ${percent}%, #292d3c ${percent}%)`;
}

function getVisibleTasks() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const priority = elements.priorityFilter.value;
  const category = elements.categoryFilter.value;
  const today = todayString();

  return tasks
    .filter((task) => {
      if (currentView === "completed" && !task.completed) return false;
      if (currentView === "today" &&
          !(task.dueDate && task.dueDate <= today && !task.completed)) {
        return false;
      }
      if (currentView === "upcoming" &&
          !(task.dueDate && task.dueDate > today && !task.completed)) {
        return false;
      }

      if (priority !== "all" && task.priority !== priority) return false;
      if (category !== "all" && task.category !== category) return false;

      const searchable = [
        task.title,
        task.description,
        task.category,
        task.priority
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    })
    .sort((a, b) => {
      // Incomplete tasks first, then highest priority, then nearest deadline.
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);

      const priorityRank = { High: 0, Medium: 1, Low: 2 };
      if (priorityRank[a.priority] !== priorityRank[b.priority]) {
        return priorityRank[a.priority] - priorityRank[b.priority];
      }

      const aDate = a.dueDate || "9999-12-31";
      const bDate = b.dueDate || "9999-12-31";
      return aDate.localeCompare(bDate);
    });
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();

  elements.taskList.innerHTML = visibleTasks.map((task) => {
    const dueClass = isOverdue(task) ? "overdue" : "";
    const dueLabel = isOverdue(task)
      ? `Overdue · ${formatDate(task.dueDate)}`
      : formatDate(task.dueDate);

    return `
      <article class="task-row ${task.completed ? "is-complete" : ""}">
        <input
          class="task-check"
          type="checkbox"
          data-action="toggle"
          data-id="${escapeHTML(task.id)}"
          aria-label="Mark ${escapeHTML(task.title)} as ${task.completed ? "incomplete" : "completed"}"
          ${task.completed ? "checked" : ""}
        >

        <div class="task-info">
          <div class="task-title">${escapeHTML(task.title)}</div>
          ${task.description
            ? `<div class="task-description">${escapeHTML(task.description)}</div>`
            : ""}
          <div class="task-meta">
            <span class="pill">${escapeHTML(task.category)}</span>
            <span class="pill priority-${task.priority.toLowerCase()}">
              ${escapeHTML(task.priority)} priority
            </span>
            <span class="due-date ${dueClass}">${escapeHTML(dueLabel)}</span>
          </div>
        </div>

        <div class="task-actions">
          <button type="button" class="icon-btn"
            data-action="edit" data-id="${escapeHTML(task.id)}"
            aria-label="Edit ${escapeHTML(task.title)}" title="Edit">✎</button>
          <button type="button" class="icon-btn delete"
            data-action="delete" data-id="${escapeHTML(task.id)}"
            aria-label="Delete ${escapeHTML(task.title)}" title="Delete">✕</button>
        </div>
      </article>
    `;
  }).join("");

  elements.emptyState.classList.toggle("visible", visibleTasks.length === 0);

  elements.resultCount.textContent =
    `${visibleTasks.length} ${visibleTasks.length === 1 ? "task" : "tasks"}`;

  const view = views[currentView];
  elements.tasksHeading.textContent = view.heading;
  elements.tasksSubtitle.textContent = view.subtitle;
}

function render() {
  updateDashboard();
  renderTasks();
}

function setView(viewName) {
  if (!views[viewName]) return;

  currentView = viewName;

  document.querySelectorAll(".nav-item").forEach((button) => {
    const active = button.dataset.view === viewName;
    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  elements.breadcrumb.textContent = views[viewName].title;
  elements.pageTitle.innerHTML =
    `${escapeHTML(viewName === "all" ? "Good morning, Student" : views[viewName].title)} <span>✦</span>`;

  renderTasks();
}

function openCreateDialog() {
  elements.form.reset();
  elements.taskId.value = "";
  elements.dialogTitle.textContent = "Create a new task";
  elements.saveTaskBtn.textContent = "Create task";
  elements.formMessage.textContent = "";
  elements.dialog.showModal();
  elements.taskTitle.focus();
}

function openEditDialog(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  elements.form.reset();
  elements.taskId.value = task.id;
  elements.taskTitle.value = task.title;
  elements.taskDescription.value = task.description || "";
  elements.taskCategory.value = task.category;
  elements.taskPriority.value = task.priority;
  elements.taskDueDate.value = task.dueDate || "";
  elements.dialogTitle.textContent = "Edit task";
  elements.saveTaskBtn.textContent = "Save changes";
  elements.formMessage.textContent = "";
  elements.dialog.showModal();
  elements.taskTitle.focus();
}

function handleTaskSubmit(event) {
  event.preventDefault();
  elements.formMessage.textContent = "";

  const title = elements.taskTitle.value.trim();
  const description = elements.taskDescription.value.trim();
  const dueDate = elements.taskDueDate.value;
  const id = elements.taskId.value;

  if (!title) {
    elements.formMessage.textContent = "Please enter a task title.";
    elements.taskTitle.focus();
    return;
  }

  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    elements.formMessage.textContent = "Please choose a valid due date.";
    return;
  }

  if (dueDate) {
    const [year, month, day] = dueDate.split("-").map(Number);
    const validDate = new Date(year, month - 1, day);
    if (
      validDate.getFullYear() !== year ||
      validDate.getMonth() !== month - 1 ||
      validDate.getDate() !== day
    ) {
      elements.formMessage.textContent = "Please choose a valid calendar date.";
      return;
    }
  }

  const existing = tasks.find((task) => task.id === id);

  if (existing) {
    Object.assign(existing, {
      title,
      description,
      category: elements.taskCategory.value,
      priority: elements.taskPriority.value,
      dueDate
    });
  } else {
    tasks.unshift({
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      description,
      category: elements.taskCategory.value,
      priority: elements.taskPriority.value,
      dueDate,
      completed: false,
      createdAt: new Date().toISOString()
    });
  }

  if (!saveTasks()) return;

  elements.dialog.close();
  render();
  showToast(existing ? "Task updated successfully." : "New task created.");
}

function toggleTask(id, completed) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  const previousValue = task.completed;
  task.completed = completed;

  if (!saveTasks()) {
    task.completed = previousValue;
    render();
    return;
  }

  render();
  showToast(completed ? "Great work! Task completed." : "Task marked incomplete.");
}

function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;

  const previousTasks = tasks;
  tasks = tasks.filter((item) => item.id !== id);

  if (!saveTasks()) {
    tasks = previousTasks;
    render();
    return;
  }

  render();
  showToast("Task deleted.");
}

function clearFilters() {
  elements.searchInput.value = "";
  elements.priorityFilter.value = "all";
  elements.categoryFilter.value = "all";
  renderTasks();
}

function initializeDateAndGreeting() {
  const now = new Date();

  $("todayLabel").textContent = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).toUpperCase();

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" : "Good evening";

  elements.pageTitle.innerHTML =
    `${greeting}, Student <span>✦</span>`;
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

$("newTaskBtn").addEventListener("click", openCreateDialog);
$("emptyAddBtn").addEventListener("click", openCreateDialog);
$("closeDialog").addEventListener("click", () => elements.dialog.close());
$("cancelDialog").addEventListener("click", () => elements.dialog.close());

elements.form.addEventListener("submit", handleTaskSubmit);

elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

elements.taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "edit") openEditDialog(id);
  if (action === "delete") deleteTask(id);
});

elements.taskList.addEventListener("change", (event) => {
  const checkbox = event.target.closest('input[data-action="toggle"]');
  if (checkbox) toggleTask(checkbox.dataset.id, checkbox.checked);
});

elements.searchInput.addEventListener("input", renderTasks);
elements.priorityFilter.addEventListener("change", renderTasks);
elements.categoryFilter.addEventListener("change", renderTasks);
$("clearSearchBtn").addEventListener("click", clearFilters);

initializeDateAndGreeting();
render();

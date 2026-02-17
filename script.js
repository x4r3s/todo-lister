const API_URL = "https://jsonplaceholder.typicode.com";
const TODOS_LIMIT = 15;
const USERS_LIMIT = 5;

const state = {
  todos: [],
  users: [],
};

const todoList = document.getElementById("todo-list");
const todoForm = document.getElementById("todoForm");
const userSelect = document.getElementById("user-todo");
const totalCounter = document.getElementById("totalCounter");
const doneCounter = document.getElementById("doneCounter");
const listMessage = document.getElementById("listMessage");
const listHint = document.getElementById("listHint");
const footerYear = document.getElementById("footerYear");

function setMessage(text) {
  listMessage.textContent = text;
}

function setHint(text) {
  listHint.textContent = text;
}

function getUserName(userId) {
  const user = state.users.find((item) => item.id === Number(userId));
  return user ? user.name : "Unknown user";
}

function updateCounters() {
  const total = state.todos.length;
  const done = state.todos.filter((todo) => todo.completed).length;

  totalCounter.textContent = String(total);
  doneCounter.textContent = String(done);
}

function renderUsers() {
  const options = state.users
    .map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`)
    .join("");

  userSelect.insertAdjacentHTML("beforeend", options);
}

function createTodoElement(todo) {
  const item = document.createElement("li");
  item.className = "todo-item";
  item.dataset.id = String(todo.id);

  if (todo.completed) {
    item.classList.add("completed");
  }

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(todo.completed);
  checkbox.addEventListener("change", handleTodoToggle);

  const content = document.createElement("div");
  content.className = "todo-main";
  content.innerHTML = `
    <p class="todo-title">${escapeHtml(todo.title)}</p>
    <p class="todo-meta">by ${escapeHtml(getUserName(todo.userId))}</p>
  `;

  const removeButton = document.createElement("button");
  removeButton.className = "todo-remove";
  removeButton.type = "button";
  removeButton.textContent = "×";
  removeButton.addEventListener("click", handleTodoRemove);

  item.append(checkbox, content, removeButton);
  return item;
}

function renderTodos() {
  todoList.innerHTML = "";

  if (!state.todos.length) {
    todoList.innerHTML = '<li class="empty">No tasks yet</li>';
    setMessage("No tasks yet. Add your first todo.");
    setHint("Choose user, type task title, then click Add Todo.");
    return;
  }

  state.todos
    .slice()
    .reverse()
    .forEach((todo) => {
      todoList.append(createTodoElement(todo));
    });

  setMessage("Todos are loaded and ready.");
  setHint("Use checkbox to complete task and × to remove it.");
}

async function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(todoForm);
  const title = String(formData.get("todo") || "").trim();
  const userId = Number(formData.get("user"));

  if (!title || !userId) {
    return;
  }

  const payload = {
    userId,
    title,
    completed: false,
  };

  try {
    const newTodo = await createTodo(payload);
    state.todos.push(newTodo);

    const emptyState = todoList.querySelector(".empty");
    if (emptyState) {
      emptyState.remove();
    }

    todoList.prepend(createTodoElement(newTodo));
    updateCounters();
    setMessage(`Task "${title}" added.`);
    setHint("You can mark it done or remove it.");

    todoForm.reset();
    userSelect.selectedIndex = 0;
  } catch (error) {
    alertError(error);
  }
}

async function handleTodoToggle(event) {
  const checkbox = event.currentTarget;
  const item = checkbox.closest(".todo-item");
  const todoId = Number(item.dataset.id);
  const completed = checkbox.checked;

  try {
    await patchTodo(todoId, { completed });

    const todo = state.todos.find((entry) => entry.id === todoId);
    if (todo) {
      todo.completed = completed;
    }

    item.classList.toggle("completed", completed);
    updateCounters();
    setMessage(completed ? "Task marked as completed." : "Task moved back to active.");
  } catch (error) {
    checkbox.checked = !completed;
    alertError(error);
  }
}

async function handleTodoRemove(event) {
  const button = event.currentTarget;
  const item = button.closest(".todo-item");
  const todoId = Number(item.dataset.id);

  try {
    await deleteTodo(todoId);

    state.todos = state.todos.filter((todo) => todo.id !== todoId);
    item.remove();

    if (!state.todos.length) {
      todoList.innerHTML = '<li class="empty">No tasks yet</li>';
    }

    updateCounters();
    setMessage("Task removed.");
  } catch (error) {
    alertError(error);
  }
}

async function getAllTodos() {
  const response = await fetch(`${API_URL}/todos?_limit=${TODOS_LIMIT}`);
  if (!response.ok) {
    throw new Error("Failed to load todos. Please try later.");
  }
  return response.json();
}

async function getAllUsers() {
  const response = await fetch(`${API_URL}/users?_limit=${USERS_LIMIT}`);
  if (!response.ok) {
    throw new Error("Failed to load users. Please try later.");
  }
  return response.json();
}

async function createTodo(todo) {
  const response = await fetch(`${API_URL}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(todo),
  });

  if (!response.ok) {
    throw new Error("Failed to create todo. Please try later.");
  }

  return response.json();
}

async function patchTodo(todoId, payload) {
  const response = await fetch(`${API_URL}/todos/${todoId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to update todo. Please try later.");
  }
}

async function deleteTodo(todoId) {
  const response = await fetch(`${API_URL}/todos/${todoId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete todo. Please try later.");
  }
}

function alertError(error) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  alert(message);
  setMessage(message);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function bindEvents() {
  todoForm.addEventListener("submit", handleSubmit);
}

async function init() {
  if (footerYear) {
    footerYear.textContent = String(new Date().getFullYear());
  }

  bindEvents();

  try {
    const [todos, users] = await Promise.all([getAllTodos(), getAllUsers()]);
    state.todos = todos || [];
    state.users = users || [];

    renderUsers();
    renderTodos();
    updateCounters();
  } catch (error) {
    alertError(error);
  }
}

init();

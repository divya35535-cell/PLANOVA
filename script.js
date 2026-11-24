
const STORAGE_KEY = "eventEaseMultiEvents";

const $ = (id) => document.getElementById(id);

let events = [];
let activeEventId = null;

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getActiveEvent() {
  return events.find(event => event.id === activeEventId);
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);
}

// ---------------- TASK MANAGEMENT ----------------

function renderTasks() {
  const event = getActiveEvent();
  const list = $("taskList");
  if (!event || !list) return;

  list.replaceChildren();

  event.tasks.forEach(task => {
    const li = document.createElement("li");
    li.className = "task-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      saveEvents();
      updateDashboard();
      renderTasks();
    });

    const label = document.createElement("span");
    label.textContent = task.text;
    if (task.completed) label.classList.add("completed");

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "✕";
    remove.setAttribute("aria-label", "Delete task");
    remove.addEventListener("click", () => {
      event.tasks = event.tasks.filter(item => item.id !== task.id);
      saveEvents();
      renderTasks();
      updateDashboard();
    });

    li.append(checkbox, label, remove);
    list.appendChild(li);
  });
}

function updateDashboard() {
  const event = getActiveEvent();
  if (!event) return;

  const total = event.tasks.length;
  const completed = event.tasks.filter(task => task.completed).length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;

  if ($("count")) $("count").textContent = `${completed}/${total}`;
  if ($("progress")) $("progress").style.width = `${percentage}%`;
  if ($("score")) $("score").textContent = percentage;
  if ($("scoreRing")) {
    $("scoreRing").style.setProperty("--progress", `${percentage}%`);
  }

  if ($("insightText")) {
    $("insightText").textContent =
      percentage === 100 && total > 0
        ? "Amazing! All tasks are completed."
        : percentage >= 60
        ? "Great progress! Keep going."
        : "Complete your tasks to improve your event score.";
  }

  renderTasks();
}

if ($("addForm")) {
  $("addForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const input = $("newTask");
    const text = input?.value.trim();
    const event = getActiveEvent();

    if (!text || !event) return;

    event.tasks.push({
      id: makeId(),
      text,
      completed: false
    });

    input.value = "";
    saveEvents();
    updateDashboard();
  });
}

// ---------------- EVENT MANAGEMENT ----------------

function renderEventDropdown() {
  const select = $("eventSelect");
  if (!select) return;

  select.replaceChildren();

  events.forEach(event => {
    const option = document.createElement("option");
    option.value = event.id;
    option.textContent = event.name;
    option.selected = event.id === activeEventId;
    select.appendChild(option);
  });
}

function dateDifference(dateString) {
  if (!dateString) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;

  return Math.ceil((target - today) / 86400000);
}

function formatDate(dateString) {
  if (!dateString) return "Date not set";

  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "short", year: "numeric" }
  );
}

function updateCountdown() {
  const event = getActiveEvent();
  if (!event) return;

  const title = $("countdownTitle");
  const message = $("countdownMessage");
  const days = $("countdownDays");

  if (title) title.textContent = event.name;

  const difference = dateDifference(event.date);

  if (difference === null) {
    if (days) days.textContent = "--";
    if (message) message.textContent = "Add an event date to start your countdown.";
  } else if (difference > 0) {
    if (days) days.textContent = difference;
    if (message) message.textContent = `Only ${difference} day(s) to go!`;
  } else if (difference === 0) {
    if (days) days.textContent = "0";
    if (message) message.textContent = "Your event is today!";
  } else {
    if (days) days.textContent = "✓";
    if (message) message.textContent = `This event was ${Math.abs(difference)} day(s) ago.`;
  }
}

function renderUpcomingEvents() {
  const list = $("upcomingEventsList");
  if (!list) return;

  list.replaceChildren();

  const upcoming = events
    .filter(event => {
      const difference = dateDifference(event.date);
      return difference !== null && difference >= 0;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!upcoming.length) {
    const empty = document.createElement("p");
    empty.textContent = "No upcoming events. Add an event date to see it here.";
    list.appendChild(empty);
    return;
  }

  upcoming.forEach(event => {
    const item = document.createElement("div");
    item.className = "upcoming-event";

    const details = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = event.name;

    const date = document.createElement("small");
    date.textContent = formatDate(event.date);

    details.append(name, date);

    const open = document.createElement("button");
    open.type = "button";
    open.textContent = "View";
    open.addEventListener("click", () => switchEvent(event.id));

    item.append(details, open);
    list.appendChild(item);
  });
}

function renderActiveEvent() {
  const event = getActiveEvent();
  if (!event) return;

  renderEventDropdown();
  updateDashboard();
  updateCountdown();
  renderUpcomingEvents();
  renderGuests();
  renderBudget();

  if ($("eventName")) $("eventName").value = "";
  if ($("eventDate")) $("eventDate").value = "";
}

function createEvent(e) {
  e.preventDefault();

  const name = $("eventName")?.value.trim();
  const type = $("eventType")?.value || "Other";
  const date = $("eventDate")?.value || "";

  if (!name) {
    alert("Please enter an event name.");
    return;
  }

  const event = {
    id: makeId(),
    name,
    type,
    date,
    tasks: [],
    guests: [],
    budget: 0,
    expenses: []
  };

  events.push(event);
  activeEventId = event.id;

  saveEvents();
  renderActiveEvent();

  $("eventForm")?.reset();
}

if ($("eventForm")) {
  $("eventForm").addEventListener("submit", createEvent);
}

function switchEvent(id) {
  if (!events.some(event => event.id === id)) return;

  activeEventId = id;
  renderActiveEvent();
}

if ($("eventSelect")) {
  $("eventSelect").addEventListener("change", e => {
    switchEvent(e.target.value);
  });
}

if ($("deleteEvent")) {
  $("deleteEvent").addEventListener("click", () => {
    if (events.length <= 1) {
      alert("You need at least one event.");
      return;
    }

    const event = getActiveEvent();
    if (!event || !confirm(`Delete "${event.name}"?`)) return;

    events = events.filter(item => item.id !== activeEventId);
    activeEventId = events[0].id;

    saveEvents();
    renderActiveEvent();
  });
}

// ---------------- GUEST MANAGEMENT ----------------

function renderGuests() {
  const event = getActiveEvent();
  const list = $("guestList");
  if (!event || !list) return;

  const guests = event.guests || [];

  const accepted = guests.filter(g => g.status === "Accepted").length;
  const pending = guests.filter(g => g.status === "Pending").length;
  const declined = guests.filter(g => g.status === "Declined").length;

  if ($("totalGuests")) $("totalGuests").textContent = guests.length;
  if ($("acceptedGuests")) $("acceptedGuests").textContent = accepted;
  if ($("pendingGuests")) $("pendingGuests").textContent = pending;
  if ($("declinedGuests")) $("declinedGuests").textContent = declined;

  list.replaceChildren();

  const filter = $("guestFilter")?.value || "All";
  const filtered = guests.filter(g => filter === "All" || g.status === filter);

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.textContent = "No guests to display.";
    list.appendChild(empty);
    return;
  }

  filtered.forEach(guest => {
    const item = document.createElement("div");
    item.className = "guest-item";

    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = guest.name;

    const email = document.createElement("small");
    email.textContent = guest.email || "No email provided";

    info.append(name, email);

    const status = document.createElement("select");
    ["Pending", "Accepted", "Declined"].forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = guest.status === value;
      status.appendChild(option);
    });

    status.addEventListener("change", () => {
      guest.status = status.value;
      saveEvents();
      renderGuests();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      event.guests = event.guests.filter(g => g.id !== guest.id);
      saveEvents();
      renderGuests();
    });

    item.append(info, status, remove);
    list.appendChild(item);
  });
}

if ($("guestForm")) {
  $("guestForm").addEventListener("submit", e => {
    e.preventDefault();

    const event = getActiveEvent();
    const name = $("guestName")?.value.trim();
    const email = $("guestEmail")?.value.trim() || "";

    if (!event || !name) return;

    const duplicate = email && event.guests.some(
      guest => guest.email.toLowerCase() === email.toLowerCase()
    );

    if (duplicate) {
      alert("This guest email is already added.");
      return;
    }

    event.guests.push({
      id: makeId(),
      name,
      email,
      status: "Pending"
    });

    saveEvents();
    $("guestForm").reset();
    renderGuests();
  });
}

if ($("guestFilter")) {
  $("guestFilter").addEventListener("change", renderGuests);
}

// ---------------- BUDGET & EXPENSE ANALYTICS ----------------

function renderBudget() {
  const event = getActiveEvent();
  if (!event) return;

  const budget = Number(event.budget) || 0;
  const expenses = event.expenses || [];
  const spent = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const remaining = budget - spent;
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;

  if ($("eventBudget")) $("eventBudget").value = budget || "";
  if ($("totalBudget")) $("totalBudget").textContent = formatCurrency(budget);
  if ($("totalSpent")) $("totalSpent").textContent = formatCurrency(spent);
  if ($("remainingBudget")) $("remainingBudget").textContent = formatCurrency(remaining);
  if ($("budgetPercentage")) {
    $("budgetPercentage").textContent = `${Math.round(percentage)}%`;
  }

  if ($("budgetProgressBar")) {
    $("budgetProgressBar").style.width = `${Math.min(percentage, 100)}%`;
  }

  if ($("budgetMessage")) {
    if (budget === 0) {
      $("budgetMessage").textContent = "Set your event budget to start tracking expenses.";
    } else if (remaining < 0) {
      $("budgetMessage").textContent =
        `Budget exceeded by ${formatCurrency(Math.abs(remaining))}. Review your expenses!`;
    } else if (percentage >= 80) {
      $("budgetMessage").textContent = "Warning: You have used most of your event budget.";
    } else {
      $("budgetMessage").textContent =
        `You have ${formatCurrency(remaining)} remaining in your budget.`;
    }
  }

  renderCategoryAnalytics(expenses);
  renderExpenseHistory(expenses);
}

function renderCategoryAnalytics(expenses) {
  const container = $("categoryAnalytics");
  if (!container) return;

  container.replaceChildren();

  if (!expenses.length) {
    const empty = document.createElement("p");
    empty.className = "budget-empty";
    empty.textContent = "Add expenses to see category-wise analytics.";
    container.appendChild(empty);
    return;
  }

  const totals = {};

  expenses.forEach(expense => {
    const category = expense.category || "Other";
    totals[category] = (totals[category] || 0) + Number(expense.amount);
  });

  const totalSpent = Object.values(totals).reduce((sum, value) => sum + value, 0);

  Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, amount]) => {
      const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;

      const row = document.createElement("div");
      row.className = "category-row";

      const label = document.createElement("div");
      label.className = "category-label";

      const name = document.createElement("span");
      name.textContent = category;

      const value = document.createElement("strong");
      value.textContent = `${formatCurrency(amount)} (${Math.round(percentage)}%)`;

      label.append(name, value);

      const track = document.createElement("div");
      track.className = "category-track";

      const fill = document.createElement("div");
      fill.className = "category-fill";
      fill.style.width = `${percentage}%`;

      track.appendChild(fill);
      row.append(label, track);
      container.appendChild(row);
    });
}

function renderExpenseHistory(expenses) {
  const list = $("expenseList");
  if (!list) return;

  list.replaceChildren();

  if (!expenses.length) {
    const empty = document.createElement("p");
    empty.className = "budget-empty";
    empty.textContent = "No expenses added yet.";
    list.appendChild(empty);
    return;
  }

  [...expenses].reverse().forEach(expense => {
    const item = document.createElement("div");
    item.className = "expense-item";

    const details = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent = expense.name;

    const category = document.createElement("small");
    category.textContent = expense.category;

    details.append(name, category);

    const amount = document.createElement("strong");
    amount.textContent = formatCurrency(expense.amount);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "✕";
    remove.setAttribute("aria-label", "Delete expense");

    remove.addEventListener("click", () => {
      const event = getActiveEvent();
      if (!event) return;

      event.expenses = event.expenses.filter(item => item.id !== expense.id);
      saveEvents();
      renderBudget();
    });

    item.append(details, amount, remove);
    list.appendChild(item);
  });
}

if ($("budgetForm")) {
  $("budgetForm").addEventListener("submit", e => {
    e.preventDefault();

    const event = getActiveEvent();
    const budget = Number($("eventBudget")?.value);

    if (!event || !Number.isFinite(budget) || budget < 0) {
      alert("Please enter a valid budget.");
      return;
    }

    event.budget = budget;
    saveEvents();
    renderBudget();
  });
}

if ($("expenseForm")) {
  $("expenseForm").addEventListener("submit", e => {
    e.preventDefault();

    const event = getActiveEvent();
    const name = $("expenseName")?.value.trim();
    const category = $("expenseCategory")?.value || "Other";
    const amount = Number($("expenseAmount")?.value);

    if (!event || !name || !Number.isFinite(amount) || amount <= 0) {
      alert("Enter an expense name and a valid amount greater than zero.");
      return;
    }

    event.expenses.push({
      id: makeId(),
      name,
      category,
      amount
    });

    saveEvents();
    $("expenseForm").reset();
    renderBudget();
  });
}

// ---------------- INITIALIZATION & DATA MIGRATION ----------------

function initializeEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    events = Array.isArray(saved) ? saved : [];
  } catch {
    events = [];
  }

  events.forEach(event => {
    if (!Array.isArray(event.tasks)) event.tasks = [];
    if (!Array.isArray(event.guests)) event.guests = [];
    if (!Array.isArray(event.expenses)) event.expenses = [];
    if (!Number.isFinite(Number(event.budget))) event.budget = 0;

    event.budget = Number(event.budget);
    event.expenses.forEach(expense => {
      expense.amount = Number(expense.amount) || 0;
    });
  });

  if (!events.length) {
    const oldTasks = JSON.parse(localStorage.getItem("eventEaseTasks") || "null");

    events.push({
      id: makeId(),
      name: "My First Event",
      type: "Other",
      date: "",
      tasks: Array.isArray(oldTasks) ? oldTasks : [],
      guests: [],
      budget: 0,
      expenses: []
    });
  }

  activeEventId = events[0].id;

  if ($("today")) {
    $("today").textContent = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  saveEvents();
  renderActiveEvent();
}

initializeEvents();

// ========================================
// SMART EVENT DAY TIMELINE
// ========================================

function renderTimeline() {
  const event = getActiveEvent();
  const list = $("timelineList");

  if (!event || !list) return;

  if (!Array.isArray(event.timeline)) {
    event.timeline = [];
  }

  const activities = [...event.timeline].sort((a, b) =>
    a.time.localeCompare(b.time)
  );

  const completed = activities.filter(item => item.completed).length;
  const total = activities.length;

  const percentage = total
    ? Math.round((completed / total) * 100)
    : 0;

  if ($("timelineCount")) {
    $("timelineCount").textContent =
      `${total} ${total === 1 ? "Activity" : "Activities"}`;
  }

  if ($("timelineProgressText")) {
    $("timelineProgressText").textContent =
      `${percentage}% completed`;
  }

  if ($("timelineProgressBar")) {
    $("timelineProgressBar").style.width = `${percentage}%`;
  }

  list.replaceChildren();

  if (!activities.length) {
    const empty = document.createElement("p");
    empty.className = "timeline-empty";
    empty.textContent = "No activities planned yet.";
    list.appendChild(empty);
    return;
  }

  activities.forEach(activity => {
    const item = document.createElement("div");
    item.className = "timeline-item";

    if (activity.completed) {
      item.classList.add("is-completed");
    }

    const time = document.createElement("div");
    time.className = "timeline-time";

    if (activity.time) {
      const [hour, minute] = activity.time.split(":");
      const date = new Date();
      date.setHours(Number(hour), Number(minute), 0, 0);

      time.textContent = date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } else {
      time.textContent = "--:--";
    }

    const details = document.createElement("div");
    details.className = "timeline-details";

    const title = document.createElement("strong");
    title.textContent = activity.name;

    details.appendChild(title);

    if (activity.person) {
      const person = document.createElement("small");
      person.textContent = `Responsible: ${activity.person}`;
      details.appendChild(person);
    }

    if (activity.location) {
      const location = document.createElement("small");
      location.textContent = `Location: ${activity.location}`;
      details.appendChild(location);
    }

    const actions = document.createElement("div");
    actions.className = "timeline-actions";

    const completeButton = document.createElement("button");
    completeButton.type = "button";
    completeButton.className = "timeline-complete";
    completeButton.textContent = activity.completed
      ? "Undo"
      : "Complete";

    completeButton.addEventListener("click", () => {
      activity.completed = !activity.completed;
      saveEvents();
      renderTimeline();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "timeline-delete";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
      event.timeline = event.timeline.filter(
        item => item.id !== activity.id
      );

      saveEvents();
      renderTimeline();
    });

    actions.append(completeButton, deleteButton);
    item.append(time, details, actions);
    list.appendChild(item);
  });
}

// Add a new activity
if ($("timelineForm")) {
  $("timelineForm").addEventListener("submit", e => {
    e.preventDefault();

    const event = getActiveEvent();

    const time = $("timelineTime")?.value;
    const name = $("timelineActivity")?.value.trim();
    const person = $("timelinePerson")?.value.trim() || "";
    const location = $("timelineLocation")?.value.trim() || "";

    if (!event || !time || !name) {
      alert("Please enter the activity name and time.");
      return;
    }

    if (!Array.isArray(event.timeline)) {
      event.timeline = [];
    }

    event.timeline.push({
      id: makeId(),
      time,
      name,
      person,
      location,
      completed: false
    });

    saveEvents();

    $("timelineForm").reset();
    renderTimeline();
  });
}

// Extend the existing event display
const previousRenderActiveEvent = renderActiveEvent;

renderActiveEvent = function() {
  previousRenderActiveEvent();

  const event = getActiveEvent();

  if (event && !Array.isArray(event.timeline)) {
    event.timeline = [];
    saveEvents();
  }

  renderTimeline();
};

// Display the active event's timeline immediately
renderTimeline();

// ========================================
// SMART EVENT ANALYTICS
// ========================================

function updateAnalytics() {
  const event = getActiveEvent();
  if (!event) return;

  const tasks = event.tasks || [];
  const guests = event.guests || [];
  const expenses = event.expenses || [];
  const timeline = event.timeline || [];

  // 1. Task completion
  const completedTasks = tasks.filter(task => task.completed).length;
  const taskPercentage = tasks.length
    ? Math.round(completedTasks / tasks.length * 100)
    : 0;

  $("analyticsTasks").textContent = `${taskPercentage}%`;
  $("analyticsTaskInfo").textContent =
    `${completedTasks} of ${tasks.length} tasks completed`;

  // 2. Guest acceptance
  const acceptedGuests = guests.filter(
    guest => guest.status === "Accepted"
  ).length;

  const guestPercentage = guests.length
    ? Math.round(acceptedGuests / guests.length * 100)
    : 0;

  $("analyticsGuests").textContent = `${guestPercentage}%`;
  $("analyticsGuestInfo").textContent =
    `${acceptedGuests} of ${guests.length} guests accepted`;

  // 3. Budget utilization
  const budget = Number(event.budget) || 0;
  const spent = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0), 0
  );

  const budgetPercentage = budget > 0
    ? Math.round(spent / budget * 100)
    : 0;

  $("analyticsBudget").textContent = `${budgetPercentage}%`;
  $("analyticsBudgetInfo").textContent = budget > 0
    ? `${formatCurrency(spent)} spent of ${formatCurrency(budget)}`
    : "Set a budget to start tracking";

  // 4. Timeline completion
  const completedActivities = timeline.filter(
    activity => activity.completed
  ).length;

  const timelinePercentage = timeline.length
    ? Math.round(completedActivities / timeline.length * 100)
    : 0;

  $("analyticsTimeline").textContent = `${timelinePercentage}%`;
  $("analyticsTimelineInfo").textContent =
    `${completedActivities} of ${timeline.length} activities completed`;

  // 5. Overall preparation score
  const budgetHealth = budget > 0
    ? Math.max(0, Math.round((1 - spent / budget) * 100))
    : 0;

  const healthScore = Math.round(
    (taskPercentage +
      guestPercentage +
      budgetHealth +
      timelinePercentage) / 4
  );

  $("eventHealthScore").textContent = `${healthScore}%`;
  $("eventHealthBar").style.width = `${healthScore}%`;

  // Smart event health report
  let message = "";

  if (
    !tasks.length &&
    !guests.length &&
    !timeline.length &&
    budget === 0
  ) {
    message = "Start adding event details to generate your preparation report.";
  } else if (budget > 0 && spent > budget) {
    message = "Budget alert! Your event expenses have exceeded the planned budget.";
  } else if (healthScore >= 80) {
    message = "Excellent preparation! Your event is looking well organized. Keep it up!";
  } else if (healthScore >= 50) {
    message = "Good progress! A few more tasks and activities need your attention.";
  } else {
    message = "Your event needs more preparation. Start completing tasks and organizing activities.";
  }

  $("eventHealthMessage").textContent = message;
}

// Automatically refresh analytics when other features change
function connectAnalytics(functionName) {
  const originalFunction = window[functionName];

  if (typeof originalFunction !== "function") return;

  window[functionName] = function(...args) {
    const result = originalFunction.apply(this, args);
    updateAnalytics();
    return result;
  };
}

[
  "updateDashboard",
  "renderGuests",
  "renderBudget",
  "renderTimeline"
].forEach(connectAnalytics);

// Refresh analytics when switching events
const previousAnalyticsEventRender = renderActiveEvent;

renderActiveEvent = function(...args) {
  const result = previousAnalyticsEventRender.apply(this, args);
  updateAnalytics();
  return result;
};

// Initial analytics display
updateAnalytics();

// ========================================
// EVENT REPORT EXPORT CENTER
// ========================================

function getEventReportData() {
  const event = getActiveEvent();
  if (!event) return null;

  const tasks = event.tasks || [];
  const guests = event.guests || [];
  const expenses = event.expenses || [];
  const timeline = event.timeline || [];

  const completedTasks = tasks.filter(t => t.completed).length;
  const acceptedGuests = guests.filter(g => g.status === "Accepted").length;
  const pendingGuests = guests.filter(g => g.status === "Pending").length;
  const declinedGuests = guests.filter(g => g.status === "Declined").length;
  const completedActivities = timeline.filter(t => t.completed).length;

  const budget = Number(event.budget) || 0;
  const spent = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0), 0
  );

  const taskPercent = tasks.length
    ? Math.round(completedTasks / tasks.length * 100) : 0;

  const guestPercent = guests.length
    ? Math.round(acceptedGuests / guests.length * 100) : 0;

  const budgetHealth = budget > 0
    ? Math.max(0, Math.round((1 - spent / budget) * 100)) : 0;

  const timelinePercent = timeline.length
    ? Math.round(completedActivities / timeline.length * 100) : 0;

  const healthScore = Math.round(
    (taskPercent + guestPercent + budgetHealth + timelinePercent) / 4
  );

  return {
    event,
    tasks,
    guests,
    expenses,
    timeline,
    completedTasks,
    acceptedGuests,
    pendingGuests,
    declinedGuests,
    completedActivities,
    budget,
    spent,
    remaining: budget - spent,
    taskPercent,
    guestPercent,
    timelinePercent,
    healthScore
  };
}

function updateReportPreview() {
  const data = getEventReportData();
  if (!data) return;

  if ($("reportEventName")) {
    $("reportEventName").textContent = `${data.event.name} Report`;
  }

  if ($("reportEventDate")) {
    $("reportEventDate").textContent = data.event.date
      ? `Event date: ${formatDate(data.event.date)}`
      : "Event date not set";
  }
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadEventCSV() {
  const data = getEventReportData();
  if (!data) return;

  const rows = [
    ["EVENTEASE EVENT REPORT"],
    ["Event Name", data.event.name],
    ["Event Type", data.event.type || "Other"],
    ["Event Date", data.event.date || "Not set"],
    [],
    ["TASK SUMMARY"],
    ["Total Tasks", data.tasks.length],
    ["Completed Tasks", data.completedTasks],
    ["Completion Percentage", `${data.taskPercent}%`],
    [],
    ["GUEST SUMMARY"],
    ["Total Guests", data.guests.length],
    ["Accepted", data.acceptedGuests],
    ["Pending", data.pendingGuests],
    ["Declined", data.declinedGuests],
    [],
    ["BUDGET SUMMARY"],
    ["Total Budget", data.budget],
    ["Total Expenses", data.spent],
    ["Remaining Budget", data.remaining],
    [],
    ["EXPENSE BREAKDOWN"],
    ["Expense", "Category", "Amount"],
    ...data.expenses.map(expense => [
      expense.name,
      expense.category,
      expense.amount
    ]),
    [],
    ["EVENT TIMELINE"],
    ["Time", "Activity", "Responsible Person", "Location", "Status"],
    ...data.timeline.map(activity => [
      activity.time,
      activity.name,
      activity.person || "",
      activity.location || "",
      activity.completed ? "Completed" : "Pending"
    ]),
    [],
    ["ANALYTICS"],
    ["Task Completion", `${data.taskPercent}%`],
    ["Guest Acceptance", `${data.guestPercent}%`],
    ["Timeline Completion", `${data.timelinePercent}%`],
    ["Overall Preparation Score", `${data.healthScore}%`]
  ];

  const csv = "\uFEFF" + rows.map(row =>
    row.map(csvCell).join(",")
  ).join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${data.event.name.replace(/[^a-z0-9_-]/gi, "_")}_Report.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeReportHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function printEventReport() {
  const data = getEventReportData();
  if (!data) return;

  const expenseRows = data.expenses.map(expense => `
    <tr>
      <td>${escapeReportHTML(expense.name)}</td>
      <td>${escapeReportHTML(expense.category)}</td>
      <td>${escapeReportHTML(formatCurrency(expense.amount))}</td>
    </tr>
  `).join("");

  const timelineRows = data.timeline.map(activity => `
    <tr>
      <td>${escapeReportHTML(activity.time)}</td>
      <td>${escapeReportHTML(activity.name)}</td>
      <td>${escapeReportHTML(activity.person || "-")}</td>
      <td>${escapeReportHTML(activity.location || "-")}</td>
      <td>${activity.completed ? "Completed" : "Pending"}</td>
    </tr>
  `).join("");

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Please allow pop-ups to print your report.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${escapeReportHTML(data.event.name)} - EventEase Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #222;
          padding: 30px;
          line-height: 1.5;
        }
        h1 { color: #6552b5; margin-bottom: 5px; }
        h2 {
          color: #6552b5;
          border-bottom: 1px solid #ddd;
          padding-bottom: 6px;
          margin-top: 28px;
        }
        .subtitle { color: #666; }
        .score {
          padding: 15px;
          background: #f0edff;
          border-radius: 8px;
          font-size: 22px;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        th, td {
          padding: 9px;
          border: 1px solid #ddd;
          text-align: left;
          font-size: 13px;
        }
        th { background: #f0edff; }
        .summary p { margin: 7px 0; }
        @media print {
          body { padding: 0; }
          h2 { break-after: avoid; }
          table { break-inside: auto; }
          tr { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>EventEase</h1>
      <h2>${escapeReportHTML(data.event.name)} — Event Report</h2>
      <p class="subtitle">
        Type: ${escapeReportHTML(data.event.type || "Other")} |
        Date: ${escapeReportHTML(data.event.date || "Not set")}
      </p>

      <h2>Overall Preparation</h2>
      <div class="score">${data.healthScore}% Preparation Score</div>

      <div class="summary">
        <h2>Task Summary</h2>
        <p>Total tasks: ${data.tasks.length}</p>
        <p>Completed tasks: ${data.completedTasks}</p>
        <p>Task completion: ${data.taskPercent}%</p>

        <h2>Guest Summary</h2>
        <p>Total guests: ${data.guests.length}</p>
        <p>Accepted: ${data.acceptedGuests}</p>
        <p>Pending: ${data.pendingGuests}</p>
        <p>Declined: ${data.declinedGuests}</p>

        <h2>Budget Summary</h2>
        <p>Total budget: ${escapeReportHTML(formatCurrency(data.budget))}</p>
        <p>Total expenses: ${escapeReportHTML(formatCurrency(data.spent))}</p>
        <p>Remaining: ${escapeReportHTML(formatCurrency(data.remaining))}</p>
      </div>

      <h2>Expense Breakdown</h2>
      <table>
        <thead><tr><th>Expense</th><th>Category</th><th>Amount</th></tr></thead>
        <tbody>
          ${expenseRows || '<tr><td colspan="3">No expenses recorded</td></tr>'}
        </tbody>
      </table>

      <h2>Event Day Timeline</h2>
      <table>
        <thead>
          <tr>
            <th>Time</th><th>Activity</th><th>Responsible</th>
            <th>Location</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${timelineRows || '<tr><td colspan="5">No activities planned</td></tr>'}
        </tbody>
      </table>

      <h2>Performance Analytics</h2>
      <p>Task completion: ${data.taskPercent}%</p>
      <p>Guest acceptance: ${data.guestPercent}%</p>
      <p>Timeline completion: ${data.timelinePercent}%</p>
      <p>Overall preparation: ${data.healthScore}%</p>

      <p class="subtitle">Generated by EventEase.</p>
      <script>
        window.onload = () => window.print();
      <\/script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

// Connect export buttons
if ($("exportCSV")) {
  $("exportCSV").addEventListener("click", downloadEventCSV);
}

if ($("printReport")) {
  $("printReport").addEventListener("click", printEventReport);
}

// Update preview whenever the active event changes
const previousReportRender = renderActiveEvent;

renderActiveEvent = function(...args) {
  const result = previousReportRender.apply(this, args);
  updateReportPreview();
  return result;
};

updateReportPreview();


// ==========================================
// FEATURE 9: SMART NOTIFICATION CENTER
// ==========================================

function generateEventNotifications() {
  const event = getActiveEvent();
  if (!event) return [];

  const notifications = [];

  // 1. Event date reminder
  if (event.date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDate = new Date(event.date + "T00:00:00");
    const daysLeft = Math.ceil(
      (eventDate - today) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft === 0) {
      notifications.push({
        id: "event-today",
        title: "Event is Today!",
        message: "Your event is happening today. Check your arrangements.",
        priority: "High"
      });
    } else if (daysLeft > 0 && daysLeft <= 3) {
      notifications.push({
        id: "event-soon-" + daysLeft,
        title: "Event Coming Soon",
        message: `Your event is in ${daysLeft} day(s). Get ready!`,
        priority: "High"
      });
    }
  }

  // 2. Incomplete tasks
  const remainingTasks = (event.tasks || []).filter(
    task => !task.completed
  ).length;

  if (remainingTasks > 0) {
    notifications.push({
      id: "tasks-" + remainingTasks,
      title: "Pending Tasks",
      message: `You have ${remainingTasks} task(s) left to complete.`,
      priority: "Medium"
    });
  }

  // 3. Pending guests
  const pendingGuests = (event.guests || []).filter(
    guest => guest.status === "Pending"
  ).length;

  if (pendingGuests > 0) {
    notifications.push({
      id: "guests-" + pendingGuests,
      title: "Guest Responses Pending",
      message: `${pendingGuests} guest(s) have not responded yet.`,
      priority: "Medium"
    });
  }

  // 4. Timeline reminders
  const remainingTimeline = (event.timeline || []).filter(
    item => !item.completed
  ).length;

  if (remainingTimeline > 0) {
    notifications.push({
      id: "timeline-" + remainingTimeline,
      title: "Timeline Activities Pending",
      message: `${remainingTimeline} event activity/activities are incomplete.`,
      priority: "Low"
    });
  }

  // 5. Budget warning
  const budget = Number(event.budget) || 0;
  const spent = (event.expenses || []).reduce(
    (total, expense) => total + (Number(expense.amount) || 0),
    0
  );

  if (budget > 0 && spent > budget) {
    notifications.push({
      id: "budget-over-" + spent,
      title: "Budget Exceeded!",
      message: "Your expenses are above your planned budget.",
      priority: "High"
    });
  } else if (budget > 0 && spent >= budget * 0.8) {
    notifications.push({
      id: "budget-warning-" + spent,
      title: "Budget Almost Used",
      message: "You have used at least 80% of your event budget.",
      priority: "Medium"
    });
  }

  return notifications;
}


// Render notification cards
function renderNotifications() {
  const event = getActiveEvent();
  const list = document.getElementById("notificationList");
  const count = document.getElementById("notificationCount");
  const filter = document.getElementById("notificationFilter");

  if (!event || !list || !count) return;

  if (!event.notificationRead) {
    event.notificationRead = {};
  }

  const notifications = generateEventNotifications();

  const unreadCount = notifications.filter(
    item => !event.notificationRead[item.id]
  ).length;

  count.textContent = unreadCount + " New";

  const selectedFilter = filter ? filter.value : "All";

  const filtered = notifications.filter(item =>
    selectedFilter === "All" || item.priority === selectedFilter
  );

  list.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "notification-empty";
    empty.textContent = "You're all caught up! No notifications here.";
    list.appendChild(empty);
    return;
  }

  filtered.forEach(item => {
    const isRead = !!event.notificationRead[item.id];

    const card = document.createElement("div");
    card.className = "notification-card " +
      (isRead ? "read" : "unread");

    const details = document.createElement("div");
    details.className = "notification-details";

    const heading = document.createElement("h3");
    heading.textContent = item.title;

    const message = document.createElement("p");
    message.textContent = item.message;

    const priority = document.createElement("span");
    priority.className = "notification-priority " +
      item.priority.toLowerCase();
    priority.textContent = item.priority + " Priority";

    details.append(heading, message, priority);

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = isRead ? "Read" : "Mark Read";
    button.disabled = isRead;

    button.addEventListener("click", () => {
      event.notificationRead[item.id] = true;
      saveEvents();
      renderNotifications();
    });

    card.append(details, button);
    list.appendChild(card);
  });
}


// Notification filter
const notificationFilter =
  document.getElementById("notificationFilter");

if (notificationFilter) {
  notificationFilter.addEventListener("change", renderNotifications);
}


// Mark all notifications as read
const markAllReadButton =
  document.getElementById("markAllRead");

if (markAllReadButton) {
  markAllReadButton.addEventListener("click", () => {
    const event = getActiveEvent();
    if (!event) return;

    if (!event.notificationRead) {
      event.notificationRead = {};
    }

    generateEventNotifications().forEach(item => {
      event.notificationRead[item.id] = true;
    });

    saveEvents();
    renderNotifications();
  });
}


// Refresh notifications when event information changes
function connectNotificationRefresh(functionName) {
  const originalFunction = window[functionName];

  if (typeof originalFunction !== "function") return;

  window[functionName] = function (...args) {
    const result = originalFunction.apply(this, args);
    renderNotifications();
    return result;
  };
}

[
  "renderActiveEvent",
  "updateDashboard",
  "renderGuests",
  "renderBudget",
  "renderTimeline"
].forEach(connectNotificationRefresh);


// Initial notification display
renderNotifications();

// ==========================================
// FEATURE 10: SMART EVENT RECOMMENDATIONS
// ==========================================

function generateRecommendations() {
  const event = getActiveEvent();

  if (!event) return [];

  const suggestions = [];

  // 1. Pending tasks
  const pendingTasks = (event.tasks || []).filter(
    task => !task.completed
  ).length;

  if (pendingTasks > 0) {
    suggestions.push({
      title: "Complete Pending Tasks",
      message: `You still have ${pendingTasks} task(s) to complete. Prioritize the important ones first.`,
      priority: "high"
    });
  }

  // 2. Guest confirmations
  const pendingGuests = (event.guests || []).filter(
    guest => guest.status === "Pending"
  ).length;

  if (pendingGuests > 0) {
    suggestions.push({
      title: "Follow Up With Guests",
      message: `${pendingGuests} guest(s) haven't confirmed. Send them a reminder.`,
      priority: "medium"
    });
  }

  // 3. Budget analysis
  const budget = Number(event.budget) || 0;

  const spent = (event.expenses || []).reduce(
    (total, expense) => total + (Number(expense.amount) || 0),
    0
  );

  if (budget > 0 && spent > budget) {
    suggestions.push({
      title: "Reduce Event Expenses",
      message: "Your spending has exceeded the planned budget. Review unnecessary expenses.",
      priority: "high"
    });
  } else if (budget > 0 && spent >= budget * 0.8) {
    suggestions.push({
      title: "Control Your Budget",
      message: "You've used at least 80% of your budget. Keep some money for unexpected costs.",
      priority: "medium"
    });
  } else if (budget === 0) {
    suggestions.push({
      title: "Set an Event Budget",
      message: "Add a budget to track spending and avoid unexpected expenses.",
      priority: "medium"
    });
  }

  // 4. Timeline activities
  const pendingTimeline = (event.timeline || []).filter(
    item => !item.completed
  ).length;

  if (pendingTimeline > 0) {
    suggestions.push({
      title: "Organize Your Event Timeline",
      message: `${pendingTimeline} timeline activity/activities remain. Assign responsibilities and finish planning.`,
      priority: "medium"
    });
  }

  // 5. Event date
  if (event.date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDate = new Date(event.date + "T00:00:00");
    const daysLeft = Math.ceil(
      (eventDate - today) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft >= 0 && daysLeft <= 3) {
      suggestions.push({
        title: "Final Event Preparation",
        message: daysLeft === 0
          ? "Your event is today! Double-check all arrangements."
          : `Your event is in ${daysLeft} day(s). Review your final checklist.`,
        priority: "high"
      });
    }
  }

  // 6. Positive feedback
  if (suggestions.length === 0) {
    suggestions.push({
      title: "Great Planning!",
      message: "Everything looks on track. Your event preparation is going well!",
      priority: "low"
    });
  }

  return suggestions;
}


// Display recommendations
function renderRecommendations() {
  const event = getActiveEvent();

  const list = document.getElementById("recommendationList");
  const summary = document.getElementById("recommendationSummary");

  if (!list || !summary || !event) return;

  const suggestions = generateRecommendations();

  const highCount = suggestions.filter(
    item => item.priority === "high"
  ).length;

  summary.textContent = highCount > 0
    ? `${highCount} important recommendation(s) need your attention. Follow these suggestions to improve your event preparation.`
    : "Your event is progressing well. Check these suggestions to stay organized.";

  list.innerHTML = "";

  suggestions.forEach(item => {
    const card = document.createElement("div");
    card.className = `recommendation-card ${item.priority}`;

    const content = document.createElement("div");

    const heading = document.createElement("h3");
    heading.textContent = item.title;

    const message = document.createElement("p");
    message.textContent = item.message;

    content.append(heading, message);

    const priority = document.createElement("strong");
    priority.textContent = item.priority.toUpperCase();

    card.append(content, priority);
    list.appendChild(card);
  });
}


// Refresh recommendations button
const refreshRecommendationsButton =
  document.getElementById("refreshRecommendations");

if (refreshRecommendationsButton) {
  refreshRecommendationsButton.addEventListener(
    "click",
    renderRecommendations
  );
}


// Automatically refresh when event data changes
function connectRecommendationRefresh(functionName) {
  const originalFunction = window[functionName];

  if (typeof originalFunction !== "function") return;

  window[functionName] = function (...args) {
    const result = originalFunction.apply(this, args);
    renderRecommendations();
    return result;
  };
}

[
  "renderActiveEvent",
  "updateDashboard",
  "renderGuests",
  "renderBudget",
  "renderTimeline"
].forEach(connectRecommendationRefresh);


// Initial display
renderRecommendations();

// ==========================================
// FEATURE 11: INTERACTIVE EVENT CALENDAR
// ==========================================

let calendarCurrentDate = new Date();
let calendarSelectedDate = null;

function getCalendarDateKey(year, month, day) {
  return [
    year,
    String(month + 1).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
}

function renderEventCalendar() {
  const monthTitle = document.getElementById("calendarMonth");
  const daysContainer = document.getElementById("calendarDays");

  if (!monthTitle || !daysContainer) return;

  const year = calendarCurrentDate.getFullYear();
  const month = calendarCurrentDate.getMonth();

  monthTitle.textContent = calendarCurrentDate.toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" }
  );

  daysContainer.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayKey = getCalendarDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const events = (typeof window.events !== "undefined")
    ? window.events
    : [];

  const eventsByDate = {};

  events.forEach(event => {
    if (!event.date) return;

    if (!eventsByDate[event.date]) {
      eventsByDate[event.date] = [];
    }

    eventsByDate[event.date].push(event);
  });

  // Empty spaces before the first day
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    daysContainer.appendChild(empty);
  }

  // Create calendar dates
  for (let day = 1; day <= totalDays; day++) {
    const dateKey = getCalendarDateKey(year, month, day);

    const dayButton = document.createElement("button");
    dayButton.type = "button";
    dayButton.className = "calendar-day";
    dayButton.textContent = day;

    if (dateKey === todayKey) {
      dayButton.classList.add("today");
    }

    if (eventsByDate[dateKey]) {
      dayButton.classList.add("has-event");

      const dot = document.createElement("span");
      dot.className = "calendar-event-dot";
      dayButton.appendChild(dot);
    }

    if (dateKey === calendarSelectedDate) {
      dayButton.classList.add("selected");
    }

    dayButton.addEventListener("click", () => {
      calendarSelectedDate = dateKey;
      renderEventCalendar();
      showCalendarDateEvents(dateKey, eventsByDate[dateKey] || []);
    });

    daysContainer.appendChild(dayButton);
  }

  renderUpcomingCalendarEvents(events);
}


// Show events for the selected date
function showCalendarDateEvents(dateKey, selectedEvents) {
  const title = document.getElementById("selectedDateTitle");
  const container = document.getElementById("selectedDateEvents");

  if (!title || !container) return;

  title.textContent = new Date(
    dateKey + "T00:00:00"
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  container.innerHTML = "";

  if (selectedEvents.length === 0) {
    container.textContent = "No events scheduled for this date.";
    return;
  }

  selectedEvents.forEach(event => {
    const item = document.createElement("div");
    item.className = "calendar-event-item";

    const name = document.createElement("strong");
    name.textContent = event.name || "Untitled Event";

    const type = document.createElement("span");
    type.textContent = event.type || "General Event";

    item.append(name, type);
    container.appendChild(item);
  });
}


// Show upcoming events
function renderUpcomingCalendarEvents(events) {
  const container = document.getElementById(
    "upcomingCalendarEvents"
  );

  if (!container) return;

  container.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = events
    .filter(event => {
      if (!event.date) return false;

      const date = new Date(event.date + "T00:00:00");
      return !isNaN(date) && date >= today;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (upcoming.length === 0) {
    container.textContent = "No upcoming events scheduled.";
    return;
  }

  upcoming.forEach(event => {
    const item = document.createElement("div");
    item.className = "calendar-event-item";

    const name = document.createElement("strong");
    name.textContent = event.name || "Untitled Event";

    const date = document.createElement("span");
    date.textContent = new Date(
      event.date + "T00:00:00"
    ).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.textContent = "Open Event";
    openButton.style.marginLeft = "12px";
    openButton.style.padding = "7px 12px";
    openButton.style.border = "none";
    openButton.style.borderRadius = "7px";
    openButton.style.cursor = "pointer";

    openButton.addEventListener("click", () => {
      if (typeof window.switchEvent === "function") {
        window.switchEvent(event.id);
      } else if (typeof window.setActiveEvent === "function") {
        window.setActiveEvent(event.id);
      } else {
        alert("Please select this event from your event manager.");
      }

      renderEventCalendar();
    });

    item.append(name, date, openButton);
    container.appendChild(item);
  });
}


// Month navigation
document.getElementById("previousMonth")?.addEventListener(
  "click",
  () => {
    calendarCurrentDate.setMonth(
      calendarCurrentDate.getMonth() - 1
    );
    renderEventCalendar();
  }
);

document.getElementById("nextMonth")?.addEventListener(
  "click",
  () => {
    calendarCurrentDate.setMonth(
      calendarCurrentDate.getMonth() + 1
    );
    renderEventCalendar();
  }
);


// Refresh calendar when event data changes
function connectCalendarRefresh(functionName) {
  const originalFunction = window[functionName];

  if (typeof originalFunction !== "function") return;

  window[functionName] = function (...args) {
    const result = originalFunction.apply(this, args);
    renderEventCalendar();
    return result;
  };
}

[
  "renderActiveEvent",
  "updateDashboard"
].forEach(connectCalendarRefresh);


// Initial calendar display
renderEventCalendar();

// ==========================================
// FEATURE 12: ADVANCED EVENT COMMAND CENTER
// ==========================================

function renderAdvancedOverview() {
  const events = window.events || [];

  const totalEvents = events.length;

  let totalTasks = 0;
  let completedTasks = 0;
  let totalGuests = 0;
  let upcomingEvents = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  events.forEach(event => {
    const tasks = event.tasks || [];
    const guests = event.guests || [];

    totalTasks += tasks.length;

    completedTasks += tasks.filter(
      task => task.completed
    ).length;

    totalGuests += guests.length;

    if (event.date) {
      const eventDate = new Date(event.date + "T00:00:00");

      if (!isNaN(eventDate) && eventDate >= today) {
        upcomingEvents++;
      }
    }
  });

  const progress = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  const totalElement = document.getElementById(
    "overviewTotalEvents"
  );

  const completedElement = document.getElementById(
    "overviewCompletedTasks"
  );

  const guestsElement = document.getElementById(
    "overviewTotalGuests"
  );

  const upcomingElement = document.getElementById(
    "overviewUpcomingEvents"
  );

  const progressBar = document.getElementById(
    "overviewProgressBar"
  );

  const progressText = document.getElementById(
    "overviewProgressText"
  );

  if (totalElement) totalElement.textContent = totalEvents;

  if (completedElement) {
    completedElement.textContent = completedTasks;
  }

  if (guestsElement) guestsElement.textContent = totalGuests;

  if (upcomingElement) {
    upcomingElement.textContent = upcomingEvents;
  }

  if (progressBar) {
    progressBar.style.width = progress + "%";
  }

  if (progressText) {
    progressText.textContent =
      progress + "% tasks completed across all events";
  }
}


// Quick navigation buttons
document.querySelectorAll(".overview-actions button").forEach(
  button => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      const target = document.getElementById(targetId);

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    });
  }
);


// Refresh overview when event data changes
function connectOverviewRefresh(functionName) {
  const originalFunction = window[functionName];

  if (typeof originalFunction !== "function") return;

  window[functionName] = function (...args) {
    const result = originalFunction.apply(this, args);
    renderAdvancedOverview();
    return result;
  };
}

[
  "renderActiveEvent",
  "updateDashboard",
  "renderGuests",
  "renderBudget",
  "renderTimeline"
].forEach(connectOverviewRefresh);


// Initial display
renderAdvancedOverview();

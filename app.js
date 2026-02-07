const SETTINGS_KEY = "annualCalendarSettings.v1";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const yearInput = document.getElementById("yearInput");
const yearTitle = document.getElementById("yearTitle");
const weekdayRow = document.getElementById("weekdayRow");
const monthRows = document.getElementById("monthRows");
const displayTimeZone = document.getElementById("displayTimeZone");
const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const userLabel = document.getElementById("userLabel");
const historyDrawer = document.getElementById("historyDrawer");
const historyPanel = historyDrawer.querySelector(".history-panel");
const historyTitle = document.getElementById("historyTitle");
const historyBody = document.getElementById("historyBody");
const historyClose = document.getElementById("historyClose");
const categoryPills = document.getElementById("categoryPills");
const categoryEditBtn = document.getElementById("categoryEditBtn");
const eventPopup = document.getElementById("eventPopup");
const eventPopupTitle = document.getElementById("eventPopupTitle");
const eventPopupMeta = document.getElementById("eventPopupMeta");
const eventPopupDesc = document.getElementById("eventPopupDesc");
const eventPopupView = document.getElementById("eventPopupView");
const eventPopupForm = document.getElementById("eventPopupForm");
const eventPopupTitleInput = document.getElementById("eventPopupTitleInput");
const eventPopupCategory = document.getElementById("eventPopupCategory");
const categoryManagerPopup = document.getElementById("categoryManagerPopup");
const categoryManagerList = document.getElementById("categoryManagerList");
const categoryManagerName = document.getElementById("categoryManagerName");
const categoryManagerColor = document.getElementById("categoryManagerColor");
const categoryManagerCreate = document.getElementById("categoryManagerCreate");
const categoryManagerClose = document.getElementById("categoryManagerClose");
const eventPopupAllDay = document.getElementById("eventPopupAllDay");
const eventPopupStartDate = document.getElementById("eventPopupStartDate");
const eventPopupStartTime = document.getElementById("eventPopupStartTime");
const eventPopupEndDate = document.getElementById("eventPopupEndDate");
const eventPopupEndTime = document.getElementById("eventPopupEndTime");
const eventPopupTimeZone = document.getElementById("eventPopupTimeZone");
const eventPopupRecurrence = document.getElementById("eventPopupRecurrence");
const eventPopupInterval = document.getElementById("eventPopupInterval");
const eventPopupUntil = document.getElementById("eventPopupUntil");
const eventPopupWeekdays = document.getElementById("eventPopupWeekdays");
const eventPopupDescription = document.getElementById("eventPopupDescription");
const eventPopupSave = document.getElementById("eventPopupSave");
const eventPopupCancel = document.getElementById("eventPopupCancel");
const settingsBtn = document.getElementById("settingsBtn");
const settingsPopup = document.getElementById("settingsPopup");
const settingsClose = document.getElementById("settingsClose");
const userBtn = document.getElementById("userBtn");
const userDrawer = document.getElementById("userDrawer");
const userClose = document.getElementById("userClose");
const userAvatar = document.getElementById("userAvatar");

const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const tzList =
  Intl.supportedValuesOf && Intl.supportedValuesOf("timeZone")
    ? Intl.supportedValuesOf("timeZone")
    : [Intl.DateTimeFormat().resolvedOptions().timeZone];

const supabaseConfig = window.__SUPABASE__ || {};
const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;

const state = loadSettings();

initialize();

function initialize() {
  populateTimeZones();
  bindEvents();
  syncFormDefaults();
  setupAuth();
}

function populateTimeZones() {
  displayTimeZone.innerHTML = "";
  eventPopupTimeZone.innerHTML = "";

  tzList.forEach((tz) => {
    const option = document.createElement("option");
    option.value = tz;
    option.textContent = tz;
    displayTimeZone.appendChild(option.cloneNode(true));
    eventPopupTimeZone.appendChild(option);
  });
}

function bindEvents() {
  yearInput.addEventListener("change", () => {
    state.year = clampYear(Number(yearInput.value));
    renderAll();
    saveSettings();
  });

  displayTimeZone.addEventListener("change", () => {
    state.displayTimeZone = displayTimeZone.value;
    renderAll();
    saveSettings();
  });

  window.addEventListener("resize", () => {
    renderCalendar();
  });

  historyClose.addEventListener("click", closeHistoryDrawer);
  historyDrawer.addEventListener("click", (event) => {
    if (event.target === historyDrawer) {
      closeHistoryDrawer();
    }
  });

  eventPopup.addEventListener("click", (event) => {
    if (event.target === eventPopup) closeEventPopup();
  });
  settingsBtn.addEventListener("click", () => {
    settingsPopup.classList.add("open");
    settingsPopup.setAttribute("aria-hidden", "false");
  });
  settingsClose.addEventListener("click", () => {
    settingsPopup.classList.remove("open");
    settingsPopup.setAttribute("aria-hidden", "true");
  });
  settingsPopup.addEventListener("click", (event) => {
    if (event.target === settingsPopup) {
      settingsPopup.classList.remove("open");
      settingsPopup.setAttribute("aria-hidden", "true");
    }
  });
  userBtn.addEventListener("click", () => {
    userDrawer.classList.add("open");
    userDrawer.setAttribute("aria-hidden", "false");
  });
  userClose.addEventListener("click", () => {
    userDrawer.classList.remove("open");
    userDrawer.setAttribute("aria-hidden", "true");
  });
  userDrawer.addEventListener("click", (event) => {
    if (event.target === userDrawer) {
      userDrawer.classList.remove("open");
      userDrawer.setAttribute("aria-hidden", "true");
    }
  });
  categoryEditBtn.addEventListener("click", () => {
    openCategoryManager();
  });
  categoryManagerClose.addEventListener("click", closeCategoryManager);
  categoryManagerPopup.addEventListener("click", (event) => {
    if (event.target === categoryManagerPopup) closeCategoryManager();
  });
  categoryManagerCreate.addEventListener("click", async () => {
    await createCategoryFromManager();
  });
  categoryManagerName.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await createCategoryFromManager();
    }
  });
  eventPopupCancel.addEventListener("click", () => {
    if (popupMode === "create") {
      closeEventPopup();
    } else {
      togglePopupEdit(false);
    }
  });
  eventPopupAllDay.addEventListener("change", () => {
    togglePopupTimeInputs();
  });
  eventPopupRecurrence.addEventListener("change", () => {
    eventPopupWeekdays.style.display =
      eventPopupRecurrence.value === "weekly" ? "grid" : "none";
  });
  eventPopupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.user || !supabaseClient) return;
    if (!eventPopupTitleInput.value.trim()) return;
    if (!eventPopupCategory.value) return;

    const allDay = eventPopupAllDay.checked;
    if (!allDay && (!eventPopupStartTime.value || !eventPopupEndTime.value)) {
      return;
    }

    const recurrence = {
      freq: eventPopupRecurrence.value,
      interval: Math.max(1, Number(eventPopupInterval.value) || 1),
      byWeekday: getSelectedPopupWeekdays(),
      until: eventPopupUntil.value,
    };

    const payload = {
      title: eventPopupTitleInput.value.trim(),
      category_id: eventPopupCategory.value,
      all_day: allDay,
      start_date: eventPopupStartDate.value,
      end_date: eventPopupEndDate.value,
      start_time: allDay ? null : eventPopupStartTime.value,
      end_time: allDay ? null : eventPopupEndTime.value,
      time_zone: eventPopupTimeZone.value,
      recurrence,
      description: eventPopupDescription.value.trim() || null,
      updated_by: state.user.id,
    };

    if (popupMode === "create") {
      await supabaseClient.from("events").insert({
        ...payload,
        created_by: state.user.id,
      });
      await refreshData();
      closeEventPopup();
    } else {
      await supabaseClient
        .from("events")
        .update(payload)
        .eq("id", popupEventId);
      await refreshData();
      togglePopupEdit(false);
    }
  });

  monthRows.addEventListener("mousedown", handleCalendarMouseDown);
  monthRows.addEventListener("mousemove", handleCalendarMouseMove);
  window.addEventListener("mouseup", handleCalendarMouseUp);
}

function setupAuth() {
  if (!supabaseClient || !supabaseConfig.url || !supabaseConfig.anonKey) {
    userLabel.textContent = "Supabase not configured";
    signInBtn.disabled = true;
    signOutBtn.disabled = true;
    setFormsDisabled(true);
    renderAll();
    return;
  }

  signInBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    });
  });

  signOutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
  });

  supabaseClient.auth.getSession().then(({ data }) => {
    void handleSession(data.session);
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    void handleSession(session);
  });
}

async function handleSession(session) {
  if (!session?.user) {
    state.user = null;
    state.categories = [];
    state.events = [];
    state.profiles = new Map();
    setSignedOutUI();
    renderAll();
    return;
  }

  state.user = session.user;
  await upsertProfile(session.user);
  await refreshData();
  setSignedInUI(session.user);
}

async function refreshData() {
  await Promise.all([loadCategories(), loadEvents()]);
  state.filterCategoryIds = state.filterCategoryIds.filter((id) =>
    state.categories.some((category) => category.id === id)
  );
  await loadProfiles();
  renderAll();
}

async function loadCategories() {
  const { data, error } = await supabaseClient
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    state.categories = [];
    return;
  }
  state.categories = data || [];
}

async function loadEvents() {
  const { data, error } = await supabaseClient
    .from("events")
    .select("*")
    .order("start_date", { ascending: true });

  if (error) {
    state.events = [];
    return;
  }
  state.events = data || [];
}

async function loadProfiles() {
  const ids = new Set();
  state.events.forEach((event) => {
    if (event.created_by) ids.add(event.created_by);
    if (event.updated_by) ids.add(event.updated_by);
  });
  state.categories.forEach((category) => {
    if (category.created_by) ids.add(category.created_by);
  });
  if (state.user?.id) ids.add(state.user.id);

  if (ids.size === 0) {
    state.profiles = new Map();
    return;
  }

  const { data } = await supabaseClient
    .from("profiles")
    .select("id, full_name, email")
    .in("id", Array.from(ids));

  const map = new Map();
  (data || []).forEach((profile) => {
    map.set(profile.id, profile);
  });
  state.profiles = map;
}

async function upsertProfile(user) {
  const profile = {
    id: user.id,
    email: user.email,
    full_name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email,
    avatar_url: user.user_metadata?.avatar_url || "",
  };
  await supabaseClient.from("profiles").upsert(profile, { onConflict: "id" });
}

function resolveUserLabel(userId) {
  if (!userId) return "";
  const profile = state.profiles.get(userId);
  return profile?.full_name || profile?.email || "Unknown";
}

function updateFilterUI() {
  // No-op: show-all removed.
}

function openCategoryManager() {
  if (!state.user) return;
  renderCategoryManagerList();
  categoryManagerPopup.classList.add("open");
  categoryManagerPopup.setAttribute("aria-hidden", "false");
}

function closeCategoryManager() {
  categoryManagerPopup.classList.remove("open");
  categoryManagerPopup.setAttribute("aria-hidden", "true");
}

function renderCategoryManagerList() {
  categoryManagerList.innerHTML = "";
  const isDisabled = !state.user;
  state.categories.forEach((category) => {
    const row = document.createElement("div");
    row.className = "popup-category-item";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = category.name;
    nameInput.disabled = isDisabled;
    nameInput.addEventListener("change", async () => {
      if (!state.user || !supabaseClient) return;
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.value = category.name;
        return;
      }
      await supabaseClient
        .from("categories")
        .update({ name })
        .eq("id", category.id);
      await refreshData();
      renderCategoryManagerList();
    });

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = category.color || "#888888";
    colorInput.disabled = isDisabled;
    colorInput.addEventListener("change", async () => {
      if (!state.user || !supabaseClient) return;
      await supabaseClient
        .from("categories")
        .update({ color: colorInput.value })
        .eq("id", category.id);
      await refreshData();
      renderCategoryManagerList();
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.disabled = isDisabled;
    removeBtn.addEventListener("click", async () => {
      if (!state.user || !supabaseClient) return;
      await supabaseClient.from("categories").delete().eq("id", category.id);
      await refreshData();
      renderCategoryManagerList();
    });

    row.appendChild(nameInput);
    row.appendChild(colorInput);
    row.appendChild(removeBtn);
    categoryManagerList.appendChild(row);
  });
}

async function createCategoryFromManager() {
  if (!state.user || !supabaseClient) return;
  const name = categoryManagerName.value.trim();
  if (!name) return;
  await supabaseClient.from("categories").insert({
    name,
    color: categoryManagerColor.value,
    created_by: state.user.id,
  });
  categoryManagerName.value = "";
  await refreshData();
  renderCategoryManagerList();
}

function openEventPopup(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  popupEventId = eventId;
  popupMode = "view";
  const category = state.categories.find((c) => c.id === event.category_id);
  const range = formatEventRange(event, state.displayTimeZone);
  eventPopupTitle.textContent = event.title;
  eventPopupMeta.textContent = `${category?.name || "Uncategorized"} · ${range}`;
  eventPopupDesc.textContent = event.description || "No description";
  const historyBtn = document.createElement("button");
  const removeBtn = document.createElement("button");
  const actions = eventPopupView.querySelector(".event-popup-actions");
  actions.innerHTML = "";

  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.disabled = !state.user;
  editBtn.addEventListener("click", () => {
    if (!state.user) return;
    togglePopupEdit(true);
  });

  historyBtn.textContent = "History";
  historyBtn.disabled = !state.user;
  historyBtn.addEventListener("click", async () => {
    if (!state.user) return;
    await openHistoryDrawer(event);
  });

  removeBtn.textContent = "Remove";
  removeBtn.disabled = !state.user;
  removeBtn.addEventListener("click", async () => {
    if (!state.user || !supabaseClient) return;
    await supabaseClient.from("events").delete().eq("id", event.id);
    closeEventPopup();
    await refreshData();
  });

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.className = "ghost";
  closeBtn.addEventListener("click", closeEventPopup);

  eventPopup.classList.add("open");
  eventPopup.setAttribute("aria-hidden", "false");
  togglePopupEdit(false);
  fillPopupForm(event);
  actions.appendChild(editBtn);
  actions.appendChild(historyBtn);
  actions.appendChild(removeBtn);
  actions.appendChild(closeBtn);
}

function closeEventPopup() {
  eventPopup.classList.remove("open");
  eventPopup.setAttribute("aria-hidden", "true");
  popupEventId = null;
  popupMode = "view";
}

function togglePopupEdit(enabled) {
  if (enabled) {
    eventPopupView.classList.add("hidden");
    eventPopupForm.classList.add("active");
    eventPopupCancel.textContent = "Cancel";
  } else {
    eventPopupView.classList.remove("hidden");
    eventPopupForm.classList.remove("active");
    eventPopupCancel.textContent = "Cancel";
  }
}

function fillPopupForm(event) {
  eventPopupTitleInput.value = event.title;
  eventPopupCategory.value = event.category_id || "";
  eventPopupAllDay.checked = Boolean(event.all_day);
  eventPopupStartDate.value = event.start_date;
  eventPopupEndDate.value = event.end_date;
  eventPopupStartTime.value = event.start_time || "09:00";
  eventPopupEndTime.value = event.end_time || "10:00";
  eventPopupTimeZone.value = event.time_zone || state.displayTimeZone;
  eventPopupDescription.value = event.description || "";

  eventPopupRecurrence.value = event.recurrence?.freq || "none";
  eventPopupInterval.value = event.recurrence?.interval || 1;
  eventPopupUntil.value = event.recurrence?.until || "";
  eventPopupWeekdays
    .querySelectorAll("input")
    .forEach((input) => (input.checked = false));
  if (event.recurrence?.byWeekday?.length) {
    event.recurrence.byWeekday.forEach((day) => {
      const checkbox = eventPopupWeekdays.querySelector(
        `input[value="${day}"]`
      );
      if (checkbox) checkbox.checked = true;
    });
  }
  eventPopupWeekdays.style.display =
    eventPopupRecurrence.value === "weekly" ? "grid" : "none";
  togglePopupTimeInputs();
}

function togglePopupTimeInputs() {
  const disabled = eventPopupAllDay.checked;
  eventPopupStartTime.disabled = disabled;
  eventPopupEndTime.disabled = disabled;
}

function getSelectedPopupWeekdays() {
  return Array.from(
    eventPopupWeekdays.querySelectorAll("input:checked")
  ).map((el) => Number(el.value));
}

function openCreatePopup(startParts, endParts) {
  if (!state.user) return;
  popupEventId = null;
  popupMode = "create";
  eventPopup.classList.add("open");
  eventPopup.setAttribute("aria-hidden", "false");
  eventPopupView.classList.add("hidden");
  eventPopupForm.classList.add("active");

  eventPopupTitleInput.value = "";
  eventPopupCategory.value =
    state.categories[0]?.id || eventPopupCategory.value || "";
  eventPopupAllDay.checked = true;
  eventPopupStartDate.value = formatDateParts(startParts);
  eventPopupEndDate.value = formatDateParts(endParts);
  eventPopupStartTime.value = "09:00";
  eventPopupEndTime.value = "10:00";
  eventPopupTimeZone.value = state.displayTimeZone;
  eventPopupRecurrence.value = "none";
  eventPopupInterval.value = 1;
  eventPopupUntil.value = "";
  eventPopupWeekdays
    .querySelectorAll("input")
    .forEach((input) => (input.checked = false));
  eventPopupWeekdays.style.display = "none";
  eventPopupDescription.value = "";
  togglePopupTimeInputs();
}

let dragSelection = null;
let popupEventId = null;
let popupMode = "view";

function handleCalendarMouseDown(event) {
  const cell = event.target.closest(".day-cell");
  if (!cell || cell.classList.contains("out-month")) return;
  if (event.target.closest(".event-bar")) return;
  const parts = getCellDateParts(cell);
  if (!parts) return;

  dragSelection = {
    start: parts,
    end: parts,
  };
  updateDragHighlight();
}

function handleCalendarMouseMove(event) {
  if (!dragSelection) return;
  const cell = event.target.closest(".day-cell");
  if (!cell || cell.classList.contains("out-month")) return;
  const parts = getCellDateParts(cell);
  if (!parts) return;
  dragSelection.end = parts;
  updateDragHighlight();
}

function handleCalendarMouseUp() {
  if (!dragSelection) return;
  const { start, end } = dragSelection;
  const min = compareDateParts(start, end) <= 0 ? start : end;
  const max = compareDateParts(start, end) <= 0 ? end : start;
  dragSelection = null;
  clearDragHighlight();

  openCreatePopup(min, max);
}

function updateDragHighlight() {
  clearDragHighlight();
  if (!dragSelection) return;
  const { start, end } = dragSelection;
  const min = compareDateParts(start, end) <= 0 ? start : end;
  const max = compareDateParts(start, end) <= 0 ? end : start;
  monthRows.querySelectorAll(".day-cell").forEach((cell) => {
    const parts = getCellDateParts(cell);
    if (!parts) return;
    if (compareDateParts(parts, min) >= 0 && compareDateParts(parts, max) <= 0) {
      cell.classList.add("selecting");
    }
  });
}

function clearDragHighlight() {
  monthRows.querySelectorAll(".day-cell.selecting").forEach((cell) => {
    cell.classList.remove("selecting");
  });
}

function getCellDateParts(cell) {
  const month = Number(cell.dataset.month);
  const day = Number(cell.dataset.day);
  const year = state.year;
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

function setSignedOutUI() {
  userLabel.textContent = "Sign in to edit";
  signInBtn.disabled = false;
  signOutBtn.disabled = true;
  setFormsDisabled(true);
  userAvatar.textContent = "GU";
}

function setSignedInUI(user) {
  userLabel.textContent =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "Signed in";
  signInBtn.disabled = true;
  signOutBtn.disabled = false;
  setFormsDisabled(false);
  const label =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "User";
  const initials = label
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  userAvatar.textContent = initials || "U";
}

function setFormsDisabled(disabled) {
  eventPopupForm
    .querySelectorAll("input, select, button, textarea")
    .forEach((el) => {
      if (el === eventPopupCancel) return;
      el.disabled = disabled;
    });
  categoryEditBtn.disabled = disabled;
}

async function openHistoryDrawer(event) {
  if (!supabaseClient) return;
  historyTitle.textContent = event.title;
  historyBody.innerHTML = "Loading...";
  historyDrawer.classList.add("open");
  historyDrawer.setAttribute("aria-hidden", "false");

  const { data, error } = await supabaseClient
    .from("event_history")
    .select("*")
    .eq("event_id", event.id)
    .order("changed_at", { ascending: false });

  if (error) {
    historyBody.textContent = "Unable to load history.";
    return;
  }

  const ids = new Set();
  (data || []).forEach((item) => {
    if (item.changed_by) ids.add(item.changed_by);
  });
  if (ids.size) {
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", Array.from(ids));
    (profiles || []).forEach((profile) => {
      state.profiles.set(profile.id, profile);
    });
  }

  historyBody.innerHTML = "";
  if (!data || data.length === 0) {
    historyBody.textContent = "No changes recorded yet.";
    adjustHistoryPanelSize();
    return;
  }

  data.forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-item";

    const action = document.createElement("div");
    action.textContent = item.action;

    const who = resolveUserLabel(item.changed_by);
    const when = item.changed_at
      ? new Date(item.changed_at).toLocaleString()
      : "";
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${who || "Unknown"} · ${when}`;

    const snapshot = document.createElement("div");
    snapshot.className = "meta";
    snapshot.textContent = summarizeSnapshot(item.snapshot);

    row.appendChild(action);
    row.appendChild(meta);
    if (snapshot.textContent) {
      row.appendChild(snapshot);
    }
    historyBody.appendChild(row);
  });

  adjustHistoryPanelSize();
}

function closeHistoryDrawer() {
  historyDrawer.classList.remove("open");
  historyDrawer.setAttribute("aria-hidden", "true");
}

function adjustHistoryPanelSize() {
  requestAnimationFrame(() => {
    const header = historyPanel.querySelector(".history-header");
    const headerHeight = header ? header.offsetHeight : 0;
    const bodyHeight = historyBody.scrollHeight;
    const target = headerHeight + bodyHeight + 36;
    const max = Math.min(window.innerHeight * 0.85, target);
    const height = Math.max(180, max);
    historyPanel.style.height = `${height}px`;
    historyPanel.style.maxHeight = `${height}px`;
    const bodyMax = height - headerHeight - 36;
    historyBody.style.maxHeight = `${Math.max(120, bodyMax)}px`;
  });
}

function summarizeSnapshot(snapshot) {
  if (!snapshot) return "";
  const title = snapshot.title ? `Title: ${snapshot.title}` : "";
  const dates =
    snapshot.start_date && snapshot.end_date
      ? `Dates: ${snapshot.start_date} → ${snapshot.end_date}`
      : "";
  const description = snapshot.description
    ? `Desc: ${String(snapshot.description).slice(0, 120)}`
    : "";
  return [title, dates, description].filter(Boolean).join(" · ");
}

function syncFormDefaults() {
  yearInput.value = state.year;
  yearTitle.textContent = state.year;
  displayTimeZone.value = state.displayTimeZone;
}

function toggleTimeInputs() {
  const disabled = eventAllDay.checked;
  eventStartTime.disabled = disabled;
  eventEndTime.disabled = disabled;
}

function renderAll() {
  yearTitle.textContent = `Annual Calendar - ${state.year}`;
  renderCategoryPills();
  renderEventFormOptions();
  renderCalendar();
  updateFilterUI();
}

function renderEventFormOptions() {
  eventPopupCategory.innerHTML = "";
  if (state.categories.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Add a category first";
    option.disabled = true;
    option.selected = true;
    eventPopupCategory.appendChild(option);
    renderPopupCategoryManager();
    return;
  }
  state.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    eventPopupCategory.appendChild(option);
  });
}


function renderCategoryPills() {
  categoryPills.innerHTML = "";
  if (!state.user) return;
  state.categories.forEach((category) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "category-pill";
    pill.textContent = category.name;
    const isActive =
      state.filterCategoryIds.length === 0 ||
      state.filterCategoryIds.includes(category.id);
    if (isActive) {
      pill.classList.add("active");
      pill.style.background = category.color;
    }
    pill.style.borderColor = category.color;
    pill.addEventListener("click", () => {
      if (state.filterCategoryIds.length === 0) {
        state.filterCategoryIds = state.categories.map((c) => c.id);
      }
      if (state.filterCategoryIds.includes(category.id)) {
        state.filterCategoryIds = state.filterCategoryIds.filter(
          (id) => id !== category.id
        );
      } else {
        state.filterCategoryIds = [...state.filterCategoryIds, category.id];
      }
      renderAll();
      saveSettings();
    });
    categoryPills.appendChild(pill);
  });
}

function renderCalendar() {
  const displayTZ = state.displayTimeZone;
  const year = state.year;
  const dayCount = 31;
  document.documentElement.style.setProperty("--day-count", dayCount);

  weekdayRow.innerHTML = "";
  monthRows.innerHTML = "";

  const segmentsByMonth = buildEventSegments(year, displayTZ);
  const todayParts = getDatePartsInTimeZone(new Date(), displayTZ);
  const todayKey = formatDateParts(todayParts);

  for (let month = 0; month < 12; month += 1) {
    const row = document.createElement("div");
    row.className = "month-row";

    const label = document.createElement("div");
    label.className = "month-label";
    label.textContent = monthNames[month].slice(0, 3);

    const grid = document.createElement("div");
    grid.className = "month-grid";

    for (let i = 1; i <= dayCount; i += 1) {
      const cell = document.createElement("div");
      cell.className = "day-cell";
      cell.dataset.month = String(month);
      cell.dataset.day = String(i);

      if (i <= daysInMonth(year, month)) {
        const dateUTC = zonedTimeToUtc(
          `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(
            2,
            "0"
          )}T12:00`,
          displayTZ
        );
        const parts = getDatePartsInTimeZone(dateUTC, displayTZ);
        if (parts.weekday === 0 || parts.weekday === 6) {
          cell.classList.add("weekend");
        }
        const currentParts = { year, month, day: i };
        if (compareDateParts(currentParts, todayParts) < 0) {
          cell.classList.add("past-day");
        }
        if (formatDateParts(currentParts) === todayKey) {
          cell.classList.add("today");
        }
        const number = document.createElement("div");
        number.className = "day-number";
        const weekdayLabel = weekdayNames[parts.weekday].slice(0, 2).toUpperCase();
        number.innerHTML = `${i} <span class="weekday-mini">${weekdayLabel}</span>`;
        cell.appendChild(number);
      } else {
        cell.classList.add("out-month");
      }

      grid.appendChild(cell);
    }

    const eventLayer = document.createElement("div");
    eventLayer.className = "event-layer";
    grid.appendChild(eventLayer);

    row.appendChild(label);
    row.appendChild(grid);
    monthRows.appendChild(row);

    renderEventBarsForMonth(
      eventLayer,
      segmentsByMonth.get(month) || [],
      dayCount
    );
  }
}

function renderEventBarsForMonth(container, segments, dayCount) {
  const gridWidth = container.parentElement.getBoundingClientRect().width;
  const dayWidth = gridWidth / dayCount;
  const barHeight = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--bar-height")
  );
  const barGap = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--bar-gap")
  );
  const tracks = [];

  const sorted = segments.slice().sort((a, b) => {
    if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
    return a.endIndex - b.endIndex;
  });

  sorted.forEach((segment) => {
    let trackIndex = 0;
    while (trackIndex < tracks.length) {
      if (tracks[trackIndex] < segment.startIndex) break;
      trackIndex += 1;
    }

    tracks[trackIndex] = segment.endIndex;

    const bar = document.createElement("div");
    bar.className = "event-bar";
    if (!segment.allDay) {
      bar.classList.add("timed");
    }
    bar.style.left = `${segment.startIndex * dayWidth}px`;
    bar.style.width = `${Math.max(
      1,
      segment.endIndex - segment.startIndex + 1
    ) * dayWidth - 4}px`;
    bar.style.top = `${trackIndex * (barHeight + barGap)}px`;
    bar.style.background = segment.color;
    bar.textContent = segment.title;
    bar.dataset.eventId = segment.eventId;
    bar.addEventListener("click", (event) => {
      event.stopPropagation();
      openEventPopup(segment.eventId);
    });

    if (!segment.allDay) {
      const time = document.createElement("span");
      time.className = "time";
      time.textContent = segment.timeLabel;
      bar.appendChild(time);
    }

    container.appendChild(bar);
  });

  const maxTracks = Math.max(1, tracks.length);
  const rowHeight = 34 + maxTracks * (barHeight + barGap);
  container.parentElement.style.setProperty(
    "--row-height",
    `${rowHeight}px`
  );
}

function buildEventSegments(year, displayTZ) {
  const segmentsByMonth = new Map();
  const visibleCategories =
    state.filterCategoryIds.length > 0
      ? new Set(state.filterCategoryIds)
      : new Set(state.categories.map((c) => c.id));
  const dayCount = 31;

  const occurrences = state.events
    .filter((event) => visibleCategories.has(event.category_id))
    .flatMap((event) =>
      buildOccurrencesForYear(event, year, displayTZ).map((occ) => ({
        ...occ,
        event,
      }))
    );

  occurrences.forEach(({ event, startUTC, endUTC }) => {
    const category = state.categories.find((c) => c.id === event.category_id);
    const endForDisplay = new Date(endUTC.getTime() - 1);

    let startParts = getDatePartsInTimeZone(startUTC, displayTZ);
    let endParts = getDatePartsInTimeZone(endForDisplay, displayTZ);

    if (startParts.year < year) {
      startParts = { year, month: 0, day: 1, weekday: startParts.weekday };
    }
    if (endParts.year > year) {
      endParts = {
        year,
        month: 11,
        day: daysInMonth(year, 11),
        weekday: endParts.weekday,
      };
    }

    const timeLabel = event.all_day
      ? ""
      : formatTimeRange(event, startUTC, endUTC, displayTZ);

    for (let month = 0; month < 12; month += 1) {
      const maxDay = daysInMonth(year, month);
      const occursBefore = month < startParts.month;
      const occursAfter = month > endParts.month;
      if (occursBefore || occursAfter) continue;

      const segmentStartDay =
        month === startParts.month ? startParts.day : 1;
      const segmentEndDay =
        month === endParts.month ? endParts.day : maxDay;
      if (segmentEndDay < segmentStartDay) continue;

      const segmentStart = Math.max(1, segmentStartDay);
      const segmentEnd = Math.min(maxDay, segmentEndDay);
      const segmentStartIndex = segmentStart - 1;
      const segmentEndIndex = segmentEnd - 1;

    const segment = {
      title: event.title,
      color: category?.color || "#999",
      allDay: event.all_day,
      timeLabel,
      eventId: event.id,
      startIndex: segmentStartIndex,
      endIndex: segmentEndIndex,
    };

      if (!segmentsByMonth.has(month)) {
        segmentsByMonth.set(month, []);
      }
      segmentsByMonth.get(month).push(segment);
    }
  });

  return segmentsByMonth;
}

function buildOccurrencesForYear(event, year, displayTZ) {
  const occurrences = [];
  const recurrence = event.recurrence || { freq: "none", interval: 1 };
  const untilDate = recurrence.until ? parseDateOnly(recurrence.until) : null;

  const startDateParts = parseDateOnly(event.start_date);
  const endDateParts = parseDateOnly(event.end_date);

  const eventStartUTC = event.all_day
    ? zonedTimeToUtc(`${event.start_date}T00:00`, event.time_zone)
    : zonedTimeToUtc(
        `${event.start_date}T${event.start_time}`,
        event.time_zone
      );

  const eventEndUTC = event.all_day
    ? zonedTimeToUtc(
        `${addDaysToDateString(event.end_date, 1)}T00:00`,
        event.time_zone
      )
    : zonedTimeToUtc(`${event.end_date}T${event.end_time}`, event.time_zone);

  const eventDuration = eventEndUTC.getTime() - eventStartUTC.getTime();
  const yearStartUTC = getYearStartUTC(year, displayTZ);
  const yearEndUTC = new Date(yearStartUTC.getTime() + daysInYear(year) * MS_PER_DAY);

  if (recurrence.freq === "none") {
    if (eventEndUTC > yearStartUTC && eventStartUTC < yearEndUTC) {
      occurrences.push({ startUTC: eventStartUTC, endUTC: eventEndUTC });
    }
    return occurrences;
  }

  const interval = Math.max(1, Number(recurrence.interval) || 1);
  const startLocal = { ...startDateParts };
  const startTime = event.all_day ? "00:00" : event.start_time;

  if (recurrence.freq === "daily") {
    let cursor = { ...startLocal };
    while (true) {
      if (untilDate && compareDateParts(cursor, untilDate) > 0) break;
      const startUTC = zonedTimeToUtc(
        `${formatDateParts(cursor)}T${startTime}`,
        event.time_zone
      );
      const endUTC = new Date(startUTC.getTime() + eventDuration);
      if (endUTC > yearStartUTC && startUTC < yearEndUTC) {
        occurrences.push({ startUTC, endUTC });
      }
      cursor = addDaysToDateParts(cursor, interval);
      if (cursor.year > year + 1) break;
    }
  }

  if (recurrence.freq === "weekly") {
    const byWeekday = recurrence.byWeekday?.length
      ? recurrence.byWeekday
      : [getWeekdayFromDateParts(startLocal)];
    let weekStart = startOfWeek(startLocal);
    while (true) {
      if (untilDate && compareDateParts(weekStart, untilDate) > 0) break;
      byWeekday.forEach((weekday) => {
        const candidate = addDaysToDateParts(weekStart, weekday);
        if (compareDateParts(candidate, startLocal) < 0) return;
        if (untilDate && compareDateParts(candidate, untilDate) > 0) return;
        const startUTC = zonedTimeToUtc(
          `${formatDateParts(candidate)}T${startTime}`,
          event.time_zone
        );
        const endUTC = new Date(startUTC.getTime() + eventDuration);
        if (endUTC > yearStartUTC && startUTC < yearEndUTC) {
          occurrences.push({ startUTC, endUTC });
        }
      });
      weekStart = addDaysToDateParts(weekStart, interval * 7);
      if (weekStart.year > year + 1) break;
    }
  }

  if (recurrence.freq === "monthly") {
    let cursor = { ...startLocal };
    while (true) {
      if (untilDate && compareDateParts(cursor, untilDate) > 0) break;
      const candidate = setDateInMonth(cursor, startLocal.day);
      if (candidate) {
        const startUTC = zonedTimeToUtc(
          `${formatDateParts(candidate)}T${startTime}`,
          event.time_zone
        );
        const endUTC = new Date(startUTC.getTime() + eventDuration);
        if (endUTC > yearStartUTC && startUTC < yearEndUTC) {
          occurrences.push({ startUTC, endUTC });
        }
      }
      cursor = addMonthsToDateParts(cursor, interval);
      if (cursor.year > year + 1) break;
    }
  }

  if (recurrence.freq === "yearly") {
    let cursor = { ...startLocal };
    while (true) {
      if (untilDate && compareDateParts(cursor, untilDate) > 0) break;
      const startUTC = zonedTimeToUtc(
        `${formatDateParts(cursor)}T${startTime}`,
        event.time_zone
      );
      const endUTC = new Date(startUTC.getTime() + eventDuration);
      if (endUTC > yearStartUTC && startUTC < yearEndUTC) {
        occurrences.push({ startUTC, endUTC });
      }
      cursor = { ...cursor, year: cursor.year + interval };
      if (cursor.year > year + 1) break;
    }
  }

  return occurrences;
}

function formatEventRange(event, displayTZ) {
  const startUTC = event.all_day
    ? zonedTimeToUtc(`${event.start_date}T00:00`, event.time_zone)
    : zonedTimeToUtc(
        `${event.start_date}T${event.start_time}`,
        event.time_zone
      );
  const endUTC = event.all_day
    ? zonedTimeToUtc(
        `${addDaysToDateString(event.end_date, 1)}T00:00`,
        event.time_zone
      )
    : zonedTimeToUtc(`${event.end_date}T${event.end_time}`, event.time_zone);

  const startParts = getDatePartsInTimeZone(startUTC, displayTZ);
  const endParts = getDatePartsInTimeZone(new Date(endUTC.getTime() - 1), displayTZ);

  const startLabel = `${monthNames[startParts.month].slice(0, 3)} ${startParts.day}`;
  const endLabel = `${monthNames[endParts.month].slice(0, 3)} ${endParts.day}`;

  return event.all_day
    ? `${startLabel} - ${endLabel}`
    : `${startLabel} · ${event.start_time}`;
}

function formatTimeRange(event, startUTC, endUTC, displayTZ) {
  const startParts = getTimePartsInTimeZone(startUTC, displayTZ);
  const endParts = getTimePartsInTimeZone(endUTC, displayTZ);
  return `${startParts.hour}:${startParts.minute}–${endParts.hour}:${endParts.minute}`;
}

function parseDateOnly(value) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month: month - 1, day };
}

function formatDateParts({ year, month, day }) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

function addDaysToDateString(dateString, days) {
  const parts = parseDateOnly(dateString);
  const next = addDaysToDateParts(parts, days);
  return formatDateParts(next);
}

function addDaysToDateParts(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day));
  const next = new Date(date.getTime() + days * MS_PER_DAY);
  return { year: next.getUTCFullYear(), month: next.getUTCMonth(), day: next.getUTCDate() };
}

function addMonthsToDateParts(parts, months) {
  const date = new Date(Date.UTC(parts.year, parts.month, 1));
  date.setUTCMonth(date.getUTCMonth() + months);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: parts.day };
}

function setDateInMonth(parts, day) {
  const max = daysInMonth(parts.year, parts.month);
  if (day > max) return null;
  return { year: parts.year, month: parts.month, day };
}

function compareDateParts(a, b) {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

function startOfWeek(parts) {
  const weekday = getWeekdayFromDateParts(parts);
  return addDaysToDateParts(parts, -((weekday + 6) % 7));
}

function getWeekdayFromDateParts(parts) {
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day));
  return date.getUTCDay();
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function daysInYear(year) {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return Math.round((end - start) / MS_PER_DAY);
}

function clampYear(value) {
  if (!value || Number.isNaN(value)) return new Date().getFullYear();
  return Math.min(2100, Math.max(1970, value));
}

function loadSettings() {
  const localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const defaults = {
    year: new Date().getFullYear(),
    displayTimeZone: localTZ,
    hiddenCategoryIds: [],
    filterCategoryIds: [],
    categories: [],
    events: [],
    user: null,
    profiles: new Map(),
  };

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
      categories: [],
      events: [],
      user: null,
      profiles: new Map(),
    };
  } catch (error) {
    return defaults;
  }
}

function saveSettings() {
  try {
    const payload = {
      year: state.year,
      displayTimeZone: state.displayTimeZone,
      hiddenCategoryIds: state.hiddenCategoryIds,
      filterCategoryIds: state.filterCategoryIds,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  } catch (error) {
    // Ignore persistence failures (e.g., file:// localStorage restrictions).
  }
}

function getDatePartsInTimeZone(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = dtf.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekdayIndex = weekdayNames.indexOf(get("weekday"));

  return {
    year: Number(get("year")),
    month: Number(get("month")) - 1,
    day: Number(get("day")),
    weekday: weekdayIndex,
  };
}

function getTimePartsInTimeZone(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return { hour: get("hour"), minute: get("minute") };
}

function getYearStartUTC(year, timeZone) {
  return zonedTimeToUtc(`${year}-01-01T00:00`, timeZone);
}

function zonedTimeToUtc(dateTimeLocal, timeZone) {
  const [datePart, timePart] = dateTimeLocal.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart || "00:00").split(":").map(Number);

  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(utcDate);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );

  const offset = asUTC - utcDate.getTime();
  return new Date(utcDate.getTime() - offset);
}

const SETTINGS_KEY = "annualCalendarSettings.v1";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const yearInput = document.getElementById("yearInput");
const yearTitle = document.getElementById("yearTitle");
const weekdayRow = document.getElementById("weekdayRow");
const monthRows = document.getElementById("monthRows");
const categoryList = document.getElementById("categoryList");
const categoryForm = document.getElementById("categoryForm");
const categoryName = document.getElementById("categoryName");
const categoryColor = document.getElementById("categoryColor");
const eventForm = document.getElementById("eventForm");
const eventTitle = document.getElementById("eventTitle");
const eventCategory = document.getElementById("eventCategory");
const eventAllDay = document.getElementById("eventAllDay");
const eventStartDate = document.getElementById("eventStartDate");
const eventStartTime = document.getElementById("eventStartTime");
const eventEndDate = document.getElementById("eventEndDate");
const eventEndTime = document.getElementById("eventEndTime");
const eventTimeZone = document.getElementById("eventTimeZone");
const eventRecurrence = document.getElementById("eventRecurrence");
const eventInterval = document.getElementById("eventInterval");
const eventUntil = document.getElementById("eventUntil");
const weekdayPicker = document.getElementById("weekdayPicker");
const eventList = document.getElementById("eventList");
const displayTimeZone = document.getElementById("displayTimeZone");
const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const userLabel = document.getElementById("userLabel");
const historyDrawer = document.getElementById("historyDrawer");
const historyTitle = document.getElementById("historyTitle");
const historyBody = document.getElementById("historyBody");
const historyClose = document.getElementById("historyClose");
const clearFilterBtn = document.getElementById("clearFilterBtn");
const eventSubmitBtn = document.getElementById("eventSubmitBtn");
const eventCancelBtn = document.getElementById("eventCancelBtn");

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
  eventTimeZone.innerHTML = "";

  tzList.forEach((tz) => {
    const option = document.createElement("option");
    option.value = tz;
    option.textContent = tz;
    displayTimeZone.appendChild(option.cloneNode(true));
    eventTimeZone.appendChild(option);
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

  categoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = categoryName.value.trim();
    if (!name) return;
    if (!state.user || !supabaseClient) return;
    await supabaseClient.from("categories").insert({
      name,
      color: categoryColor.value,
      created_by: state.user.id,
    });
    categoryName.value = "";
    await refreshData();
  });

  eventAllDay.addEventListener("change", () => {
    toggleTimeInputs();
  });

  eventRecurrence.addEventListener("change", () => {
    weekdayPicker.style.display =
      eventRecurrence.value === "weekly" ? "grid" : "none";
  });

  eventForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!eventTitle.value.trim()) return;
    if (!eventCategory.value) return;
    if (!state.user || !supabaseClient) return;

    const allDay = eventAllDay.checked;
    const startDate = eventStartDate.value;
    const endDate = eventEndDate.value;

    if (!startDate || !endDate) return;
    if (!allDay && (!eventStartTime.value || !eventEndTime.value)) return;

    const recurrence = {
      freq: eventRecurrence.value,
      interval: Math.max(1, Number(eventInterval.value) || 1),
      byWeekday: getSelectedWeekdays(),
      until: eventUntil.value,
    };

    const payload = {
      title: eventTitle.value.trim(),
      category_id: eventCategory.value,
      all_day: allDay,
      start_date: startDate,
      end_date: endDate,
      start_time: allDay ? null : eventStartTime.value,
      end_time: allDay ? null : eventEndTime.value,
      time_zone: eventTimeZone.value,
      recurrence,
      updated_by: state.user.id,
    };

    if (state.editingEventId) {
      await supabaseClient
        .from("events")
        .update(payload)
        .eq("id", state.editingEventId);
    } else {
      await supabaseClient.from("events").insert({
        ...payload,
        created_by: state.user.id,
      });
    }

    eventForm.reset();
    eventAllDay.checked = true;
    toggleTimeInputs();
    syncFormDefaults();
    clearEditingState();
    await refreshData();
  });

  eventCancelBtn.addEventListener("click", () => {
    clearEditingState();
    syncFormDefaults();
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

  clearFilterBtn.addEventListener("click", () => {
    state.filterCategoryIds = [];
    renderAll();
    saveSettings();
  });
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

function loadEventIntoForm(event) {
  state.editingEventId = event.id;
  eventTitle.value = event.title;
  eventCategory.value = event.category_id || "";
  eventAllDay.checked = Boolean(event.all_day);
  eventStartDate.value = event.start_date;
  eventEndDate.value = event.end_date;
  eventStartTime.value = event.start_time || "09:00";
  eventEndTime.value = event.end_time || "10:00";
  eventTimeZone.value = event.time_zone || state.displayTimeZone;

  eventRecurrence.value = event.recurrence?.freq || "none";
  eventInterval.value = event.recurrence?.interval || 1;
  eventUntil.value = event.recurrence?.until || "";
  weekdayPicker
    .querySelectorAll("input")
    .forEach((input) => (input.checked = false));
  if (event.recurrence?.byWeekday?.length) {
    event.recurrence.byWeekday.forEach((day) => {
      const checkbox = weekdayPicker.querySelector(`input[value="${day}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }

  weekdayPicker.style.display =
    eventRecurrence.value === "weekly" ? "grid" : "none";
  toggleTimeInputs();
  updateEventFormMode();
}

function clearEditingState() {
  state.editingEventId = null;
  updateEventFormMode();
}

function updateEventFormMode() {
  if (state.editingEventId) {
    eventSubmitBtn.textContent = "Save Changes";
    eventCancelBtn.disabled = false;
  } else {
    eventSubmitBtn.textContent = "Add Event";
    eventCancelBtn.disabled = true;
  }
}

function updateFilterUI() {
  clearFilterBtn.disabled =
    state.filterCategoryIds.length === 0 || !state.user;
}

function setSignedOutUI() {
  userLabel.textContent = "Sign in to edit";
  signInBtn.disabled = false;
  signOutBtn.disabled = true;
  setFormsDisabled(true);
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
}

function setFormsDisabled(disabled) {
  const forms = [categoryForm, eventForm];
  forms.forEach((form) => {
    form.querySelectorAll("input, select, button, textarea").forEach((el) => {
      el.disabled = disabled;
    });
  });
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
}

function closeHistoryDrawer() {
  historyDrawer.classList.remove("open");
  historyDrawer.setAttribute("aria-hidden", "true");
}

function summarizeSnapshot(snapshot) {
  if (!snapshot) return "";
  const title = snapshot.title ? `Title: ${snapshot.title}` : "";
  const dates =
    snapshot.start_date && snapshot.end_date
      ? `Dates: ${snapshot.start_date} → ${snapshot.end_date}`
      : "";
  return [title, dates].filter(Boolean).join(" · ");
}

function syncFormDefaults() {
  yearInput.value = state.year;
  yearTitle.textContent = state.year;
  displayTimeZone.value = state.displayTimeZone;
  eventTimeZone.value = state.displayTimeZone;

  const today = new Date();
  const dateString = today.toISOString().slice(0, 10);
  eventStartDate.value = dateString;
  eventEndDate.value = dateString;
  eventStartTime.value = "09:00";
  eventEndTime.value = "10:00";
  weekdayPicker.style.display =
    eventRecurrence.value === "weekly" ? "grid" : "none";
  toggleTimeInputs();
  updateEventFormMode();
}

function toggleTimeInputs() {
  const disabled = eventAllDay.checked;
  eventStartTime.disabled = disabled;
  eventEndTime.disabled = disabled;
}

function renderAll() {
  yearTitle.textContent = state.year;
  renderCategories();
  renderEventFormOptions();
  renderEventsList();
  renderCalendar();
  updateFilterUI();
}

function renderCategories() {
  categoryList.innerHTML = "";
  const isDisabled = !state.user;
  state.categories.forEach((category) => {
    const row = document.createElement("div");
    row.className = "category-item";

    const left = document.createElement("div");
    left.className = "category-left";

    const swatch = document.createElement("span");
    swatch.className = "category-swatch";
    swatch.style.background = category.color;

    const label = document.createElement("span");
    label.textContent = category.name;

    left.appendChild(swatch);
    left.appendChild(label);

    const controls = document.createElement("div");
    controls.className = "category-controls";

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
    });

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = state.filterCategoryIds.includes(category.id);
    toggle.disabled = isDisabled;
    toggle.addEventListener("change", () => {
      if (toggle.checked) {
        state.filterCategoryIds = [...state.filterCategoryIds, category.id];
      } else {
        state.filterCategoryIds = state.filterCategoryIds.filter(
          (id) => id !== category.id
        );
      }
      renderAll();
      saveSettings();
    });

    controls.appendChild(colorInput);
    controls.appendChild(toggle);

    row.appendChild(left);
    row.appendChild(controls);
    categoryList.appendChild(row);
  });
}

function renderEventFormOptions() {
  eventCategory.innerHTML = "";
  if (state.categories.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Add a category first";
    option.disabled = true;
    option.selected = true;
    eventCategory.appendChild(option);
    return;
  }
  state.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    eventCategory.appendChild(option);
  });
}

function renderEventsList() {
  eventList.innerHTML = "";
  const displayTZ = state.displayTimeZone;
  const isDisabled = !state.user;
  state.events.forEach((event) => {
    const category = state.categories.find((c) => c.id === event.category_id);
    const card = document.createElement("div");
    card.className = "event-item";
    card.style.borderLeft = `4px solid ${category?.color || "#999"}`;

    const title = document.createElement("div");
    title.textContent = event.title;

    const meta = document.createElement("div");
    meta.className = "event-meta";
    const range = formatEventRange(event, displayTZ);
    const createdBy = resolveUserLabel(event.created_by);
    const createdAt = event.created_at
      ? new Date(event.created_at).toLocaleDateString()
      : "";
    const updatedBy = resolveUserLabel(event.updated_by);
    const updatedAt = event.updated_at
      ? new Date(event.updated_at).toLocaleDateString()
      : "";
    const createdLabel = createdBy
      ? `Created by ${createdBy}${createdAt ? ` (${createdAt})` : ""}`
      : "Created";
    const editedLabel =
      updatedBy && (updatedBy !== createdBy || updatedAt !== createdAt)
        ? ` · Edited by ${updatedBy}${updatedAt ? ` (${updatedAt})` : ""}`
        : "";
    meta.textContent = `${category?.name || "Uncategorized"} · ${range} · ${createdLabel}${editedLabel}`;

    const remove = document.createElement("button");
    remove.textContent = "Remove";
    remove.style.marginTop = "6px";
    remove.disabled = isDisabled;
    remove.addEventListener("click", async () => {
      if (!state.user || !supabaseClient) return;
      await supabaseClient.from("events").delete().eq("id", event.id);
      await refreshData();
    });

    const historyBtn = document.createElement("button");
    historyBtn.textContent = "History";
    historyBtn.disabled = isDisabled;
    historyBtn.addEventListener("click", async () => {
      await openHistoryDrawer(event);
    });

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.disabled = isDisabled;
    editBtn.addEventListener("click", () => {
      loadEventIntoForm(event);
    });

    const actions = document.createElement("div");
    actions.className = "event-actions";
    actions.appendChild(editBtn);
    actions.appendChild(historyBtn);
    actions.appendChild(remove);

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(actions);
    eventList.appendChild(card);
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
        if (compareDateParts({ year, month, day: i }, todayParts) < 0) {
          cell.classList.add("past-day");
        }
        const number = document.createElement("div");
        number.className = "day-number";
        number.textContent = i;
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

function getSelectedWeekdays() {
  return Array.from(weekdayPicker.querySelectorAll("input:checked")).map((el) =>
    Number(el.value)
  );
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
    editingEventId: null,
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

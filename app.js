const SETTINGS_KEY = "annualCalendarSettings.v1";
const INVITE_TOKEN_KEY = "annualCalendarInviteToken";
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
const categoryToggleAll = document.getElementById("categoryToggleAll");
const categoryFilterBtnMobile = document.getElementById("categoryFilterBtnMobile");
const categoryFilterPopup = document.getElementById("categoryFilterPopup");
const categoryFilterList = document.getElementById("categoryFilterList");
const categoryFilterEdit = document.getElementById("categoryFilterEdit");
const categoryFilterClose = document.getElementById("categoryFilterClose");
const categoryFilterToggleAll = document.getElementById("categoryFilterToggleAll");
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
const openCalendarPickerBtn = document.getElementById("openCalendarPicker");
const calendarNameInput = document.getElementById("calendarNameInput");
const defaultCalendarToggle = document.getElementById("defaultCalendarToggle");
const saveCalendarSettings = document.getElementById("saveCalendarSettings");
const sharedWithList = document.getElementById("sharedWithList");
const viewOnlyBanner = document.getElementById("viewOnlyBanner");
const deleteCalendarBtn = document.getElementById("deleteCalendarBtn");
const addEventBtn = document.getElementById("addEventBtn");
const shareBtn = document.getElementById("shareBtn");
const sharePopup = document.getElementById("sharePopup");
const shareRole = document.getElementById("shareRole");
const shareSend = document.getElementById("shareSend");
const shareClose = document.getElementById("shareClose");
const userBtn = document.getElementById("userBtn");
const userDrawer = document.getElementById("userDrawer");
const userClose = document.getElementById("userClose");
const userAvatar = document.getElementById("userAvatar");
const authGate = document.getElementById("authGate");
const gateSignIn = document.getElementById("gateSignIn");
const calendarPicker = document.getElementById("calendarPicker");
const calendarList = document.getElementById("calendarList");
const newCalendarName = document.getElementById("newCalendarName");
const createCalendarBtn = document.getElementById("createCalendarBtn");

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

const CATEGORY_COLORS = [
  "#c97b84",
  "#6d8fb4",
  "#6fa78a",
  "#b58bc1",
  "#d2a35c",
  "#d37b5b",
  "#7f9dbd",
  "#9b9b9b",
  "#b7836f",
  "#8f7cc5",
  "#8aa87c",
  "#c09d7b",
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
  stashInviteFromUrl();
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

  let resizeRaf = null;
  window.addEventListener("resize", () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      renderCalendar();
      resizeRaf = null;
    });
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
    updateSettingsUI();
    settingsPopup.classList.add("open");
    settingsPopup.setAttribute("aria-hidden", "false");
  });
  addEventBtn.addEventListener("click", () => {
    if (isReadOnly()) return;
    const today = getDatePartsInTimeZone(new Date(), state.displayTimeZone);
    openCreatePopup(
      { year: today.year, month: today.month, day: today.day },
      { year: today.year, month: today.month, day: today.day }
    );
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
  openCalendarPickerBtn.addEventListener("click", () => {
    settingsPopup.classList.remove("open");
    settingsPopup.setAttribute("aria-hidden", "true");
    state.showCalendarPicker = true;
    calendarPicker.classList.remove("hidden");
  });
  saveCalendarSettings.addEventListener("click", async () => {
    await saveCalendarSettingsForActive();
  });
  deleteCalendarBtn.addEventListener("click", async () => {
    await deleteActiveCalendar();
  });
  shareBtn.addEventListener("click", () => {
    if (!state.activeCalendarId) return;
    sharePopup.classList.add("open");
    sharePopup.setAttribute("aria-hidden", "false");
  });
  shareClose.addEventListener("click", () => {
    sharePopup.classList.remove("open");
    sharePopup.setAttribute("aria-hidden", "true");
  });
  sharePopup.addEventListener("click", (event) => {
    if (event.target === sharePopup) {
      sharePopup.classList.remove("open");
      sharePopup.setAttribute("aria-hidden", "true");
    }
  });
  shareSend.addEventListener("click", async () => {
    if (!state.user || !supabaseClient) return;
    if (!state.activeCalendarId) return;
    if (!canShareCalendar()) return;
    const role = shareRole.value;
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error: insertError } = await supabaseClient
      .from("calendar_invites")
      .insert({
        calendar_id: state.activeCalendarId,
        role,
        token,
        invited_by: state.user.id,
      });
    if (insertError) {
      alert("Invite failed. Please check invite policies.");
      return;
    }
    const inviteUrl = `${window.location.origin}?invite=${token}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteUrl);
      alert("Invite link copied to clipboard.");
    } else {
      alert(`Invite link: ${inviteUrl}`);
    }
    sharePopup.classList.remove("open");
    sharePopup.setAttribute("aria-hidden", "true");
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
  gateSignIn.addEventListener("click", async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    });
  });
  createCalendarBtn.addEventListener("click", async () => {
    await createCalendarFromPicker();
  });
  categoryEditBtn.addEventListener("click", () => {
    openCategoryManager();
  });
  categoryToggleAll.addEventListener("click", () => {
    if (isAllCategoriesSelected()) {
      state.filterCategoryIds = ["__none__"];
    } else {
      state.filterCategoryIds = [];
    }
    renderAll();
    saveSettings();
  });
  categoryFilterBtnMobile.addEventListener("click", () => {
    categoryFilterPopup.classList.add("open");
    categoryFilterPopup.setAttribute("aria-hidden", "false");
  });
  categoryFilterClose.addEventListener("click", () => {
    categoryFilterPopup.classList.remove("open");
    categoryFilterPopup.setAttribute("aria-hidden", "true");
  });
  categoryFilterPopup.addEventListener("click", (event) => {
    if (event.target === categoryFilterPopup) {
      categoryFilterPopup.classList.remove("open");
      categoryFilterPopup.setAttribute("aria-hidden", "true");
    }
  });
  categoryFilterEdit.addEventListener("click", () => {
    categoryFilterPopup.classList.remove("open");
    categoryFilterPopup.setAttribute("aria-hidden", "true");
    openCategoryManager();
  });
  categoryFilterToggleAll.addEventListener("click", () => {
    if (isAllCategoriesSelected()) {
      state.filterCategoryIds = ["__none__"];
    } else {
      state.filterCategoryIds = [];
    }
    renderAll();
    saveSettings();
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
  eventPopupStartTime.addEventListener("change", () => {
    syncEndTimeFromStart();
  });
  eventPopupEndTime.addEventListener("change", () => {
    enforceEndAfterStart();
  });
  eventPopupStartDate.addEventListener("change", () => {
    updateUntilConstraints();
  });
  eventPopupEndDate.addEventListener("change", () => {
    updateUntilConstraints();
  });
  eventPopupRecurrence.addEventListener("change", () => {
    eventPopupWeekdays.style.display =
      eventPopupRecurrence.value === "weekly" ? "grid" : "none";
    if (eventPopupRecurrence.value === "weekly") {
      const anyChecked = eventPopupWeekdays.querySelector("input:checked");
      if (!anyChecked && eventPopupStartDate.value) {
        const startParts = parseDateOnly(eventPopupStartDate.value);
        const startWeekday = getWeekdayFromDateParts(startParts);
        const checkbox = eventPopupWeekdays.querySelector(
          `input[value="${startWeekday}"]`
        );
        if (checkbox) checkbox.checked = true;
      }
    }
    updateUntilConstraints();
  });
  eventPopupCategory.addEventListener("change", () => {
    if (eventPopupCategory.value === "__create__") {
      openCategoryManager({ fromDropdown: true });
      categoryManagerName.focus();
      return;
    }
    lastCategorySelection = eventPopupCategory.value;
  });
  eventPopupCategory.addEventListener("click", () => {
    if (
      eventPopupCategory.value === "__create__" &&
      state.categories.length === 0
    ) {
      openCategoryManager({ fromDropdown: true });
      categoryManagerName.focus();
    }
  });
  eventPopupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.user || !supabaseClient) return;
    if (!state.activeCalendarId) return;
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
    if (recurrence.until) {
      const startParts = parseDateOnly(eventPopupStartDate.value);
      const untilParts = parseDateOnly(recurrence.until);
      if (compareDateParts(untilParts, startParts) <= 0) {
        recurrence.until = "";
      }
    }

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
        calendar_id: state.activeCalendarId,
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
    state.activeCalendarRole = "";
    state.activeCalendarId = null;
    state.activeCalendarName = "";
    state.defaultCalendarId = "";
    state.showCalendarPicker = false;
    state.calendarMembers = [];
    state.categories = [];
    state.events = [];
    state.profiles = new Map();
    stashInviteFromUrl();
    setSignedOutUI();
    renderAll();
    return;
  }

  state.user = session.user;
  await upsertProfile(session.user);
  await loadUserPreferences();
  await handleInviteFromUrl();
  await loadCalendars();
  await refreshData();
  setSignedInUI(session.user);
}

async function refreshData() {
  if (!state.activeCalendarId) {
    state.categories = [];
    state.events = [];
    renderAll();
    return;
  }
  state.categories = [];
  state.events = [];
  await Promise.all([loadCategories(), loadEvents(), loadCalendarMembers()]);
  state.filterCategoryIds = state.filterCategoryIds.filter((id) =>
    state.categories.some((category) => category.id === id)
  );
  await loadProfiles();
  renderAll();
}

async function loadCalendars() {
  const { data, error } = await supabaseClient
    .from("calendar_members")
    .select("role, calendar_id, calendars(name)")
    .eq("user_id", state.user.id);

  if (error) {
    state.calendars = [];
    state.activeCalendarId = null;
    state.activeCalendarRole = "";
    renderCalendarPicker();
    return;
  }

  state.calendars = (data || []).map((row) => ({
    id: row.calendar_id,
    name: row.calendars?.name || "Untitled",
    role: row.role,
  }));

  if (!state.calendars.length) {
    await createDefaultCalendar();
    return;
  }

  const preferred = state.defaultCalendarId
    ? state.calendars.find((c) => c.id === state.defaultCalendarId)
    : null;
  if (
    !state.activeCalendarId ||
    !state.calendars.some((c) => c.id === state.activeCalendarId)
  ) {
    const initial = preferred || state.calendars[0];
    state.activeCalendarId = initial.id;
    state.activeCalendarName = initial.name;
    state.activeCalendarRole = initial.role;
    saveSettings();
    state.showCalendarPicker = !preferred;
  } else {
    const active = state.calendars.find((c) => c.id === state.activeCalendarId);
    state.activeCalendarName = active?.name || "";
    state.activeCalendarRole = active?.role || "";
  }

  renderCalendarPicker();
}

async function createDefaultCalendar() {
  const name = "My Calendar";
  const { data, error } = await supabaseClient
    .from("calendars")
    .insert({ name, owner_id: state.user.id })
    .select()
    .single();
  if (error) {
    renderCalendarPicker();
    return;
  }
  await supabaseClient.from("calendar_members").insert({
    calendar_id: data.id,
    user_id: state.user.id,
    role: "owner",
  });
  await loadCalendars();
}

function renderCalendarPicker() {
  calendarList.innerHTML = "";
  if (!state.user) {
    authGate.classList.remove("hidden");
    calendarPicker.classList.add("hidden");
    return;
  }
  authGate.classList.add("hidden");

  if (!state.calendars.length) {
    calendarPicker.classList.remove("hidden");
    return;
  }

  if (!state.showCalendarPicker && state.activeCalendarId) {
    calendarPicker.classList.add("hidden");
  } else {
    calendarPicker.classList.remove("hidden");
  }
  state.calendars.forEach((calendar) => {
    const row = document.createElement("div");
    row.className = "calendar-item";
    const label = document.createElement("span");
    label.textContent = `${calendar.name} · ${calendar.role}`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Open";
    button.addEventListener("click", async () => {
      state.activeCalendarId = calendar.id;
      state.activeCalendarName = calendar.name;
      state.activeCalendarRole = calendar.role;
      state.showCalendarPicker = false;
      state.categories = [];
      state.events = [];
      state.filterCategoryIds = [];
      saveSettings();
      calendarPicker.classList.add("hidden");
      renderAll();
      await refreshData();
      updatePermissionUI();
    });
    row.appendChild(label);
    row.appendChild(button);
    calendarList.appendChild(row);
  });
}

async function createCalendarFromPicker() {
  if (!state.user || !supabaseClient) return;
  const name = newCalendarName.value.trim() || "Untitled Calendar";
  const { data, error } = await supabaseClient
    .from("calendars")
    .insert({ name, owner_id: state.user.id })
    .select()
    .single();
  if (error) return;
  await supabaseClient.from("calendar_members").insert({
    calendar_id: data.id,
    user_id: state.user.id,
    role: "owner",
  });
  newCalendarName.value = "";
  await loadCalendars();
  state.activeCalendarId = data.id;
  state.activeCalendarName = data.name;
  state.activeCalendarRole = "owner";
  state.showCalendarPicker = false;
  state.categories = [];
  state.events = [];
  state.filterCategoryIds = [];
  saveSettings();
  calendarPicker.classList.add("hidden");
  renderAll();
  await refreshData();
  updatePermissionUI();
}

async function handleInviteFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("invite") || localStorage.getItem(INVITE_TOKEN_KEY);
  if (!token) return;
  if (!state.user) {
    localStorage.setItem(INVITE_TOKEN_KEY, token);
    return;
  }

  const { data, error } = await supabaseClient
    .from("calendar_invites")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) {
    console.warn("Invite lookup failed", error);
    alert("Invite link is invalid or expired.");
    localStorage.removeItem(INVITE_TOKEN_KEY);
    params.delete("invite");
    window.history.replaceState({}, "", window.location.pathname);
    return;
  }
  if (data.accepted_at) {
    localStorage.removeItem(INVITE_TOKEN_KEY);
    params.delete("invite");
    window.history.replaceState({}, "", window.location.pathname);
    return;
  }
  const { data: existingMember, error: memberLookupError } =
    await supabaseClient
      .from("calendar_members")
      .select("id")
      .eq("calendar_id", data.calendar_id)
      .eq("user_id", state.user.id)
      .maybeSingle();
  if (memberLookupError) {
    console.warn("Invite accept lookup failed", memberLookupError);
  }
  if (existingMember?.id) {
    localStorage.removeItem(INVITE_TOKEN_KEY);
    params.delete("invite");
    window.history.replaceState({}, "", window.location.pathname);
    alert("You already have access to this calendar.");
    return;
  }

  const { error: insertError } = await supabaseClient
    .from("calendar_members")
    .insert({
      calendar_id: data.calendar_id,
      user_id: state.user.id,
      role: data.role,
    });
  if (insertError) {
    const { data: fallbackMember } = await supabaseClient
      .from("calendar_members")
      .select("id")
      .eq("calendar_id", data.calendar_id)
      .eq("user_id", state.user.id)
      .maybeSingle();
    if (!fallbackMember?.id) {
      console.warn("Invite accept failed", insertError);
      alert("Unable to accept invite. Please contact the calendar owner.");
      return;
    }
  }
  const { error: updateError } = await supabaseClient
    .from("calendar_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", data.id);
  if (updateError) {
    console.warn("Invite accept update failed", updateError);
  }

  localStorage.removeItem(INVITE_TOKEN_KEY);
  params.delete("invite");
  window.history.replaceState({}, "", window.location.pathname);
}

function stashInviteFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("invite");
  if (!token) return;
  localStorage.setItem(INVITE_TOKEN_KEY, token);
}

function isReadOnly() {
  return (
    !state.user ||
    !state.activeCalendarId ||
    state.activeCalendarRole === "viewer"
  );
}
async function loadCategories() {
  const { data, error } = await supabaseClient
    .from("categories")
    .select("*")
    .eq("calendar_id", state.activeCalendarId)
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
    .eq("calendar_id", state.activeCalendarId)
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
  state.calendarMembers.forEach((member) => {
    if (member.user_id) ids.add(member.user_id);
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

  const map = new Map(state.profiles);
  (data || []).forEach((profile) => {
    map.set(profile.id, profile);
  });
  state.profiles = map;
}

async function loadUserPreferences() {
  if (!state.user || !supabaseClient) return;
  const { data } = await supabaseClient
    .from("profiles")
    .select("default_calendar_id")
    .eq("id", state.user.id)
    .single();
  state.defaultCalendarId = data?.default_calendar_id || "";
}

async function loadCalendarMembers() {
  if (!state.activeCalendarId || !supabaseClient) {
    state.calendarMembers = [];
    return;
  }
  const { data, error } = await supabaseClient
    .from("calendar_members")
    .select("id, user_id, role")
    .eq("calendar_id", state.activeCalendarId);

  if (error) {
    state.calendarMembers = [];
    return;
  }

  state.calendarMembers = data || [];
  const ids = Array.from(
    new Set(state.calendarMembers.map((member) => member.user_id))
  );
  if (!ids.length) return;

  const { data: profiles } = await supabaseClient
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);

  const map = new Map(state.profiles);
  (profiles || []).forEach((profile) => {
    map.set(profile.id, profile);
  });
  state.profiles = map;
}

async function upsertProfile(user) {
  let defaultCalendarId = null;
  const { data: existing } = await supabaseClient
    .from("profiles")
    .select("default_calendar_id")
    .eq("id", user.id)
    .single();
  if (existing?.default_calendar_id) {
    defaultCalendarId = existing.default_calendar_id;
  }
  const profile = {
    id: user.id,
    email: user.email,
    full_name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email,
    avatar_url: user.user_metadata?.avatar_url || "",
    default_calendar_id: defaultCalendarId,
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

function openCategoryManager(options = {}) {
  if (!state.user) return;
  if (options.fromDropdown) {
    pendingCategoryCreate = true;
  }
  renderCategoryManagerList();
  categoryManagerColor.value = pickNextCategoryColor();
  categoryManagerPopup.classList.add("open");
  categoryManagerPopup.setAttribute("aria-hidden", "false");
}

function closeCategoryManager() {
  categoryManagerPopup.classList.remove("open");
  categoryManagerPopup.setAttribute("aria-hidden", "true");
  if (pendingCategoryCreate && eventPopupCategory.value === "__create__") {
    const fallback =
      lastCategorySelection ||
      state.categories.find((category) => category.id !== "__create__")?.id ||
      "";
    eventPopupCategory.value = fallback;
  }
  pendingCategoryCreate = false;
}

function renderCategoryManagerList() {
  categoryManagerList.innerHTML = "";
  const isDisabled = isReadOnly();
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
      const normalized = normalizeCategoryName(name);
      const isDuplicate = state.categories.some(
        (existing) =>
          existing.id !== category.id &&
          normalizeCategoryName(existing.name) === normalized
      );
      if (isDuplicate) {
        alert("This category already exists.");
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

function pickNextCategoryColor() {
  const used = new Set(
    [
      ...state.categories.map((category) => category.color),
      categoryManagerColor?.value,
    ]
      .map((color) => (color || "").toLowerCase())
      .filter(Boolean)
  );
  const next =
    CATEGORY_COLORS.find((color) => !used.has(color.toLowerCase())) ||
    CATEGORY_COLORS[0];
  return next;
}

function normalizeCategoryName(value) {
  return value.trim().toLowerCase();
}

async function createCategoryFromManager() {
  if (!state.user || !supabaseClient || isReadOnly()) return;
  if (!state.activeCalendarId) return;
  const name = categoryManagerName.value.trim();
  if (!name) return;
  const normalized = normalizeCategoryName(name);
  const isDuplicate = state.categories.some(
    (category) => normalizeCategoryName(category.name) === normalized
  );
  if (isDuplicate) {
    alert("This category already exists.");
    return;
  }
  const { data, error } = await supabaseClient
    .from("categories")
    .insert({
      name,
      color: categoryManagerColor.value,
      calendar_id: state.activeCalendarId,
      created_by: state.user.id,
    })
    .select()
    .single();
  if (error) return;
  categoryManagerName.value = "";
  categoryManagerColor.value = pickNextCategoryColor();
  await refreshData();
  renderCategoryManagerList();
  if (data?.id) {
    lastCategorySelection = data.id;
    pendingCategoryCreate = false;
    eventPopupCategory.value = data.id;
  }
}

function openEventPopup(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  popupEventId = eventId;
  popupMode = "view";
  const readOnly = isReadOnly();
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
  editBtn.disabled = readOnly;
  editBtn.addEventListener("click", () => {
    if (readOnly) return;
    togglePopupEdit(true);
  });

  historyBtn.textContent = "History";
  historyBtn.disabled = !state.user;
  historyBtn.addEventListener("click", async () => {
    if (!state.user) return;
    await openHistoryDrawer(event);
  });

  removeBtn.textContent = "Remove";
  removeBtn.disabled = readOnly;
  removeBtn.addEventListener("click", async () => {
    if (readOnly || !supabaseClient) return;
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
  if (eventPopupCategory.value) {
    lastCategorySelection = eventPopupCategory.value;
  }
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
  updateUntilConstraints();
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

function syncEndTimeFromStart() {
  if (eventPopupAllDay.checked) return;
  if (!eventPopupStartTime.value) return;
  const startParts = parseTimeParts(eventPopupStartTime.value);
  const endParts = parseTimeParts(eventPopupEndTime.value || "00:00");
  const startMinutes = startParts.hours * 60 + startParts.minutes;
  const endMinutes = endParts.hours * 60 + endParts.minutes;
  const minEnd = (startMinutes + 60) % (24 * 60);
  if (endMinutes <= startMinutes) {
    eventPopupEndTime.value = formatTime(minEnd);
  }
}

function enforceEndAfterStart() {
  if (eventPopupAllDay.checked) return;
  if (!eventPopupStartTime.value || !eventPopupEndTime.value) return;
  const startParts = parseTimeParts(eventPopupStartTime.value);
  const endParts = parseTimeParts(eventPopupEndTime.value);
  const startMinutes = startParts.hours * 60 + startParts.minutes;
  const endMinutes = endParts.hours * 60 + endParts.minutes;
  if (endMinutes <= startMinutes) {
    eventPopupEndTime.value = formatTime((startMinutes + 60) % (24 * 60));
  }
}

function parseTimeParts(value) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

function formatTime(totalMinutes) {
  const minutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
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
  if (eventPopupCategory.value) {
    lastCategorySelection = eventPopupCategory.value;
  }
  eventPopupAllDay.checked = true;
  eventPopupStartDate.value = formatDateParts(startParts);
  eventPopupEndDate.value = formatDateParts(endParts);
  eventPopupStartTime.value = "09:00";
  eventPopupEndTime.value = "10:00";
  eventPopupTimeZone.value = state.displayTimeZone;
  eventPopupRecurrence.value = "none";
  eventPopupInterval.value = 1;
  eventPopupUntil.value = "";
  updateUntilConstraints();
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
let pendingCategoryCreate = false;
let lastCategorySelection = "";

function handleCalendarMouseDown(event) {
  if (isReadOnly()) return;
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
  updatePermissionUI();
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
  updatePermissionUI();
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
  categoryFilterBtnMobile.disabled = disabled;
  categoryToggleAll.disabled = disabled;
}

function isAllCategoriesSelected() {
  return state.filterCategoryIds.length === 0;
}

function isNoCategoriesSelected() {
  return (
    state.filterCategoryIds.length === 1 &&
    state.filterCategoryIds[0] === "__none__"
  );
}

function updatePermissionUI() {
  const readOnly = isReadOnly();
  setFormsDisabled(readOnly);
  shareBtn.disabled = !state.user || !canShareCalendar();
  viewOnlyBanner.classList.toggle(
    "hidden",
    !readOnly || !state.activeCalendarId
  );
  updateSettingsUI();
}

function canShareCalendar() {
  return (
    state.activeCalendarRole === "owner" ||
    state.activeCalendarRole === "editor"
  );
}

function updateSettingsUI() {
  if (!calendarNameInput || !defaultCalendarToggle || !sharedWithList) return;
  calendarNameInput.value = state.activeCalendarName || "";
  calendarNameInput.disabled =
    !state.user || state.activeCalendarRole !== "owner";
  defaultCalendarToggle.checked =
    !!state.activeCalendarId &&
    !!state.defaultCalendarId &&
    state.activeCalendarId === state.defaultCalendarId;
  defaultCalendarToggle.disabled = !state.user || !state.activeCalendarId;
  saveCalendarSettings.disabled = !state.user || !state.activeCalendarId;
  deleteCalendarBtn.disabled =
    !state.user || state.activeCalendarRole !== "owner";
  renderSharedWithList();
}

async function saveCalendarSettingsForActive() {
  if (!state.user || !supabaseClient || !state.activeCalendarId) return;
  const name = calendarNameInput.value.trim();
  if (state.activeCalendarRole === "owner" && name && name !== state.activeCalendarName) {
    await supabaseClient
      .from("calendars")
      .update({ name })
      .eq("id", state.activeCalendarId);
    state.activeCalendarName = name;
  }

  if (defaultCalendarToggle.checked) {
    await supabaseClient
      .from("profiles")
      .update({ default_calendar_id: state.activeCalendarId })
      .eq("id", state.user.id);
    state.defaultCalendarId = state.activeCalendarId;
  } else if (state.defaultCalendarId === state.activeCalendarId) {
    await supabaseClient
      .from("profiles")
      .update({ default_calendar_id: null })
      .eq("id", state.user.id);
    state.defaultCalendarId = "";
  }

  await loadCalendars();
  renderAll();
}

async function deleteActiveCalendar() {
  if (!state.user || !supabaseClient || !state.activeCalendarId) return;
  if (state.activeCalendarRole !== "owner") return;
  const name = state.activeCalendarName || "this calendar";
  const ok = window.confirm(`Delete ${name}? This cannot be undone.`);
  if (!ok) return;
  await supabaseClient.from("calendars").delete().eq("id", state.activeCalendarId);
  state.activeCalendarId = null;
  state.activeCalendarName = "";
  state.activeCalendarRole = "";
  state.showCalendarPicker = true;
  saveSettings();
  settingsPopup.classList.remove("open");
  settingsPopup.setAttribute("aria-hidden", "true");
  await loadCalendars();
  await refreshData();
  updatePermissionUI();
}

function renderSharedWithList() {
  if (!sharedWithList) return;
  sharedWithList.innerHTML = "";
  if (!state.activeCalendarId) {
    sharedWithList.textContent = "No calendar selected.";
    return;
  }
  if (!state.calendarMembers.length) {
    sharedWithList.textContent = "No shared members yet.";
    return;
  }

  const sorted = [...state.calendarMembers].sort((a, b) => {
    if (a.role === b.role) return 0;
    if (a.role === "owner") return -1;
    if (b.role === "owner") return 1;
    if (a.role === "editor" && b.role === "viewer") return -1;
    if (a.role === "viewer" && b.role === "editor") return 1;
    return 0;
  });

  sorted.forEach((member) => {
    const row = document.createElement("div");
    row.className = "shared-member";

    const label = document.createElement("div");
    label.className = "shared-member-label";
    const name = resolveUserLabel(member.user_id) || "Unknown";
    const selfTag = member.user_id === state.user?.id ? " (You)" : "";
    label.textContent = `${name}${selfTag}`;

    const role = document.createElement("div");
    role.className = "shared-member-role";

    row.appendChild(label);
    row.appendChild(role);

    const canManage =
      state.activeCalendarRole === "owner" && member.role !== "owner";

    if (canManage) {
      const roleSelect = document.createElement("select");
      roleSelect.className = "shared-member-select";
      ["editor", "viewer"].forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        roleSelect.appendChild(option);
      });
      roleSelect.value = member.role;
      roleSelect.addEventListener("change", async () => {
        await supabaseClient
          .from("calendar_members")
          .update({ role: roleSelect.value })
          .eq("id", member.id);
        await loadCalendarMembers();
        renderSharedWithList();
      });
      role.appendChild(roleSelect);
    } else {
      role.textContent = member.role;
    }

    if (
      canManage &&
      member.user_id !== state.user?.id
    ) {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "Revoke";
      removeBtn.addEventListener("click", async () => {
        await supabaseClient
          .from("calendar_members")
          .delete()
          .eq("id", member.id);
        await loadCalendarMembers();
        renderSharedWithList();
      });
      row.appendChild(removeBtn);
    }

    sharedWithList.appendChild(row);
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

function updateUntilConstraints() {
  if (!eventPopupStartDate.value) return;
  const minDate = addDaysToDateString(eventPopupStartDate.value, 1);
  eventPopupUntil.min = minDate;
  if (eventPopupUntil.value) {
    const startParts = parseDateOnly(eventPopupStartDate.value);
    const untilParts = parseDateOnly(eventPopupUntil.value);
    if (compareDateParts(untilParts, startParts) <= 0) {
      eventPopupUntil.value = "";
    }
  }
}

function renderAll() {
  const baseTitle = state.activeCalendarName || "Annual Calendar";
  yearTitle.textContent = `${baseTitle} - ${state.year}`;
  renderCategoryPills();
  renderCategoryFilterPopup();
  renderEventFormOptions();
  renderCalendar();
  updateFilterUI();
  updateSettingsUI();
}

function renderEventFormOptions() {
  eventPopupCategory.innerHTML = "";
  if (state.categories.length === 0) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a category";
    placeholder.disabled = true;
    placeholder.selected = true;
    eventPopupCategory.appendChild(placeholder);
    const option = document.createElement("option");
    option.value = "__create__";
    option.textContent = "Create a category...";
    eventPopupCategory.appendChild(option);
    return;
  }
  state.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    eventPopupCategory.appendChild(option);
  });
  const createOption = document.createElement("option");
  createOption.value = "__create__";
  createOption.textContent = "Create a category...";
  eventPopupCategory.appendChild(createOption);
}


function isCategorySelected(categoryId) {
  if (isAllCategoriesSelected()) return true;
  if (isNoCategoriesSelected()) return false;
  return state.filterCategoryIds.includes(categoryId);
}

function toggleCategoryFilter(categoryId) {
  if (isNoCategoriesSelected()) {
    state.filterCategoryIds = [categoryId];
  } else if (isAllCategoriesSelected()) {
    state.filterCategoryIds = state.categories
      .map((c) => c.id)
      .filter((id) => id !== categoryId);
    if (state.filterCategoryIds.length === 0) {
      state.filterCategoryIds = ["__none__"];
    }
  } else if (state.filterCategoryIds.includes(categoryId)) {
    state.filterCategoryIds = state.filterCategoryIds.filter(
      (id) => id !== categoryId
    );
    if (state.filterCategoryIds.length === 0) {
      state.filterCategoryIds = ["__none__"];
    }
  } else {
    state.filterCategoryIds = [...state.filterCategoryIds, categoryId];
  }

  if (state.filterCategoryIds.length === state.categories.length) {
    state.filterCategoryIds = [];
  }

  renderAll();
  saveSettings();
}

function renderCategoryPills() {
  categoryPills.innerHTML = "";
  if (!state.user) return;
  state.categories.forEach((category) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "category-pill";
    pill.textContent = category.name;
    const isActive = isCategorySelected(category.id);
    if (isActive) {
      pill.classList.add("active");
      pill.style.background = category.color;
    }
    pill.style.borderColor = category.color;
    pill.addEventListener("click", () => {
      toggleCategoryFilter(category.id);
    });
    categoryPills.appendChild(pill);
  });
  if (state.categories.length === 0) {
    categoryToggleAll.classList.add("hidden");
  } else {
    categoryToggleAll.classList.remove("hidden");
  }
  if (isAllCategoriesSelected()) {
    categoryToggleAll.textContent = "Clear All";
  } else {
    categoryToggleAll.textContent = "Select All";
  }
}

function renderCategoryFilterPopup() {
  categoryFilterList.innerHTML = "";
  if (!state.user) return;

  state.categories.forEach((category) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "category-pill category-filter-pill";
    const isActive = isCategorySelected(category.id);
    if (isActive) {
      pill.classList.add("active");
      pill.style.background = category.color || "#999";
    }
    pill.style.borderColor = category.color || "#999";
    const swatch = document.createElement("span");
    swatch.className = "category-swatch";
    swatch.style.background = category.color || "#999";
    const label = document.createElement("span");
    label.textContent = category.name;

    pill.appendChild(swatch);
    pill.appendChild(label);

    pill.addEventListener("click", () => {
      toggleCategoryFilter(category.id);
    });

    categoryFilterList.appendChild(pill);
  });

  if (state.categories.length === 0) {
    categoryFilterToggleAll.classList.add("hidden");
  } else {
    categoryFilterToggleAll.classList.remove("hidden");
  }
  if (isAllCategoriesSelected()) {
    categoryFilterToggleAll.textContent = "Clear All";
  } else {
    categoryFilterToggleAll.textContent = "Select All";
  }
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

    renderEventBarsForMonth(eventLayer, segmentsByMonth.get(month) || []);
  }

  requestAnimationFrame(() => {
    const sampleCell = monthRows.querySelector(".day-cell:not(.out-month)");
    const numberEl = monthRows.querySelector(".day-number");
    const miniEl = monthRows.querySelector(".weekday-mini");
    if (!sampleCell || !numberEl || !miniEl) return;

    const cellWidth = sampleCell.getBoundingClientRect().width;
    const numberStyle = getComputedStyle(numberEl);
    const miniStyle = getComputedStyle(miniEl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const numberFont = `${numberStyle.fontWeight} ${numberStyle.fontSize} ${numberStyle.fontFamily}`;
    const miniFont = `${miniStyle.fontWeight} ${miniStyle.fontSize} ${miniStyle.fontFamily}`;
    ctx.font = numberFont;
    const numberWidth = ctx.measureText("31").width;
    ctx.font = miniFont;
    const miniWidth = ctx.measureText("MO").width;
    const totalWidth = numberWidth + 4 + miniWidth + 4;
    const shouldHide = totalWidth > cellWidth - 2;

    document.body.classList.toggle("hide-weekday", shouldHide);
  });
}

function renderEventBarsForMonth(container, segments) {
  const dayCount =
    Number(
      getComputedStyle(document.documentElement).getPropertyValue("--day-count")
    ) || 31;
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
    const span = Math.max(1, segment.endIndex - segment.startIndex + 1);
    bar.style.left = `calc(${segment.startIndex} * (100% / ${dayCount}) + 1px)`;
    bar.style.width = `calc(${span} * (100% / ${dayCount}) - 2px)`;
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
  const layerTop = parseFloat(getComputedStyle(container).top) || 22;
  const tracksHeight =
    maxTracks * barHeight + Math.max(0, maxTracks - 1) * barGap;
  const baseRowHeight = 26 + 2 * (barHeight + barGap);
  const rowHeight =
    maxTracks <= 2
      ? baseRowHeight
      : Math.ceil(layerTop + tracksHeight + 1);
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
  if (visibleCategories.has("__none__")) {
    visibleCategories.clear();
  }

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
    const normalizedWeekdays = byWeekday.map((day) => (day + 6) % 7);
    let weekStart = startOfWeek(startLocal);
    while (true) {
      if (untilDate && compareDateParts(weekStart, untilDate) > 0) break;
      normalizedWeekdays.forEach((weekday) => {
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
    calendars: [],
    activeCalendarId: null,
    activeCalendarName: "",
    activeCalendarRole: "",
    defaultCalendarId: "",
    showCalendarPicker: false,
    calendarMembers: [],
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
      activeCalendarId: state.activeCalendarId,
      activeCalendarName: state.activeCalendarName,
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

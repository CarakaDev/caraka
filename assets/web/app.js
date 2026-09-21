const $ = (id) => document.getElementById(id);
const strings = {
  en: {
    pairTitle: "Pair this device",
    pairHelp:
      "Run caraka web pair on your computer. Enter the terminal code to connect this browser.",
    pairCode: "Pairing code",
    deviceName: "Device name",
    pair: "Pair device",
    new: "＋ New task",
    sessions: "Sessions",
    settings: "Devices & connection",
    stop: "Stop",
    workspace: "Workspace",
    keyHint: "Enter to send · Shift+Enter for a new line",
    runHint: "Tasks run on your computer.",
    close: "Close",
    language: "Language",
    devices: "Paired devices",
    addDevice: "To pair another device, run caraka web pair on your computer.",
    notifications: "Notifications",
    enablePush: "Enable notifications",
    installTitle: "Install Caraka",
    installHelp:
      "Use your browser menu to install Caraka or add it to your home screen, if supported.",
    install: "Install",
    logout: "Sign out",
    retryLogout: "Retry sign-out",
    retryConnection: "Retry connection",
    connected: "● Connected",
    disconnected: "⊘ Disconnected · displayed messages may be out of date.",
    connecting: "◌ Connecting…",
    newTitle: "New task",
    empty: "Choose a workspace and send your first task.",
    noWorkspace: "No workspace is registered. Add a workspace on your computer first.",
    noSessions: "No sessions yet.",
    message: "Message",
    conversation: "Conversation",
    send: "Send",
    attach: "Attach files",
    placeholder: "Write a task…",
    followup: "Write a follow-up…",
    you: "You",
    approval: "⏸ Permission required",
    waiting: "The agent is waiting for your decision.",
    revoke: "Revoke",
    current: "This device",
    pushUnavailable: "Push is not available on this server.",
    pushUnsupported: "This browser does not support push notifications.",
    pushDenied: "Notifications are blocked. Change the permission in your browser settings.",
    pushEnabled: "✓ Notifications enabled",
    installed: "✓ Caraka is installed.",
    failed: "The request failed. Check the connection and try again.",
    expired: "This decision is no longer available. Reload the session.",
    busy: "The server is busy. Try again shortly.",
    pairingFailed: "Pairing failed. Run caraka web pair for a new code and try again.",
    largeFile: "Files must be 20 MiB or smaller.",
    remove: "Remove",
    sending: "Sending…",
    uploading: "Uploading files…",
    signedOut: "This device is no longer paired. Get a new code from your computer.",
    idle: "Idle",
    running: "Running",
    awaiting_approval: "Waiting for permission",
    done: "Done",
    failedState: "Failed",
    cancelled: "Cancelled",
    unknown: "Waiting for session",
    retry: "Try again",
    logoutFailed: "Sign-out could not reach the server. Reconnect and try again.",
    notificationFailed: "Notifications could not be enabled. Try again.",
  },
  id: {
    pairTitle: "Hubungkan perangkat ini",
    pairHelp:
      "Jalankan caraka web pair di komputer. Masukkan kode dari terminal untuk menghubungkan browser ini.",
    pairCode: "Kode pemasangan",
    deviceName: "Nama perangkat",
    pair: "Hubungkan perangkat",
    new: "＋ Tugas baru",
    sessions: "Sesi",
    settings: "Perangkat & koneksi",
    stop: "Hentikan",
    workspace: "Ruang kerja",
    keyHint: "Enter untuk kirim · Shift+Enter untuk baris baru",
    runHint: "Tugas berjalan di komputermu.",
    close: "Tutup",
    language: "Bahasa",
    devices: "Perangkat terhubung",
    addDevice: "Untuk menghubungkan perangkat lain, jalankan caraka web pair di komputer.",
    notifications: "Notifikasi",
    enablePush: "Aktifkan notifikasi",
    installTitle: "Pasang Caraka",
    installHelp:
      "Gunakan menu browser untuk memasang Caraka atau menambahkannya ke layar utama, jika tersedia.",
    install: "Pasang",
    logout: "Keluar",
    retryLogout: "Coba keluar lagi",
    retryConnection: "Coba sambungkan lagi",
    connected: "● Tersambung",
    disconnected: "⊘ Terputus · pesan yang tampil mungkin belum terbaru.",
    connecting: "◌ Menghubungkan…",
    newTitle: "Tugas baru",
    empty: "Pilih ruang kerja dan kirim tugas pertama.",
    noWorkspace: "Belum ada ruang kerja. Tambahkan ruang kerja di komputer terlebih dahulu.",
    noSessions: "Belum ada sesi.",
    message: "Pesan",
    conversation: "Percakapan",
    send: "Kirim",
    attach: "Lampirkan berkas",
    placeholder: "Tulis tugas…",
    followup: "Tulis pesan lanjutan…",
    you: "Kamu",
    approval: "⏸ Perlu persetujuan",
    waiting: "Agent menunggu keputusanmu.",
    revoke: "Cabut akses",
    current: "Perangkat ini",
    pushUnavailable: "Push belum tersedia di server ini.",
    pushUnsupported: "Browser ini tidak mendukung notifikasi push.",
    pushDenied: "Notifikasi diblokir. Ubah izin di pengaturan browser.",
    pushEnabled: "✓ Notifikasi aktif",
    installed: "✓ Caraka sudah terpasang.",
    failed: "Permintaan gagal. Periksa koneksi dan coba lagi.",
    expired: "Keputusan ini sudah tidak tersedia. Muat ulang sesi.",
    busy: "Server sedang sibuk. Coba lagi sebentar.",
    pairingFailed: "Pemasangan gagal. Jalankan caraka web pair untuk kode baru, lalu coba lagi.",
    largeFile: "Ukuran setiap berkas maksimal 20 MiB.",
    remove: "Hapus",
    sending: "Mengirim…",
    uploading: "Mengunggah berkas…",
    signedOut: "Perangkat ini tidak lagi terhubung. Ambil kode baru dari komputer.",
    idle: "Siap",
    running: "Berjalan",
    awaiting_approval: "Menunggu izin",
    done: "Selesai",
    failedState: "Gagal",
    cancelled: "Dibatalkan",
    unknown: "Menunggu sesi",
    retry: "Coba lagi",
    logoutFailed: "Server belum menerima permintaan keluar. Sambungkan kembali dan coba lagi.",
    notificationFailed: "Notifikasi belum bisa diaktifkan. Coba lagi.",
  },
};
let language = navigator.language.startsWith("id") ? "id" : "en";
const t = (key) => strings[language][key] ?? key;
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
const fragment = new URLSearchParams(location.hash.slice(1)).get("pair");
// Remove the one-time code before fetch, SSE, or service worker registration.
if (location.hash) history.replaceState(null, "", location.pathname + location.search);
if (fragment) $("pair-code").value = fragment;
let state,
  events,
  connected = false,
  epoch = 0,
  sessionAbort = new AbortController();
let selected = "",
  pendingLoad = null,
  reloadAgain = false,
  submitting = false,
  stopping = false,
  pairing = false,
  signingOut = false;
let installPrompt = null;
let pushState = "idle";
let restoreSessionAllowed = !fragment,
  initialStateFailed = false;
const drafts = new Map(),
  pendingDecisions = new Set(),
  usedDecisions = new Set();
try {
  selected = localStorage.getItem("caraka.room") ?? "";
} catch {
  /* Storage can be disabled. */
}
function draftFor(id = selected) {
  if (!drafts.has(id)) drafts.set(id, { text: "", files: [], retry: null, scroll: null });
  return drafts.get(id);
}
function translate() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  $("draft").setAttribute("aria-label", t("message"));
  $("message-scroll").setAttribute("aria-label", t("conversation"));
  $("send").setAttribute("aria-label", t("send"));
  $("attach").setAttribute("aria-label", t("attach"));
  $("open-sessions").setAttribute("aria-label", t("sessions"));
  document
    .querySelector(".mobile-header [data-action=settings]")
    .setAttribute("aria-label", t("settings"));
  $("sessions").setAttribute("aria-label", t("sessions"));
  $("language").value = language;
}
function failure(error) {
  if (error.status === 429) return t("busy");
  if (error.status === 409) return t("expired");
  return t("failed");
}
async function request(path, options = {}) {
  const generation = epoch;
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    signal: sessionAbort.signal,
    ...options,
  });
  if (generation !== epoch) throw new DOMException("Old session", "AbortError");
  if (response.status === 401 && path !== "/api/pair") {
    clearPrivate();
    $("pair-error").textContent = t("signedOut");
    throw new DOMException("Signed out", "AbortError");
  }
  if (!response.ok) throw Object.assign(new Error("Request failed"), { status: response.status });
  const data = await response.json();
  if (generation !== epoch) throw new DOMException("Old session", "AbortError");
  return data;
}
const post = (path, data) =>
  request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
function clearPrivate() {
  restoreSessionAllowed = false;
  initialStateFailed = false;
  $("state-retry").hidden = true;
  $("state-retry").disabled = false;
  epoch += 1;
  sessionAbort.abort();
  sessionAbort = new AbortController();
  events?.close();
  events = null;
  state = undefined;
  connected = false;
  pendingLoad = null;
  reloadAgain = false;
  drafts.clear();
  pendingDecisions.clear();
  usedDecisions.clear();
  submitting = false;
  stopping = false;
  for (const id of [
    "messages",
    "sessions",
    "drawer-sessions",
    "devices",
    "pending-files",
    "workspace",
  ])
    $(id).replaceChildren();
  for (const id of [
    "error",
    "settings-error",
    "current-device",
    "room-title",
    "room-detail",
    "room-state",
    "push-status",
  ])
    $(id).textContent = "";
  $("draft").value = "";
  $("activity").textContent = "";
  $("files").value = "";
  $("pair-code").value = "";
  $("device-name").value = "";
  for (const id of ["settings", "drawer"]) $(id).close();
  $("app").hidden = true;
  $("pairing").hidden = false;
  $("pair-code").focus();
}
function connection(value) {
  connected = value;
  const text = value ? t("connected") : t("disconnected");
  document.querySelectorAll(".connection").forEach((element) => {
    element.textContent = text;
  });
  $("connection").textContent = text;
  $("connection").classList.toggle("stale", !value);
  controls();
}
function controls() {
  const disabled = !connected || submitting || signingOut;
  $("composer").setAttribute("aria-busy", String(submitting));
  $("activity").textContent = submitting ? t("sending") : "";
  $("send").disabled =
    disabled ||
    (!selected && !$("workspace").value) ||
    (!$("draft").value.trim() && !draftFor().files.length);
  $("draft").readOnly = submitting;
  $("files").disabled = disabled;
  $("attach").disabled = disabled;
  $("workspace").disabled = disabled;
  $("stop").disabled = !connected || stopping || !selected;
  $("stop").hidden = !selected;
  document.querySelectorAll("[data-action=new], .session").forEach((button) => {
    button.disabled = submitting;
  });
  document.querySelectorAll("[data-decision]").forEach((button) => {
    button.disabled =
      !connected ||
      pendingDecisions.has(button.dataset.message) ||
      usedDecisions.has(button.dataset.decision);
  });
}
const glyphs = {
  idle: "◌",
  running: "▸",
  awaiting_approval: "⏸",
  done: "✓",
  failed: "✗",
  cancelled: "⊘",
};
function status(room) {
  return room?.state && glyphs[room.state]
    ? `${glyphs[room.state]} ${t(room.state === "failed" ? "failedState" : room.state)}`
    : `◌ ${t("unknown")}`;
}
function choose(id) {
  if (submitting) return;
  draftFor().text = $("draft").value;
  draftFor().scroll = $("message-scroll").scrollTop;
  selected = id;
  try {
    localStorage.setItem("caraka.room", id);
  } catch {
    /* Navigation can stay in memory. */
  }
  $("draft").value = draftFor().text;
  $("error").textContent = "";
  $("drawer").close();
  render(true);
  $("draft").focus();
}
function renderSessions() {
  for (const id of ["sessions", "drawer-sessions"]) {
    const nav = $(id);
    nav.replaceChildren();
    if (!state.rooms.length) nav.append(node("p", t("noSessions"), "empty"));
    for (const room of state.rooms) {
      const button = node(
        "button",
        undefined,
        "session" + (selected === room.id ? " selected" : ""),
      );
      button.setAttribute("aria-current", selected === room.id ? "true" : "false");
      const symbol = node(
        "span",
        glyphs[room.state] ?? "◌",
        `glyph state-${glyphs[room.state] ? room.state : "idle"}`,
      );
      symbol.setAttribute("aria-hidden", "true");
      const copy = node("span", undefined, "session-copy");
      copy.append(
        node("span", room.title || room.workspace, "session-title"),
        node("small", `${room.workspace} · ${status(room)}`),
      );
      button.append(symbol, copy);
      button.addEventListener("click", () => choose(room.id));
      nav.append(button);
    }
  }
}
function safeText(element, text) {
  const parts = text.split(/(```[^\n]*\n[\s\S]*?```)/g);
  for (const part of parts) {
    if (part.startsWith("```") && part.endsWith("```")) {
      const pre = node("pre");
      pre.tabIndex = 0;
      pre.append(node("code", part.slice(part.indexOf("\n") + 1, -3)));
      element.append(pre);
    } else element.append(document.createTextNode(part));
  }
}
function renderMessages(force) {
  const viewport = $("message-scroll");
  const scroll = viewport.scrollTop;
  const nearBottom = viewport.scrollHeight - viewport.clientHeight - scroll < 80;
  const focused = document.activeElement;
  const focusKey = focused?.dataset.decision;
  const list = $("messages");
  list.replaceChildren();
  const messages = state.messages.filter((message) => message.roomId === selected);
  if (!messages.length)
    list.append(node("p", state.workspaces.length ? t("empty") : t("noWorkspace"), "empty"));
  for (const message of messages) {
    const card = message.buttons.length > 0;
    const article = node(
      "article",
      undefined,
      `message ${message.role}${card ? " permission" : ""}`,
    );
    article.dataset.messageId = message.id;
    const meta = node("div", undefined, "message-meta");
    const time = node(
      "time",
      new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit" }).format(
        message.createdAt,
      ),
    );
    time.dateTime = new Date(message.createdAt).toISOString();
    meta.append(node("span", message.role === "user" ? t("you") : "Caraka"), time);
    article.append(meta);
    if (card) article.append(node("strong", t("approval"), "permission-label"));
    const body = node("div", undefined, "message-body");
    safeText(body, message.text);
    article.append(body);
    for (const file of message.attachments) {
      const link = node("a", `↓ ${file.name}`, "file-link");
      link.href = `/api/files/${encodeURIComponent(file.id)}`;
      link.download = file.name;
      article.append(link);
    }
    if (card) {
      const buttons = node("div", undefined, "decision-buttons");
      message.buttons.forEach((item, index) => {
        const button = node("button", item.text, index === 0 ? "primary" : "");
        button.dataset.decision = item.id;
        button.dataset.message = message.id;
        button.addEventListener("click", () => decide(message.id, item.id));
        buttons.append(button);
      });
      article.append(buttons, node("p", t("waiting"), "permission-foot"));
    }
    list.append(article);
  }
  if (force) viewport.scrollTop = draftFor().scroll ?? viewport.scrollHeight;
  else viewport.scrollTop = nearBottom ? viewport.scrollHeight : scroll;
  if (focusKey)
    [...list.querySelectorAll("[data-decision]")]
      .find((button) => button.dataset.decision === focusKey)
      ?.focus({ preventScroll: true });
}
function renderPush() {
  const unavailable = !state?.push.available;
  const unsupported = !("PushManager" in window) || !("serviceWorker" in navigator);
  const message = unavailable
    ? t("pushUnavailable")
    : unsupported
      ? t("pushUnsupported")
      : pushState === "pending"
        ? t("sending")
        : pushState === "denied"
          ? t("pushDenied")
          : pushState === "enabled"
            ? t("pushEnabled")
            : pushState === "failed"
              ? t("notificationFailed")
              : "";
  $("push-status").textContent = message;
  $("push").disabled =
    unavailable || unsupported || pushState === "pending" || pushState === "denied";
}
function renderFiles() {
  $("pending-files").replaceChildren();
  draftFor().files.forEach((file, index) => {
    const button = node("button", `${file.file.name} ×`);
    button.type = "button";
    button.disabled = submitting;
    button.setAttribute("aria-label", `${t("remove")} ${file.file.name}`);
    button.addEventListener("click", () => {
      draftFor().files.splice(index, 1);
      draftFor().retry = null;
      renderFiles();
      controls();
    });
    $("pending-files").append(button);
  });
}
function render(force = false) {
  if (!state) return;
  translate();
  renderSessions();
  const room = state.rooms.find((entry) => entry.id === selected);
  $("room-title").textContent = room?.title || room?.workspace || t("newTitle");
  $("room-detail").textContent = room
    ? [room.workspace, room.agent].filter(Boolean).join(" / ")
    : t("runHint");
  $("room-state").textContent = room ? status(room) : "";
  $("room-state").className = `state-${glyphs[room?.state] ? room.state : "idle"}`;
  $("draft").placeholder = t(room ? "followup" : "placeholder");
  $("workspace-row").hidden = !!room;
  const workspace = $("workspace").value;
  $("workspace").replaceChildren(
    ...state.workspaces.map((entry) => {
      const option = node("option", entry.slug);
      option.value = entry.slug;
      return option;
    }),
  );
  if (state.workspaces.some((entry) => entry.slug === workspace)) $("workspace").value = workspace;
  document.querySelectorAll(".host").forEach((element) => {
    element.textContent = new URL(state.connection.origin).host;
  });
  $("current-device").textContent = `▣ ${state.device.name}`;
  renderPush();
  renderMessages(force);
  renderFiles();
  connection(connected);
}
async function loadState() {
  if (signingOut || !restoreSessionAllowed) return;
  if (pendingLoad) {
    reloadAgain = true;
    return pendingLoad;
  }
  const generation = epoch;
  $("state-retry").disabled = true;
  const operation = (async () => {
    do {
      reloadAgain = false;
      try {
        const fresh = await request("/api/state");
        if (generation !== epoch) return;
        const first = !state;
        state = fresh;
        initialStateFailed = false;
        $("state-retry").hidden = true;
        $("pair-error").textContent = "";
        if (first) {
          language = ["en", "id"].includes(state.language) ? state.language : language;
          if (selected && !state.rooms.some((room) => room.id === selected)) selected = "";
        }
        $("pairing").hidden = true;
        $("app").hidden = false;
        connection(navigator.onLine);
        render(first);
        if (!events) startEvents();
      } catch (error) {
        if (error.name !== "AbortError" && generation === epoch) {
          connection(false);
          if (!state) {
            initialStateFailed = true;
            $("pair-error").textContent = t("failed");
            $("state-retry").hidden = false;
          }
        }
      }
    } while (reloadAgain && generation === epoch);
  })();
  pendingLoad = operation;
  try {
    await operation;
  } finally {
    if (pendingLoad === operation) pendingLoad = null;
    if (generation === epoch) $("state-retry").disabled = false;
  }
}
function startEvents() {
  const generation = epoch;
  const source = new EventSource("/api/events", { withCredentials: true });
  events = source;
  source.addEventListener("ready", () => {
    if (generation === epoch) void loadState();
  });
  source.addEventListener("invalidate", () => {
    if (generation === epoch) void loadState();
  });
  source.onerror = () => {
    if (generation === epoch) {
      connection(false);
      void checkAuthentication();
    }
  };
}
async function checkAuthentication() {
  try {
    await request("/api/state");
  } catch {
    /* A 401 clears the session. SSE handles reconnect. */
  }
}
async function decide(messageId, buttonId) {
  if (!connected || pendingDecisions.has(messageId) || usedDecisions.has(buttonId)) return;
  const generation = epoch;
  pendingDecisions.add(messageId);
  controls();
  $("error").textContent = "";
  try {
    await post("/api/callback", { messageId, buttonId });
    usedDecisions.add(buttonId);
    await loadState();
  } catch (error) {
    if (error.name !== "AbortError" && generation === epoch) {
      $("error").textContent = failure(error);
      if (error.status === 409) {
        usedDecisions.add(buttonId);
        await loadState();
      }
    }
  } finally {
    if (generation === epoch) {
      pendingDecisions.delete(messageId);
      controls();
    }
  }
}
$("pair-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (pairing || signingOut) return;
  pairing = true;
  $("pair-submit").disabled = true;
  $("pair-error").textContent = "";
  try {
    await post("/api/pair", {
      code: $("pair-code").value.trim(),
      name: $("device-name").value.trim(),
    });
    $("pair-code").value = "";
    restoreSessionAllowed = true;
    await loadState();
  } catch (error) {
    if (error.name !== "AbortError") $("pair-error").textContent = t("pairingFailed");
  } finally {
    pairing = false;
    $("pair-submit").disabled = false;
  }
});
$("draft").addEventListener("input", () => {
  draftFor().text = $("draft").value;
  draftFor().retry = null;
  controls();
});
$("draft").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (!$("send").disabled) $("composer").requestSubmit();
  }
});
$("workspace").addEventListener("change", () => {
  draftFor().retry = null;
  controls();
});
$("attach").addEventListener("click", () => $("files").click());
$("files").addEventListener("change", () => {
  if ([...$("files").files].some((file) => file.size > 20 * 1024 * 1024)) {
    $("error").textContent = t("largeFile");
    $("files").value = "";
    return;
  }
  draftFor().files.push(...[...$("files").files].map((file) => ({ file, id: null })));
  draftFor().retry = null;
  $("files").value = "";
  renderFiles();
  controls();
});
$("composer").addEventListener("submit", async (event) => {
  event.preventDefault();
  if ($("send").disabled) return;
  const generation = epoch,
    draft = draftFor(),
    room = selected;
  submitting = true;
  controls();
  renderFiles();
  $("error").textContent = "";
  try {
    for (const file of draft.files) {
      if (!file.id) {
        const result = await request(`/api/files?name=${encodeURIComponent(file.file.name)}`, {
          method: "POST",
          headers: { "content-type": file.file.type || "application/octet-stream" },
          body: file.file,
        });
        file.id = result.id;
      }
    }
    if (!draft.retry)
      draft.retry = {
        clientId: crypto.randomUUID(),
        ...(room ? { roomId: room } : { workspace: $("workspace").value }),
        text: draft.text,
        files: draft.files.map((file) => file.id),
      };
    const result = await post("/api/messages", draft.retry);
    if (generation !== epoch) return;
    drafts.delete(room);
    selected = result.roomId;
    try {
      localStorage.setItem("caraka.room", selected);
    } catch {
      /* No private data is stored. */
    }
    $("draft").value = "";
    draftFor().text = "";
    $("pending-files").replaceChildren();
    await loadState();
  } catch (error) {
    if (error.name !== "AbortError" && generation === epoch)
      $("error").textContent = failure(error);
  } finally {
    if (generation === epoch) {
      submitting = false;
      controls();
      renderFiles();
    }
  }
});
$("stop").addEventListener("click", async () => {
  if (!connected || stopping || !selected) return;
  const generation = epoch;
  stopping = true;
  controls();
  try {
    await post("/api/stop", { roomId: selected });
    await loadState();
  } catch (error) {
    if (error.name !== "AbortError") $("error").textContent = failure(error);
  } finally {
    if (generation === epoch) {
      stopping = false;
      controls();
    }
  }
});
async function devices() {
  const result = await request("/api/devices");
  $("devices").replaceChildren();
  for (const device of result.devices) {
    const row = node("div");
    row.append(
      node("span", device.name + (device.id === state.device.id ? ` · ${t("current")}` : "")),
    );
    const button = node("button", t("revoke"));
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await request(`/api/devices/${encodeURIComponent(device.id)}`, { method: "DELETE" });
        if (device.id === state?.device.id) clearPrivate();
        else if (state) await devices();
      } catch (error) {
        if (error.name !== "AbortError") $("settings-error").textContent = failure(error);
      } finally {
        button.disabled = false;
      }
    });
    row.append(button);
    $("devices").append(row);
  }
}
document
  .querySelectorAll("[data-action=new]")
  .forEach((button) => button.addEventListener("click", () => choose("")));
document.querySelectorAll("[data-action=settings]").forEach((button) =>
  button.addEventListener("click", async () => {
    $("settings-error").textContent = "";
    $("settings").showModal();
    try {
      await devices();
    } catch (error) {
      if (error.name !== "AbortError") $("settings-error").textContent = failure(error);
    }
  }),
);
document
  .querySelectorAll("[data-close]")
  .forEach((button) => button.addEventListener("click", () => $(button.dataset.close).close()));
$("open-sessions").addEventListener("click", () => $("drawer").showModal());
$("language").addEventListener("change", () => {
  language = $("language").value;
  render();
  if ($("settings").open) void devices().catch(() => {});
});
async function signOut() {
  if (signingOut) return;
  signingOut = true;
  clearPrivate();
  $("pair-submit").disabled = true;
  $("logout-retry").disabled = true;
  $("pair-error").textContent = "";
  try {
    await post("/api/logout", {});
    $("logout-retry").hidden = true;
  } catch (error) {
    if (error.name !== "AbortError") {
      $("pair-error").textContent = t("logoutFailed");
      $("logout-retry").hidden = false;
    } else $("logout-retry").hidden = true;
  } finally {
    signingOut = false;
    $("pair-submit").disabled = false;
    $("logout-retry").disabled = false;
  }
}
$("logout").addEventListener("click", signOut);
$("logout-retry").addEventListener("click", signOut);
window.addEventListener("offline", () => connection(false));
$("state-retry").addEventListener("click", () => {
  if (initialStateFailed && restoreSessionAllowed) void loadState();
});
window.addEventListener("online", () => {
  if (restoreSessionAllowed) void loadState();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted && restoreSessionAllowed) {
    clearPrivate();
    restoreSessionAllowed = true;
    void loadState();
  }
});
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  $("install").hidden = false;
});
$("install").addEventListener("click", async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  $("install").hidden = true;
});
window.addEventListener("appinstalled", () => {
  $("install-help").textContent = t("installed");
  $("install").hidden = true;
});
$("push").addEventListener("click", async () => {
  if (!state?.push.available || pushState === "pending" || pushState === "denied") return;
  const generation = epoch;
  pushState = "pending";
  renderPush();
  try {
    const permission = await Notification.requestPermission();
    if (generation !== epoch) return;
    if (permission !== "granted") {
      pushState = "denied";
      return;
    }
    const { publicKey } = await request("/api/push/key");
    const registration = await navigator.serviceWorker.ready;
    if (generation !== epoch) return;
    const key = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), (char) =>
      char.charCodeAt(0),
    );
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });
    if (generation !== epoch) {
      await subscription.unsubscribe();
      return;
    }
    await post("/api/push", subscription.toJSON());
    pushState = "enabled";
  } catch (error) {
    if (error.name !== "AbortError" && generation === epoch) pushState = "failed";
  } finally {
    if (generation === epoch) renderPush();
  }
});
translate();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
// A pairing link must retain its code while the user completes the form.
if (!fragment) void loadState();

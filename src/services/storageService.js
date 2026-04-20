/**
 * storageService.js
 * SINGLE source of truth for all localStorage operations.
 * No other file should touch localStorage directly.
 */

const KEYS = {
  AUTH_USER: "nChatFlow_user",
  AUTH_TOKEN: "nChatFlow_token",
  CHAT_USERS: "chat_users",
  CHAT_MESSAGES: "chat_messages",
  CHAT_SETTINGS: "chat_settings",
  CUSTOM_BACKGROUND: "customBackground",
  PROFILE_PICTURE: "profilePicture",
  ACTIVE_CHAT_ID: "active_chat_id",
  // Unified Theme Keys
  CHAT_BG_TYPE: "nChatFlow_chat_bg_type",
  CHAT_BG_VALUE: "nChatFlow_chat_bg_value",
  BUBBLE_MINE: "nChatFlow_bubble_mine",
  BUBBLE_THEIR: "nChatFlow_bubble_their",
};

const DEFAULT_CHAT_SETTINGS = {
  soundEnabled: true,
  notificationsEnabled: true,
};

let storageAvailable = true;

// ─── Internal helpers ────────────────────────────────────────────────────────

function checkStorage() {
  try {
    const testKey = "__nChatFlow_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable;
}

function readRaw(key) {
  if (!storageAvailable) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    storageAvailable = false;
    return null;
  }
}

function writeRaw(key, value) {
  if (!storageAvailable) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    storageAvailable = false;
    return false;
  }
}

function removeRaw(key) {
  if (!storageAvailable) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    storageAvailable = false;
    return false;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function isStorageAvailable() {
  return checkStorage();
}

// ── Auth User ────────────────────────────────────────────────────────────────

export function getAuthUser() {
  const raw = readRaw(KEYS.AUTH_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthUser(user) {
  return writeRaw(KEYS.AUTH_USER, JSON.stringify(user));
}

export function clearAuthUser() {
  return removeRaw(KEYS.AUTH_USER);
}

export function getAuthToken() {
  const raw = readRaw(KEYS.AUTH_TOKEN);
  return typeof raw === "string" && raw.trim() ? raw : null;
}

export function setAuthToken(token) {
  if (typeof token !== "string") return false;
  const value = token.trim();
  if (!value) return false;
  return writeRaw(KEYS.AUTH_TOKEN, value);
}

export function clearAuthToken() {
  return removeRaw(KEYS.AUTH_TOKEN);
}

// ── Chat Users ───────────────────────────────────────────────────────────────

export function getChatUsers() {
  const raw = readRaw(KEYS.CHAT_USERS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setChatUsers(users) {
  if (!Array.isArray(users)) return false;
  return writeRaw(KEYS.CHAT_USERS, JSON.stringify(users));
}

export function upsertChatUser(user) {
  if (!user || typeof user !== "object" || !user.id) return false;
  const users = getChatUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...user };
  } else {
    users.push(user);
  }
  return setChatUsers(users);
}

// ── Chat Messages ────────────────────────────────────────────────────────────

export function getChatMessages() {
  const raw = readRaw(KEYS.CHAT_MESSAGES);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setChatMessages(messages) {
  if (!Array.isArray(messages)) return false;
  return writeRaw(KEYS.CHAT_MESSAGES, JSON.stringify(messages));
}

// ── Chat Settings ────────────────────────────────────────────────────────────

export function getChatSettings() {
  const raw = readRaw(KEYS.CHAT_SETTINGS);
  if (!raw) return { ...DEFAULT_CHAT_SETTINGS };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_CHAT_SETTINGS };
    }
    return { ...DEFAULT_CHAT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_CHAT_SETTINGS };
  }
}

export function setChatSettings(settings) {
  if (!settings || typeof settings !== "object") return false;
  const merged = { ...DEFAULT_CHAT_SETTINGS, ...settings };
  return writeRaw(KEYS.CHAT_SETTINGS, JSON.stringify(merged));
}

// ── Cropped image caches ──────────────────────────────────────────────────────

export function getCustomBackground() {
  const raw = readRaw(KEYS.CUSTOM_BACKGROUND);
  return typeof raw === "string" ? raw : "";
}

export function setCustomBackground(dataUrl) {
  if (typeof dataUrl !== "string") return false;
  return writeRaw(KEYS.CUSTOM_BACKGROUND, dataUrl);
}

export function getProfilePicture() {
  const raw = readRaw(KEYS.PROFILE_PICTURE);
  return typeof raw === "string" ? raw : "";
}

export function setProfilePicture(dataUrl) {
  if (typeof dataUrl !== "string") return false;
  return writeRaw(KEYS.PROFILE_PICTURE, dataUrl);
}

// ── Active Chat ──────────────────────────────────────────────────────────────

export function getActiveChatId() {
  const raw = readRaw(KEYS.ACTIVE_CHAT_ID);
  return typeof raw === "string" && raw.trim() ? raw : null;
}

export function setActiveChatId(id) {
  if (!id) return clearActiveChatId();
  return writeRaw(KEYS.ACTIVE_CHAT_ID, String(id));
}

export function clearActiveChatId() {
  return removeRaw(KEYS.ACTIVE_CHAT_ID);
}

export function appendChatMessage(message) {
  const messages = getChatMessages();
  messages.push(message);
  return setChatMessages(messages);
}

export function updateChatMessage(id, patch) {
  const messages = getChatMessages();
  const idx = messages.findIndex((m) => m.id === id);
  if (idx < 0) return false;
  messages[idx] = { ...messages[idx], ...patch };
  return setChatMessages(messages);
}

export function getConversationMessages(userAId, userBId) {
  if (!userAId || !userBId) return [];
  const all = getChatMessages();
  return all.filter(
    (m) =>
      (m.senderId === userAId && m.receiverId === userBId) ||
      (m.senderId === userBId && m.receiverId === userAId)
  );
}

// ── Unified Theme ────────────────────────────────────────────────────────────

export function getGenericThemeValue(key) {
  return readRaw(key);
}

export function setGenericThemeValue(key, value) {
  if (value === null) return removeRaw(key);
  return writeRaw(key, String(value));
}

export function getChatThemeKeys() {
  return {
    bgType: KEYS.CHAT_BG_TYPE,
    bgValue: KEYS.CHAT_BG_VALUE,
    mineBubble: KEYS.BUBBLE_MINE,
    theirBubble: KEYS.BUBBLE_THEIR,
  };
}

// ── Clear All ────────────────────────────────────────────────────────────────

export function clearAll() {
  removeRaw(KEYS.AUTH_USER);
  removeRaw(KEYS.AUTH_TOKEN);
  removeRaw(KEYS.CHAT_USERS);
  removeRaw(KEYS.CHAT_MESSAGES);
  removeRaw(KEYS.CHAT_SETTINGS);
  removeRaw(KEYS.CUSTOM_BACKGROUND);
  removeRaw(KEYS.PROFILE_PICTURE);
  removeRaw(KEYS.ACTIVE_CHAT_ID);
  removeRaw(KEYS.CHAT_BG_TYPE);
  removeRaw(KEYS.CHAT_BG_VALUE);
  removeRaw(KEYS.BUBBLE_MINE);
  removeRaw(KEYS.BUBBLE_THEIR);
}

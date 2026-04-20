/**
 * helpers.js
 * Pure utility functions — no side effects, no imports from project files.
 */

import { v4 as uuidv4 } from "uuid";
import { format, isToday, isYesterday, parseISO } from "date-fns";

// ─── ID Generation ────────────────────────────────────────────────────────────

export function generateId() {
  return uuidv4();
}

// ─── Timestamp Formatting ─────────────────────────────────────────────────────

export function formatMessageTime(isoString) {
  if (!isoString) return "";
  try {
    const date = typeof isoString === "string" ? parseISO(isoString) : new Date(isoString);
    return format(date, "h:mm a");
  } catch {
    return "";
  }
}

export function formatSidebarTime(isoString) {
  if (!isoString) return "";
  try {
    const date = typeof isoString === "string" ? parseISO(isoString) : new Date(isoString);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "dd/MM/yyyy");
  } catch {
    return "";
  }
}

export function formatRelativeTimeShort(isoString) {
  if (!isoString) return "";
  try {
    const date = typeof isoString === "string" ? parseISO(isoString) : new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMin < 1) return "now";
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  } catch {
    return "";
  }
}

export function formatLastSeen(isoString) {
  const short = formatRelativeTimeShort(isoString);
  return short ? `last seen ${short} ago` : "last seen recently";
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateUsername(value) {
  if (!value || value.trim().length < 3) return "Username must be at least 3 characters.";
  if (!/^[a-zA-Z0-9_]+$/.test(value.trim()))
    return "Username can only contain letters, numbers, and underscores.";
  return null;
}

export function validatePassword(value) {
  if (!value || value.length < 6) return "Password must be at least 6 characters.";
  return null;
}

export function validateConfirmPassword(password, confirm) {
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

export function validateImageFile(file) {
  if (!file) return "No file selected.";
  if (!file.type.startsWith("image/")) return "Only image files are allowed.";
  if (file.size > 5 * 1024 * 1024) return "Image must be smaller than 5MB.";
  return null;
}

// ─── Avatar / Display Name ────────────────────────────────────────────────────

export function getInitials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

// ─── Fake bot replies ─────────────────────────────────────────────────────────

const BOT_REPLIES = [
  "That's interesting! Tell me more 😊",
  "Haha, totally agree with you on that!",
  "Really? I didn't know that 🤔",
  "Sounds good to me! Let's do it 🙌",
  "Wow, that's amazing! 🎉",
  "I'm not sure about that… what do you think?",
  "lol 😂 classic",
  "Yeah, same here honestly.",
  "That makes a lot of sense!",
  "Okay okay, you got me there 😅",
  "Nice! How's everything else going?",
  "Oh interesting, didn't expect that 🙃",
  "True! Can't argue with that.",
  "Let me think about it… 🤔",
  "100% agree! 🔥",
  "No way! 😱",
];

export function getRandomBotReply() {
  return BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
}

export function getRandomDelay(minMs = 1000, maxMs = 2500) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

export function pickRandomBoolean(probability = 0.5) {
  return Math.random() < probability;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function generateWaveBars(length = 24) {
  return Array.from({ length }, (_, index) => {
    const base = Math.sin(index * 0.8) * 0.5 + 0.5;
    return Math.round(6 + base * 14);
  });
}

// ─── Color palette for avatars ────────────────────────────────────────────────

const AVATAR_COLORS = [
  "from-teal-500 to-emerald-500",
  "from-violet-500 to-purple-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-blue-500",
  "from-lime-500 to-green-500",
  "from-indigo-500 to-violet-500",
  "from-fuchsia-500 to-rose-500",
];

export function getAvatarColor(id) {
  if (!id) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Emoji list ───────────────────────────────────────────────────────────────

export const EMOJI_LIST = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇",
  "🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚",
  "😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔",
  "🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥",
  "😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧",
  "🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐",
  "👍","👎","❤️","🔥","😂","🎉","👏","🙌","💯","✨",
  "😱","🤩","👋","🫡","💀","💪","🫶","🥹","🫠","😤",
];

export const EMOJI_CATEGORIES = {
  Smileys: ["😀", "😃", "😄", "😁", "😂", "😊", "😍", "😎", "🤩", "🥳", "🤔", "😴"],
  Gestures: ["👍", "👎", "👏", "🙌", "👋", "🤝", "🙏", "💪", "🫶", "👌", "✌️", "🤟"],
  Hearts: ["❤️", "💜", "💙", "💚", "🧡", "💛", "🩷", "🫶", "💯", "✨", "🔥", "💫"],
  Nature: ["🌿", "🌸", "🌈", "☀️", "🌙", "⭐", "⚡", "🌊", "🍀", "🌻", "🌴", "❄️"],
};

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

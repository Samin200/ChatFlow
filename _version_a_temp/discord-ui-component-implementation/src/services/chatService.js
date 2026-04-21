/**
 * chatService.js
 * Orchestrates all chat data operations.
 * Delegates to backend API when USE_BACKEND=true, otherwise uses localStorage.
 */

import api from "./api.js";
import {
  getChatMessages,
  setChatMessages,
  appendChatMessage,
  updateChatMessage,
  getConversationMessages,
  getChatSettings,
  setChatSettings,
  getChatUsers,
  upsertChatUser,
} from "./storageService.js";
import { emitSocketEvent } from "./socketService.js";
import { generateId, getRandomBotReply, getRandomDelay } from "../utils/helpers.js";

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === "true";

// ─── Chat Themes ──────────────────────────────────────────────────────────────

export const CHAT_THEMES = {
  midnight: {
    id: "midnight",
    name: "Midnight",
    chatBackground: "#020617",
    headerBackground: "rgba(15, 23, 42, 0.7)",
    inputBackground: "rgba(15, 23, 42, 0.88)",
    mineBubble: "#14b8a6",
    theirBubble: "#1e293b",
    text: "#e2e8f0",
    textMuted: "#94a3b8",
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    chatBackground: "#0c1929",
    headerBackground: "rgba(12, 25, 41, 0.8)",
    inputBackground: "rgba(12, 25, 41, 0.88)",
    mineBubble: "#0891b2",
    theirBubble: "#1e3a5f",
    text: "#e2e8f0",
    textMuted: "#94a3b8",
  },
  forest: {
    id: "forest",
    name: "Forest",
    chatBackground: "#0b1a0b",
    headerBackground: "rgba(11, 26, 11, 0.8)",
    inputBackground: "rgba(11, 26, 11, 0.88)",
    mineBubble: "#16a34a",
    theirBubble: "#1a3a1a",
    text: "#d1fae5",
    textMuted: "#86efac",
  },
  sunset: {
    id: "sunset",
    name: "Sunset",
    chatBackground: "#1a0a1e",
    headerBackground: "rgba(26, 10, 30, 0.8)",
    inputBackground: "rgba(26, 10, 30, 0.88)",
    mineBubble: "#d946ef",
    theirBubble: "#3b1a4a",
    text: "#f5d0fe",
    textMuted: "#e879f9",
  },
  warm: {
    id: "warm",
    name: "Warm",
    chatBackground: "#1c1208",
    headerBackground: "rgba(28, 18, 8, 0.8)",
    inputBackground: "rgba(28, 18, 8, 0.88)",
    mineBubble: "#d97706",
    theirBubble: "#44320a",
    text: "#fef3c7",
    textMuted: "#fbbf24",
  },
};

// ─── Normalize functions ──────────────────────────────────────────────────────

export function normalizeMessage(msg) {
  if (!msg) return null;
  const id = String(msg.id ?? msg._id ?? "");
  if (!id) return null;

  return {
    id,
    chatId: msg.chatId ?? msg.receiverId ?? null,
    senderId: msg.senderId ?? msg.sender?.id ?? null,
    text: msg.content ?? msg.text ?? "",
    type: msg.type ?? "text",
    imageData: msg.imageData ?? msg.attachments?.[0]?.url ?? null,
    attachments: msg.attachments ?? [],
    duration: msg.duration ?? msg.metadata?.duration ?? null,
    metadata: msg.metadata ?? {},
    createdAt: msg.createdAt ?? new Date().toISOString(),
    status: msg.status ?? "sent",
    reactions: msg.reactions ?? {},
    edited: Boolean(msg.isEdited ?? msg.edited),
    deleted: Boolean(msg.isDeleted ?? msg.deleted),
    deletedFor: msg.deletedFor ?? [],
    starredBy: msg.starredBy ?? [],
    mentions: msg.mentions ?? [],
    replyTo: msg.replyTo ?? null,
    sender: msg.sender ?? null,
    linkPreview: msg.linkPreview ?? null,
  };
}

function normalizeChat(chat) {
  if (!chat) return null;
  const id = String(chat.id ?? chat._id ?? "");
  if (!id) return null;
  return {
    id,
    type: chat.type ?? "direct",
    name: chat.name ?? null,
    participants: chat.participants ?? [],
    lastMessage: chat.lastMessage ? normalizeLastMessage(chat.lastMessage) : null,
    updatedAt: chat.updatedAt ?? null,
    isGroup: chat.type === "group",
  };
}

function normalizeLastMessage(lm) {
  if (!lm) return null;
  return {
    id: String(lm.id ?? lm._id ?? ""),
    text: lm.content ?? lm.text ?? "",
    senderId: lm.senderId ?? null,
    createdAt: lm.createdAt ?? null,
    type: lm.type ?? "text",
    status: lm.status ?? "sent",
    deleted: Boolean(lm.isDeleted ?? lm.deleted),
  };
}

function contactFromChat(chat, currentUserId) {
  if (!chat) return null;
  const isGroup = chat.type === "group" || chat.isGroup;
  const otherParticipant = isGroup
    ? null
    : (chat.participants || []).find((p) => {
        const pid = typeof p === "object" ? p.id : p;
        return String(pid) !== String(currentUserId);
      });

  const other = typeof otherParticipant === "object" ? otherParticipant : null;
  return {
    id: chat.id,
    otherUserId: isGroup ? null : (other?.id || (typeof otherParticipant === 'string' ? otherParticipant : null)),
    displayName: isGroup ? (chat.name || "Group") : (other?.displayName ?? other?.username ?? "Unknown"),
    username: isGroup ? null : (other?.username ?? null),
    avatar: isGroup ? null : (other?.avatar ?? null),
    isGroup,
    members: isGroup ? chat.participants : undefined,
    groupRoles: isGroup ? chat.groupRoles : undefined,
    lastMessage: chat.lastMessage ?? null,
    online: other?.isOnline ?? false,
    lastSeen: other?.lastSeenAt ?? null,
    presenceStatus: other?.isOnline ? "online" : "offline",
    unreadCount: chat.unreadCount ?? 0,
    pinned: false,
    muted: false,
    archived: false,
    blocked: false,
  };
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function getContacts(userId) {
  if (!userId) return [];

  if (USE_BACKEND) {
    try {
      const { data } = await api.get("/api/chats");
      const chats = data?.chats || data?.data?.chats || [];
      return chats.map((chat) => {
        const c = normalizeChat(chat);
        return contactFromChat(c ? { ...c, participants: chat.participants } : chat, userId);
      }).filter(Boolean);
    } catch {
      return [];
    }
  }

  return getLocalContacts(userId);
}

function getLocalContacts(userId) {
  const users = getChatUsers().filter((u) => u.id !== userId);
  const allMessages = getChatMessages();
  const settings = getChatSettings();
  const prefs = settings?.chatPrefs ?? {};

  return users
    .map((user) => {
      const convMessages = allMessages.filter(
        (m) =>
          (m.senderId === userId && m.receiverId === user.id) ||
          (m.senderId === user.id && m.receiverId === userId)
      );

      const lastMsg = convMessages.length > 0 ? convMessages[convMessages.length - 1] : null;
      const unread = convMessages.filter(
        (m) => m.senderId === user.id && m.status !== "seen"
      ).length;

      const pref = prefs[user.id] ?? {};

      return {
        id: user.id,
        displayName: user.displayName ?? user.username,
        username: user.username,
        avatar: user.avatar,
        isGroup: false,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              text: lastMsg.text ?? lastMsg.content ?? "",
              senderId: lastMsg.senderId,
              createdAt: lastMsg.createdAt,
              type: lastMsg.type ?? "text",
              status: lastMsg.status ?? "sent",
              deleted: Boolean(lastMsg.deleted),
            }
          : null,
        online: Boolean(user.online),
        lastSeen: user.lastSeenAt ?? null,
        presenceStatus: user.online ? "online" : "offline",
        unreadCount: unread,
        pinned: Boolean(pref.pinned),
        muted: Boolean(pref.muted),
        archived: Boolean(pref.archived),
        blocked: Boolean(pref.blocked),
      };
    })
    .filter((c) => c.lastMessage || c.pinned);
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getVisibleMessages(userId, chatId) {
  if (!userId || !chatId) return [];

  if (USE_BACKEND) {
    try {
      const { data } = await api.get(`/api/messages/${chatId}`, {
        params: { limit: 100 },
      });
      const messages = data?.messages || data?.data?.messages || [];
      return messages.map(normalizeMessage).filter(Boolean);
    } catch {
      return [];
    }
  }

  const all = getChatMessages();
  return all
    .filter(
      (m) =>
        !m.deletedFor?.includes(userId) &&
        ((m.senderId === userId && m.receiverId === chatId) ||
          (m.senderId === chatId && m.receiverId === userId) ||
          m.chatId === chatId)
    )
    .map(normalizeMessage)
    .filter(Boolean);
}

// ─── Send Message ─────────────────────────────────────────────────────────────

export async function sendMessage({ senderId, receiverId, text, type = "text", imageData = null, imageFile = null, duration = null, mentions = [] }) {
  if (USE_BACKEND) {
    try {
      const clientMessageId = `${senderId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      emitSocketEvent("join-chat", { chatId: receiverId });

      // If we have a binary file, use the upload endpoint
      if (type === "image" && imageFile) {
        const formData = new FormData();
        // Bug 1 Fix: Order fields strictly (chatId first, file last)
        formData.append("chatId", String(receiverId));
        formData.append("type", "image");
        formData.append("content", String(text ?? ""));
        formData.append("clientMessageId", String(clientMessageId));
        
        if (mentions && Array.isArray(mentions) && mentions.length > 0) {
          formData.append("mentions", JSON.stringify(mentions));
        }
        
        formData.append("file", imageFile, imageFile.name || `image-${Date.now()}.jpg`);

        const { data } = await api.post("/api/messages/upload", formData);
        const message = normalizeMessage(data?.message || data?.data?.message);
        return { success: true, message };
      }

      const payload = {
        content: text ?? "",
        type,
        attachments: [],
        clientMessageId,
        mentions
      };

      if (type === "image" && imageData) {
        payload.attachments = [{ type: "image", url: imageData }];
      }

      if (duration != null) {
        payload.metadata = { duration };
      }

      const { data } = await api.post(`/api/messages/${receiverId}`, payload);
      const message = normalizeMessage(data?.message || data?.data?.message);
      return { success: true, message };
    } catch (error) {
      return { success: false, error: error?.response?.data?.message || "Failed to send message." };
    }
  }

  const message = {
    id: generateId(),
    senderId,
    receiverId,
    chatId: receiverId,
    text: text ?? "",
    type,
    imageData,
    duration,
    createdAt: new Date().toISOString(),
    status: "sending",
    reactions: {},
    edited: false,
    deleted: false,
    deletedFor: [],
    starredBy: [],
  };

  const ok = appendChatMessage(message);
  if (!ok) return { success: false, error: "Storage full — could not save message." };
  return { success: true, message };
}

// ─── Voice Message ────────────────────────────────────────────────────────────

export async function sendVoiceMessage({ senderId, receiverId, duration = 0, voiceBlob = null }) {
  if (USE_BACKEND) {
    try {
      emitSocketEvent("join-chat", { chatId: receiverId });
      const clientMessageId = `voice-${senderId}-${Date.now()}`;

      if (voiceBlob && voiceBlob.size > 0) {
        const ext = voiceBlob.type?.includes("mp4") ? "m4a" : "webm";
        const formData = new FormData();
        
        // Bug 1 Fix: Order fields strictly (chatId first, file last)
        formData.append("chatId", String(receiverId));
        formData.append("type", "voice");
        formData.append("duration", String(duration));
        formData.append("clientMessageId", String(clientMessageId));
        
        formData.append("file", voiceBlob, `voice-${Date.now()}.${ext}`);

        const { data } = await api.post("/api/messages/upload", formData);
        const message = normalizeMessage(data?.message || data?.data?.message);
        if (message) {
          message.duration = duration;
          message.type = "voice";
        }
        return { success: true, message };
      }

      // Fallback: no blob (shouldn't happen, but handle gracefully)
      const { data } = await api.post(`/api/messages/${receiverId}`, {
        content: "",
        type: "voice",
        attachments: [],
        clientMessageId,
        metadata: { duration },
      });
      const message = normalizeMessage(data?.message || data?.data?.message);
      if (message) {
        message.duration = duration;
        message.type = "voice";
      }
      return { success: true, message };
    } catch (error) {
      return { success: false, error: error?.response?.data?.message || "Failed to send voice message." };
    }
  }

  const message = {
    id: generateId(),
    senderId,
    receiverId,
    chatId: receiverId,
    text: "",
    type: "voice",
    imageData: null,
    duration: duration || 1,
    createdAt: new Date().toISOString(),
    status: "sending",
    reactions: {},
    edited: false,
    deleted: false,
    deletedFor: [],
    starredBy: [],
  };

  const ok = appendChatMessage(message);
  if (!ok) return { success: false, error: "Storage full." };
  return { success: true, message };
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

export function scheduleOutgoingStatusProgress(messageId, onStatusChange) {
  const timer1 = setTimeout(() => onStatusChange("sent"), 800);
  const timer2 = setTimeout(() => onStatusChange("delivered"), 2200);
  return () => {
    clearTimeout(timer1);
    clearTimeout(timer2);
  };
}

export function scheduleBotReply({ senderId, receiverId, onTypingStart, onTypingEnd, onMessage }) {
  const delay = getRandomDelay(1500, 3000);
  const typingTimer = setTimeout(() => onTypingStart?.(), Math.max(80, delay - 1200));
  const replyTimer = setTimeout(() => {
    onTypingEnd?.();
    const reply = {
      id: generateId(),
      senderId,
      receiverId,
      chatId: receiverId,
      text: getRandomBotReply(),
      type: "text",
      imageData: null,
      duration: null,
      createdAt: new Date().toISOString(),
      status: "sent",
      reactions: {},
      edited: false,
      deleted: false,
      deletedFor: [],
      starredBy: [],
    };
    onMessage?.(reply);
  }, delay);
  return () => {
    clearTimeout(typingTimer);
    clearTimeout(replyTimer);
  };
}

// ─── Reactions ────────────────────────────────────────────────────────────────

export async function toggleReaction(messageId, emoji, userId) {
  if (USE_BACKEND) {
    try {
      const { data } = await api.post(`/api/messages/${messageId}/reactions`, { reaction: emoji });
      return {
        success: true,
        message: {
          id: messageId,
          reactions: data?.reactions || {},
        },
      };
    } catch (error) {
      return { success: false, error: error?.response?.data?.message || "Reaction failed." };
    }
  }

  const all = getChatMessages();
  const idx = all.findIndex((m) => m.id === messageId);
  if (idx < 0) return { success: false, error: "Message not found." };

  const msg = all[idx];
  const reactions = { ...(msg.reactions ?? {}) };
  const users = reactions[emoji] ?? [];
  if (users.includes(userId)) {
    reactions[emoji] = users.filter((u) => u !== userId);
    if (reactions[emoji].length === 0) delete reactions[emoji];
  } else {
    reactions[emoji] = [...users, userId];
  }
  all[idx] = { ...msg, reactions };
  setChatMessages(all);
  return { success: true, message: { id: messageId, reactions } };
}

// ─── Mark Read / Seen ─────────────────────────────────────────────────────────

export async function markConversationRead(userId, chatId) {
  if (!userId || !chatId) return;

  if (USE_BACKEND) {
    try {
      await api.post(`/api/messages/${chatId}/read`);
    } catch {
      // silent
    }
    return;
  }

  const all = getChatMessages();
  let changed = false;
  for (const m of all) {
    if (m.senderId !== userId && m.receiverId === userId && m.chatId === chatId && m.status !== "seen") {
      m.status = "seen";
      changed = true;
    }
    if (m.senderId !== userId && m.receiverId === userId && (m.senderId === chatId || m.chatId === chatId) && m.status !== "seen") {
      m.status = "seen";
      changed = true;
    }
  }
  if (changed) setChatMessages(all);
}

export async function markLatestOutgoingSeen(userId, chatId) {
  if (USE_BACKEND) return;
  const all = getChatMessages();
  let changed = false;
  for (const m of all) {
    if (m.senderId === userId && (m.receiverId === chatId || m.chatId === chatId) && m.status !== "seen") {
      m.status = "seen";
      changed = true;
    }
  }
  if (changed) setChatMessages(all);
}

// ─── Local Default Contacts ──────────────────────────────────────────────────

export function seedDefaultContacts() {
  if (USE_BACKEND) return;
  // No-op in backend mode; contacts come from /api/chats
}

// ─── Chat Preferences (Pin/Mute/Archive/Block) ──────────────────────────────

function getChatPrefs(userId) {
  const settings = getChatSettings();
  return settings?.chatPrefs ?? {};
}

function setChatPref(userId, contactId, patch) {
  const settings = getChatSettings();
  const prefs = settings.chatPrefs ?? {};
  prefs[contactId] = { ...(prefs[contactId] ?? {}), ...patch };
  settings.chatPrefs = prefs;
  setChatSettings(settings);
  return { success: true };
}

export function togglePinChat(userId, contactId) {
  const prefs = getChatPrefs(userId);
  const current = Boolean(prefs[contactId]?.pinned);
  return setChatPref(userId, contactId, { pinned: !current });
}

export function toggleMuteChat(userId, contactId) {
  const prefs = getChatPrefs(userId);
  const current = Boolean(prefs[contactId]?.muted);
  return setChatPref(userId, contactId, { muted: !current });
}

export function toggleArchiveChat(userId, contactId) {
  const prefs = getChatPrefs(userId);
  const current = Boolean(prefs[contactId]?.archived);
  return setChatPref(userId, contactId, { archived: !current });
}

export function toggleBlockChat(userId, contactId) {
  const prefs = getChatPrefs(userId);
  const current = Boolean(prefs[contactId]?.blocked);
  setChatPref(userId, contactId, { blocked: !current });
  return { success: true, blocked: !current };
}

export async function getBlockedContacts(userId) {
  if (!userId) return [];
  const prefs = getChatPrefs(userId);
  const blockedIds = Object.entries(prefs)
    .filter(([, v]) => v.blocked)
    .map(([k]) => k);
  return blockedIds.map((id) => ({ id, displayName: id, blocked: true }));
}

export function removeUserFromChatList(userId, contactId) {
  return { success: true };
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export async function createGroupChat({ ownerId, name, memberIds = [] }) {
  if (USE_BACKEND) {
    try {
      const { data } = await api.post("/api/chats", {
        type: "group",
        name,
        participantIds: memberIds,
      });
      const chat = data?.chat || data?.data?.chat;
      if (!chat) return { success: false, error: "Failed to create group." };
      return { success: true, group: normalizeChat(chat) };
    } catch (error) {
      return { success: false, error: error?.response?.data?.message || "Failed to create group." };
    }
  }

  const group = {
    id: generateId(),
    type: "group",
    name,
    isGroup: true,
    participants: [ownerId, ...memberIds],
    lastMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { success: true, group };
}

export async function removeMemberFromGroup(chatId, memberId) {
  if (USE_BACKEND) {
    try {
      const { data } = await api.delete(`/api/chats/${chatId}/members/${memberId}`);
      if (data?.deleted) return { success: true, deleted: true };
      const chat = data?.chat || data?.data?.chat;
      if (!chat) return { success: false, error: "Failed to remove member." };
      return { success: true, chat: normalizeChat(chat) };
    } catch (error) {
      return { success: false, error: error?.response?.data?.message || "Failed to remove member." };
    }
  }
  return { success: true };
}

export async function updateMemberRole(chatId, memberId, role) {
  if (USE_BACKEND) {
    try {
      const { data } = await api.put(`/api/chats/${chatId}/members/${memberId}/role`, { role });
      const chat = data?.chat || data?.data?.chat;
      if (!chat) return { success: false, error: "Failed to update role." };
      return { success: true, chat: normalizeChat(chat) };
    } catch (error) {
      return { success: false, error: error?.response?.data?.message || "Failed to update role." };
    }
  }
  return { success: true };
}

export async function getAddableMembersForGroup(userId, groupId) {
  return [];
}

export async function addMembersToGroup(groupId, memberIds) {
  if (USE_BACKEND) {
    try {
      let finalChat = null;
      for (const memberId of memberIds) {
        const { data } = await api.post(`/api/chats/${groupId}/members`, { memberId });
        finalChat = data?.chat || data?.data?.chat;
      }
      if (!finalChat) return { success: false, error: "Failed to add members." };
      return { success: true, chat: normalizeChat(finalChat) };
    } catch (error) {
      return { success: false, error: error?.response?.data?.message || "Failed to add members." };
    }
  }
  return { success: true };
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export function simulatePresenceTick() {
  if (USE_BACKEND) return;
  // In local mode, no-op — presence ticking is simulated
}

// ─── Edit / Delete ────────────────────────────────────────────────────────────

export async function editMessage(messageId, text, userId) {
  if (USE_BACKEND) {
    try {
      const { data } = await api.put(`/api/messages/${messageId}`, { content: text });
      const message = normalizeMessage(data?.message || data?.data?.message);
      return { success: true, message };
    } catch (error) {
      return { success: false, error: error?.response?.data?.message || "Edit failed." };
    }
  }

  const ok = updateChatMessage(messageId, { text, edited: true, updatedAt: new Date().toISOString() });
  if (!ok) return { success: false, error: "Message not found." };
  return { success: true, message: { id: messageId, text, edited: true } };
}

export async function deleteMessageForMe(messageId, userId) {
  if (USE_BACKEND) {
    // Backend doesn't support "for me" — just hide locally
    return { success: true };
  }

  const all = getChatMessages();
  const idx = all.findIndex((m) => m.id === messageId);
  if (idx < 0) return { success: false, error: "Message not found." };
  all[idx].deletedFor = [...(all[idx].deletedFor ?? []), userId];
  setChatMessages(all);
  return { success: true };
}

export async function deleteMessageForEveryone(messageId, userId) {
  if (USE_BACKEND) {
    try {
      await api.delete(`/api/messages/${messageId}`);
      return { success: true, message: { id: messageId, deleted: true, text: "" } };
    } catch (error) {
      return { success: false, error: error?.response?.data?.message || "Delete failed." };
    }
  }

  const ok = updateChatMessage(messageId, { deleted: true, text: "" });
  if (!ok) return { success: false, error: "Message not found." };
  return { success: true, message: { id: messageId, deleted: true, text: "" } };
}

// ─── Theme Preferences ───────────────────────────────────────────────────────

export function getChatThemePreference(userId, contactId) {
  const settings = getChatSettings();
  const prefs = settings?.themePrefs?.[contactId];
  const themeId = prefs?.themeId ?? "midnight";
  const theme = CHAT_THEMES[themeId] ?? CHAT_THEMES.midnight;

  return {
    themeId,
    chatSide: prefs?.chatSide ?? "default",
    disappearing: Boolean(prefs?.disappearing),
    theme,
    backgroundMode: prefs?.backgroundMode ?? "solid",
    solidColor: prefs?.solidColor ?? theme.chatBackground,
    backgroundStyle: prefs?.backgroundStyle ?? { backgroundColor: theme.chatBackground },
    useCustomSideStyle: Boolean(prefs?.useCustomSideStyle),
    customSideLayout: prefs?.customSideLayout ?? "default",
    mineBubble: prefs?.mineBubble ?? theme.mineBubble,
    theirBubble: prefs?.theirBubble ?? theme.theirBubble,
    showMyAvatarInChat: Boolean(prefs?.showMyAvatarInChat),
  };
}

export function setChatAppearance(userId, contactId, patch) {
  const settings = getChatSettings();
  if (!settings.themePrefs) settings.themePrefs = {};
  settings.themePrefs[contactId] = { ...(settings.themePrefs[contactId] ?? {}), ...patch };
  const ok = setChatSettings(settings);
  if (!ok) return { success: false, error: "Storage error." };
  return { success: true };
}

export function setChatSidePreferences(userId, contactId, patch) {
  return setChatAppearance(userId, contactId, patch);
}

export function toggleChatSide(userId, contactId) {
  const settings = getChatSettings();
  const prefs = settings?.themePrefs?.[contactId] ?? {};
  // Cycle customSideLayout specifically for the side toggle button
  const current = prefs.customSideLayout === "swap" ? "default" : "swap";
  if (!settings.themePrefs) settings.themePrefs = {};
  settings.themePrefs[contactId] = { ...prefs, customSideLayout: current, useCustomSideStyle: true };
  setChatSettings(settings);
  return { success: true, customSideLayout: current };
}

export function toggleDisappearingMessages(userId, contactId) {
  const settings = getChatSettings();
  const prefs = settings?.themePrefs?.[contactId] ?? {};
  const next = !prefs.disappearing;
  if (!settings.themePrefs) settings.themePrefs = {};
  settings.themePrefs[contactId] = { ...prefs, disappearing: next };
  setChatSettings(settings);
  return { success: true, disappearing: next };
}

// ─── Star / Clear / Export ────────────────────────────────────────────────────

export async function toggleStarMessage(messageId, userId) {
  if (USE_BACKEND) {
    // Backend doesn't have star endpoint — store locally
  }

  const all = getChatMessages();
  const idx = all.findIndex((m) => m.id === messageId);
  if (idx < 0) return { success: false, error: "Message not found." };
  const msg = all[idx];
  const starredBy = msg.starredBy ?? [];
  const isStarred = starredBy.includes(userId);
  all[idx] = { ...msg, starredBy: isStarred ? starredBy.filter((u) => u !== userId) : [...starredBy, userId] };
  setChatMessages(all);
  return { success: true, message: all[idx] };
}

export async function getStarredMessages(userId, contactId) {
  const all = getChatMessages();
  return all.filter((m) => (m.starredBy ?? []).includes(userId)).map(normalizeMessage).filter(Boolean);
}

export async function getMediaLinksDocs(userId, contactId) {
  const msgs = await getVisibleMessages(userId, contactId);
  const media = msgs.filter((m) => m.type === "image");
  const links = msgs.filter((m) => m.text && /https?:\/\//.test(m.text));
  return { media, links, docs: [] };
}

export async function clearConversation(userId, contactId) {
  if (USE_BACKEND) {
    return { success: true };
  }
  const all = getChatMessages();
  const remaining = all.filter(
    (m) =>
      !((m.senderId === userId && m.receiverId === contactId) ||
        (m.senderId === contactId && m.receiverId === userId) ||
        m.chatId === contactId)
  );
  setChatMessages(remaining);
  return { success: true };
}

export async function exportConversation(userId, contactId) {
  const msgs = await getVisibleMessages(userId, contactId);
  const content = JSON.stringify(msgs, null, 2);
  return {
    success: true,
    content,
    fileName: `novalink-export-${contactId}-${Date.now()}.json`,
  };
}

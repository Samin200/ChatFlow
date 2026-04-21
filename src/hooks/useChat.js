/**
 * useChat.js
 * Orchestrates chat flow and delegates data mutations to services.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Swal from "sweetalert2";
import {
  getContacts,
  getVisibleMessages,
  sendMessage,
  sendVoiceMessage,
  scheduleOutgoingStatusProgress,
  scheduleBotReply,
  toggleReaction,
  markConversationRead,
  markLatestOutgoingSeen,
  seedDefaultContacts,
  togglePinChat,
  toggleMuteChat,
  toggleArchiveChat,
  toggleBlockChat,
  getBlockedContacts,
  removeUserFromChatList,
  getAddableMembersForGroup,
  addMembersToGroup,
  removeMemberFromGroup,
  updateMemberRole,
  simulatePresenceTick,
  editMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  createGroupChat,
  getChatThemePreference,
  setChatAppearance,
  setChatSidePreferences,
  toggleChatSide,
  toggleDisappearingMessages,
  clearConversation,
  exportConversation,
  toggleStarMessage,
  getStarredMessages,
  getMediaLinksDocs,
  CHAT_THEMES,
  normalizeMessage,
} from "../services/chatService.js";
import { getSession } from "../services/authService.js";
import { playIncomingSound } from "../services/soundService.js";
import {
  connectSocket,
  subscribeSocketEvent,
  emitSocketEvent,
} from "../services/socketService.js";
import {
  getAuthToken,
  getActiveChatId,
  setActiveChatId,
  clearActiveChatId,
} from "../services/storageService.js";

const SHOULD_USE_SOCKET = import.meta.env.VITE_USE_WEBSOCKET === "true";
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === "true";
const DEFAULT_SETTINGS = {
  soundEnabled: true,
  notificationsEnabled: true,
};

function normalizeMessagePayload(payload) {
  const msg = payload?.message || payload?.data?.message || payload;
  return normalizeMessage(msg);
}

export function useChat(currentUser, chatIdFromRoute) {
  const [contacts, setContacts] = useState([]);
  const [activeContactId, setActiveContactIdState] = useState(chatIdFromRoute || getActiveChatId);
  const [messages, setMessages] = useState([]);
  const [typingByChat, setTypingByChat] = useState({});
  const [storageError, setStorageError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [toasts, setToasts] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [inputFocusToken, setInputFocusToken] = useState(0);
  const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toolPanel, setToolPanel] = useState(null);
  const [toolPanelPayload, setToolPanelPayload] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [groupAddCandidates, setGroupAddCandidates] = useState([]);

  const botCleanupRef = useRef(null);
  const outgoingStatusCleanup = useRef(new Map());
  const toastTimersRef = useRef(new Map());
  const scrollPositionsRef = useRef(new Map());
  const currentUserRef = useRef(currentUser);
  const activeContactIdRef = useRef(activeContactId);
  const contactsRef = useRef(contacts);
  const soundEnabled = Boolean(settings?.soundEnabled ?? true);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    activeContactIdRef.current = activeContactId;
  }, [activeContactId]);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  const setTypingState = useCallback((chatId, isTyping) => {
    setTypingByChat((prev) => {
      const next = { ...prev };
      if (isTyping) {
        next[chatId] = true;
      } else {
        delete next[chatId];
      }
      return next;
    });
  }, []);

  const pushToast = useCallback((payload) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, ...payload }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      toastTimersRef.current.delete(id);
    }, 3000);
    toastTimersRef.current.set(id, timer);
  }, []);

  const dismissToast = useCallback((id) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Track pending refresh to prevent duplicate concurrent calls
  const refreshPendingRef = useRef(false);
  
  const refreshContacts = useCallback(async () => {
    if (!currentUser || refreshPendingRef.current) return;
    refreshPendingRef.current = true;
    try {
      const raw = await getContacts(currentUser.id);
      setContacts(raw);
    } finally {
      refreshPendingRef.current = false;
    }
  }, [currentUser]);

  // Throttled version for high-frequency socket events (max once per 2 seconds)
  const throttledRefreshRef = useRef(null);
  const throttledRefreshContacts = useCallback(() => {
    if (throttledRefreshRef.current) return;
    throttledRefreshRef.current = setTimeout(() => {
      throttledRefreshRef.current = null;
    }, 2000);
    refreshContacts();
  }, [refreshContacts]);

  useEffect(() => {
    if (!currentUser) return;
    seedDefaultContacts();
    refreshContacts();
  }, [currentUser, refreshContacts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase());
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!currentUser || !SHOULD_USE_SOCKET) return;

    const session = getSession?.();
    const token = getAuthToken() || currentUser?.token || session?.token || null;
    if (!token) return;

    connectSocket(token);

    const unsubs = [
      subscribeSocketEvent("message:new", async (rawIncoming) => {
        const incoming = normalizeMessagePayload(rawIncoming);
        const me = currentUserRef.current;
        if (!me?.id || !incoming) return;

        const activeId = activeContactIdRef.current;
        const incomingChatId = incoming?.chatId || incoming?.receiverId || incoming?.chat?.id;
        const isForActive = activeId && String(incomingChatId) === String(activeId);

        if (isForActive) {
          setMessages((prev) => {
            // Check if message already exists by real ID
            if (prev.some((msg) => msg.id === incoming.id)) return prev;

            // Check if this is our own message coming back via socket
            // Remove any temp message with same content from us
            const isFromMe = String(incoming.senderId) === String(me.id);
            if (isFromMe) {
              const tempIndex = prev.findIndex(
                (msg) => msg._isTemp && msg.senderId === me.id && msg.text === incoming.text
              );
              if (tempIndex !== -1) {
                // Replace temp message with real one
                const newMessages = [...prev];
                newMessages[tempIndex] = incoming;
                return newMessages;
              }
            }

            return [...prev, incoming];
          });
          await markConversationRead(me.id, activeId);
        } else {
          const senderId = String(incoming?.senderId ?? incoming?.sender?.id ?? "");
          const senderContact = contactsRef.current.find((c) => String(c.id) === senderId);
          if (!senderContact?.muted) {
            if (soundEnabled) {
              playIncomingSound();
            }
            pushToast({
              title: senderContact?.displayName ?? "New message",
              message: incoming.text || "New message",
            });
          }
        }

        throttledRefreshContacts();
      }),
      subscribeSocketEvent("message:update", (rawUpdatedMessage) => {
        const updatedMessage = normalizeMessagePayload(rawUpdatedMessage);
        if (!updatedMessage?.id) return;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg))
        );
        throttledRefreshContacts();
      }),
      subscribeSocketEvent("message:delete", (payload) => {
        const messageId = payload?.id ?? payload?.messageId;
        if (!messageId) return;
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        throttledRefreshContacts();
      }),
      subscribeSocketEvent("reaction:update", (rawUpdatedMessage) => {
        const updatedMessage = normalizeMessagePayload(rawUpdatedMessage);
        if (!updatedMessage?.id) return;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg))
        );
      }),
      subscribeSocketEvent("typing:start", (payload) => {
        const chatId = payload?.meta?.chatId;
        if (chatId) setTypingState(chatId, true);
      }),
      subscribeSocketEvent("typing:stop", (payload) => {
        const chatId = payload?.meta?.chatId;
        if (chatId) setTypingState(chatId, false);
      }),
      subscribeSocketEvent("user:online", () => {
        throttledRefreshContacts();
      }),
      subscribeSocketEvent("user:offline", () => {
        throttledRefreshContacts();
      }),
      subscribeSocketEvent("message:status", (payload) => {
        const { messageId, status, chatId } = payload?.data || {};
        const metaChatId = payload?.meta?.chatId;
        const activeId = activeContactIdRef.current;
        
        const targetChatId = chatId || metaChatId;
        if (targetChatId && String(targetChatId) !== String(activeId)) return;

        setMessages((prev) => {
          if (messageId) {
            return prev.map((msg) => (msg.id === messageId ? { ...msg, status } : msg));
          }
          // If no specific messageId, update all outgoing messages in the chat (e.g., seen event)
          return prev.map((msg) =>
            msg.senderId === currentUserRef.current?.id && msg.status !== "seen"
              ? { ...msg, status }
              : msg
          );
        });
        throttledRefreshContacts();
      }),
      subscribeSocketEvent("chat:created", (payload) => {
        const chat = payload?.chat || payload?.data?.chat;
        if (chat?.id) {
          emitSocketEvent("join-chat", { chatId: chat.id });
          refreshContacts();
        }
      }),
    ];
    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [currentUser, soundEnabled, pushToast, refreshContacts, throttledRefreshContacts, setTypingState]);

  useEffect(() => {
    if (!currentUser) return;
    // Reduced from 8s to 30s to optimize performance
    const interval = setInterval(() => {
      simulatePresenceTick();
      refreshContacts();
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser, refreshContacts]);

  useEffect(() => {
    if (!currentUser || !activeContactId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const run = async () => {
      // Parallelize fetching to improve speed
      const [msgs] = await Promise.all([
        getVisibleMessages(currentUser.id, activeContactId),
        markConversationRead(currentUser.id, activeContactId),
        refreshContacts()
      ]);

      if (cancelled) return;
      setMessages(msgs);
      setInputFocusToken((v) => v + 1);
    };

    run();

    return () => {
      cancelled = true;
      botCleanupRef.current?.();
    };
  }, [currentUser, activeContactId, refreshContacts]);

  useEffect(() => {
    if (chatIdFromRoute) {
      setActiveContactIdState(chatIdFromRoute);
      activeContactIdRef.current = chatIdFromRoute;
      setActiveChatId(chatIdFromRoute);
    } else {
      setActiveContactIdState(null);
      activeContactIdRef.current = null;
      clearActiveChatId();
    }
  }, [chatIdFromRoute]);

  const selectContact = useCallback((id) => {
    setActiveContactIdState(id);
    activeContactIdRef.current = id;
    if (id) {
      setActiveChatId(id);
    } else {
      clearActiveChatId();
    }
    // Note: The actual navigation is handled in ChatPage.jsx via wrapping this call 
    // or by letting it bubble up.
  }, []);

  const clearActiveContact = useCallback(() => {
    setActiveContactIdState(null);
    activeContactIdRef.current = null;
    clearActiveChatId();
    setMessages([]);
  }, []);

  const handleSendMessage = useCallback(
    async ({ text, type = "text", imageData = null, imageFile = null, duration = null, voiceBlob = null, mentions = [] }) => {
      if (!currentUser || !activeContactId) return;

      setStorageError(null);

      // Create optimistic temp message with "sending" status for instant UI feedback
      const tempId = `temp-${currentUser.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const tempMessage = {
        id: tempId,
        senderId: currentUser.id,
        receiverId: activeContactId,
        chatId: activeContactId,
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
        sender: currentUser,
        _isTemp: true,
      };

      // Add temp message to UI immediately (shows clock icon)
      setMessages((prev) => [...prev, tempMessage]);

      const sender =
        type === "voice"
          ? await sendVoiceMessage({ senderId: currentUser.id, receiverId: activeContactId, duration: duration ?? 0, voiceBlob })
          : await sendMessage({
              senderId: currentUser.id,
              receiverId: activeContactId,
              text,
              type,
              imageData,
              imageFile,
              duration,
              mentions
            });

      if (!sender.success) {
        setStorageError(sender.error);
        // Remove temp message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      // Replace temp message with actual message from server
      // (or remove temp if socket already added the real message)
      if (sender.message) {
        setMessages((prev) => {
          // Check if real message already exists (from socket)
          if (prev.some((m) => m.id === sender.message.id)) {
            // Remove temp message only
            return prev.filter((m) => m.id !== tempId);
          }
          // Replace temp with real message
          return prev.map((m) =>
            m.id === tempId
              ? { ...sender.message, status: sender.message.status || "sent" }
              : m
          );
        });
      }

      const shouldRunBotFallback = !USE_BACKEND;

      if (sender.success && !SHOULD_USE_SOCKET && sender.message) {
        // Message already replaced above, don't add duplicate
      }

      if (sender.success && sender.message && !USE_BACKEND) {
        const statusCleanup = scheduleOutgoingStatusProgress(sender.message.id, (status) => {
          setMessages((prev) => prev.map((m) => (m.id === sender.message.id ? { ...m, status } : m)));
          if (status === "delivered") {
            outgoingStatusCleanup.current.get(sender.message.id)?.();
            outgoingStatusCleanup.current.delete(sender.message.id);
          }
        });
        outgoingStatusCleanup.current.set(sender.message.id, statusCleanup);
      }

      botCleanupRef.current?.();
      if (!shouldRunBotFallback) {
        await refreshContacts();
        return;
      }

      // Keep the dummy bot frontend-only: 1-2s delay, typing state, then reply.
      const fallbackDelay = 1000 + Math.floor(Math.random() * 1000);
      const fallbackTypingTimer = setTimeout(() => {
        setTypingState(activeContactId, true);
      }, Math.max(80, fallbackDelay - 900));
      const fallbackReplyTimer = setTimeout(async () => {
        setTypingState(activeContactId, false);
        const fallbackReply = {
          id: `bot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          senderId: activeContactId,
          receiverId: currentUser.id,
          text: (text || "").trim() ? `Echo: ${text}` : "Got it.",
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

        await markLatestOutgoingSeen(currentUser.id, activeContactId);
        if (activeContactId === fallbackReply.senderId) {
          await markConversationRead(currentUser.id, fallbackReply.senderId);
        }

        setMessages((prev) => {
          const seenUpdated = [...prev].map((msg) =>
            msg.senderId === currentUser.id && msg.receiverId === activeContactId && msg.status !== "seen"
              ? { ...msg, status: "seen" }
              : msg
          );
          return [...seenUpdated, fallbackReply];
        });

        await refreshContacts();
      }, fallbackDelay);

      const serviceCleanup = scheduleBotReply({
        senderId: activeContactId,
        receiverId: currentUser.id,
        onTypingStart: () => setTypingState(activeContactId, true),
        onTypingEnd: () => setTypingState(activeContactId, false),
        onMessage: async (reply) => {
          clearTimeout(fallbackTypingTimer);
          clearTimeout(fallbackReplyTimer);
          await markLatestOutgoingSeen(currentUser.id, activeContactId);
          if (activeContactId === reply.senderId) {
            await markConversationRead(currentUser.id, reply.senderId);
          }
          setMessages((prev) => {
            const seenUpdated = [...prev].map((msg) =>
              msg.senderId === currentUser.id && msg.receiverId === activeContactId && msg.status !== "seen"
                ? { ...msg, status: "seen" }
                : msg
            );
            return [...seenUpdated, reply];
          });

          if (activeContactId !== reply.senderId) {
            const senderContact = contacts.find((c) => c.id === reply.senderId);
            if (!senderContact?.muted) {
              if (soundEnabled) {
                playIncomingSound();
              }
              pushToast({
                title: senderContact?.displayName ?? "New message",
                message: reply.text || "New message",
              });
            }
          }

          await refreshContacts();
        },
      });

      botCleanupRef.current = () => {
        clearTimeout(fallbackTypingTimer);
        clearTimeout(fallbackReplyTimer);
        setTypingState(activeContactId, false);
        if (typeof serviceCleanup === "function") {
          serviceCleanup();
        }
      };

      await refreshContacts();
    },
    [currentUser, activeContactId, contacts, refreshContacts, setTypingState, pushToast, soundEnabled]
  );

  const handleReaction = useCallback(
    async (messageId, emoji) => {
      if (!currentUser) return;
      try {
        const result = await toggleReaction(messageId, emoji, currentUser.id);
        if (!result.success) {
          setStorageError(result.error);
          return;
        }
        setStorageError(null);
        if (result.message?.id) {
          setMessages((prev) => prev.map((m) => (m.id === result.message.id ? { ...m, ...result.message } : m)));
        }
      } catch {
        setStorageError("Could not update reaction.");
      }
    },
    [currentUser]
  );

  const handleEditMessage = useCallback(
    async (messageId, text) => {
      if (!currentUser) return;
      try {
        const result = await editMessage(messageId, text, currentUser.id);
        if (!result.success) {
          setStorageError(result.error);
          return;
        }
        setStorageError(null);
        if (result.message?.id) {
          setMessages((prev) => prev.map((m) => (m.id === result.message.id ? { ...m, ...result.message } : m)));
        }
      } catch {
        setStorageError("Could not edit message.");
      }
    },
    [currentUser]
  );

  const handleDeleteMessage = useCallback(
    async (messageId, mode = "me") => {
      if (!currentUser) return;
      try {
        const result =
          mode === "everyone"
            ? await deleteMessageForEveryone(messageId, currentUser.id)
            : await deleteMessageForMe(messageId, currentUser.id);

        if (!result.success) {
          setStorageError(result.error);
          return;
        }

        if (mode === "everyone" && result.message?.id) {
          setMessages((prev) => prev.map((m) => (m.id === result.message.id ? { ...m, ...result.message } : m)));
        } else if (activeContactId) {
          const refreshed = await getVisibleMessages(currentUser.id, activeContactId);
          setMessages(refreshed);
        }
        setStorageError(null);
        await refreshContacts();
      } catch {
        setStorageError("Could not delete message.");
      }
    },
    [currentUser, activeContactId, refreshContacts]
  );

  const handleTogglePin = useCallback(
    (contactId) => {
      if (!currentUser) return;
      const result = togglePinChat(currentUser.id, contactId);
      if (!result.success) {
        setStorageError(result.error);
      } else {
        setStorageError(null);
        refreshContacts();
      }
    },
    [currentUser, refreshContacts]
  );

  const handleToggleMute = useCallback(
    (contactId) => {
      if (!currentUser) return;
      const result = toggleMuteChat(currentUser.id, contactId);
      if (!result.success) {
        setStorageError(result.error);
      } else {
        setStorageError(null);
        refreshContacts();
      }
    },
    [currentUser, refreshContacts]
  );

  const handleToggleArchive = useCallback(
    (contactId) => {
      if (!currentUser) return;
      const result = toggleArchiveChat(currentUser.id, contactId);
      if (!result.success) {
        setStorageError(result.error);
      } else {
        setStorageError(null);
        if (contactId === activeContactId) {
          clearActiveContact();
        }
        refreshContacts();
      }
    },
    [currentUser, activeContactId, clearActiveContact, refreshContacts]
  );

  const handleCreateGroup = useCallback(
    async (name, memberIds = []) => {
      if (!currentUser?.id) return { success: false, error: "No active user." };

      try {
        const result = await createGroupChat({ ownerId: currentUser.id, name, memberIds });
        if (!result.success) {
          setStorageError(result.error);
          return result;
        }

        setStorageError(null);
        await refreshContacts();
        if (result.group?.id) {
          setActiveContactId(result.group.id);
        }
        return result;
      } catch {
        const result = { success: false, error: "Could not create group." };
        setStorageError(result.error);
        return result;
      }
    },
    [currentUser, refreshContacts]
  );

  const handleOpenStarred = useCallback(() => {
    setToolPanel({ type: "starred", contactId: activeContactId ?? null });
  }, [activeContactId]);

  const handleReadAll = useCallback(async () => {
    if (!currentUser?.id) return;
    await Promise.all(contacts.map((contact) => markConversationRead(currentUser.id, contact.id)));
    await refreshContacts();
    pushToast({
      title: "All read",
      message: "All conversations are marked as read.",
    });
  }, [contacts, currentUser?.id, pushToast, refreshContacts]);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const closeToolPanel = useCallback(() => {
    setToolPanel(null);
  }, []);

  const handleToggleSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const nextValue = typeof value === "boolean" ? value : !Boolean(prev?.[key]);
      const next = { ...prev, [key]: nextValue };
      if (key === "soundEnabled" && nextValue) {
        playIncomingSound();
      }
      return next;
    });
  }, []);

  const handleOpenBlockedUsers = useCallback(() => {
    setIsBlockedUsersOpen(true);
  }, []);

  const closeBlockedUsers = useCallback(() => {
    setIsBlockedUsersOpen(false);
  }, []);

  const handleToggleBlock = useCallback(
    async (contactId) => {
      if (!currentUser || !contactId) return;

      const contact = contacts.find((item) => item.id === contactId);
      const currentlyBlocked = Boolean(contact?.blocked);

      if (!currentlyBlocked) {
        const confirm = await Swal.fire({
          title: "Block user?",
          text: `You will stop receiving notifications from ${contact?.displayName ?? "this user"}.`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Block",
          cancelButtonText: "Cancel",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          confirmButtonColor: "var(--color-neutral)",
          cancelButtonColor: "var(--color-background)",
        });
        if (!confirm.isConfirmed) return;
      }

      const result = toggleBlockChat(currentUser.id, contactId);
      if (!result.success) {
        setStorageError(result.error);
        return;
      }
      setStorageError(null);
      refreshContacts();
      pushToast({
        title: result.blocked ? "User blocked" : "User unblocked",
        message: result.blocked
          ? "You will no longer get notifications from this user."
          : "Notifications from this user are enabled again.",
      });

      if (result.blocked) {
        await Swal.fire({
          title: "User blocked",
          text: `${contact?.displayName ?? "User"} has been blocked.`,
          icon: "success",
          timer: 1400,
          showConfirmButton: false,
          background: "var(--color-surface)",
          color: "var(--color-text)",
        });
      }
    },
    [contacts, currentUser, refreshContacts, pushToast]
  );

  const handleRemoveUser = useCallback(
    (contactId) => {
      if (!currentUser || !contactId) return;
      const result = removeUserFromChatList(currentUser.id, contactId);
      if (!result.success) {
        setStorageError(result.error);
        return;
      }
      if (contactId === activeContactId) {
        clearActiveContact();
      }
      refreshContacts();
      pushToast({
        title: "User removed",
        message: "The chat has been removed from your list.",
      });
    },
    [currentUser, activeContactId, clearActiveContact, refreshContacts, pushToast]
  );

  const handleInviteFriends = useCallback(() => {
    pushToast({
      title: "Invite Friends",
      message: "Invite flow is ready for backend integration.",
    });
  }, [pushToast]);

  const handleInviteByLink = useCallback(async () => {
    const inviteLink = `https://ChatFlow.app/invite/${currentUser?.id ?? "guest"}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      pushToast({
        title: "Invite link copied",
        message: inviteLink,
      });
    } catch {
      pushToast({
        title: "Invite link",
        message: inviteLink,
      });
    }
  }, [currentUser?.id, pushToast]);

  const handleToggleStar = useCallback(
    async (messageId) => {
      if (!currentUser?.id || !messageId) return;
      try {
        const result = await toggleStarMessage(messageId, currentUser.id);
        if (!result.success) {
          setStorageError(result.error);
          return;
        }
        if (result.message?.id) {
          setMessages((prev) => prev.map((m) => (m.id === result.message.id ? { ...m, ...result.message } : m)));
        }
        setStorageError(null);
      } catch {
        setStorageError("Could not toggle star.");
      }
    },
    [currentUser?.id]
  );

  const handleChangeTheme = useCallback(
    (contactId, patch) => {
      if (!currentUser?.id || !contactId) return;
      const result = setChatAppearance(currentUser.id, contactId, patch);
      if (!result.success) {
        setStorageError(result.error);
        return;
      }
      setStorageError(null);
      refreshContacts();
    },
    [currentUser?.id, refreshContacts]
  );

  const handleUpdateChatSides = useCallback(
    (contactId, patch) => {
      if (!currentUser?.id || !contactId) return;
      const result = setChatSidePreferences(currentUser.id, contactId, patch);
      if (!result.success) {
        setStorageError(result.error);
        return;
      }
      setStorageError(null);
      refreshContacts();
    },
    [currentUser?.id, refreshContacts]
  );

  const handleToggleChatSide = useCallback(
    (contactId) => {
      if (!currentUser?.id || !contactId) return;
      const result = toggleChatSide(currentUser.id, contactId);
      if (!result.success) {
        setStorageError(result.error);
        return;
      }
      setStorageError(null);
      refreshContacts();
      pushToast({
        title: "Chat side updated",
        message: result.chatSide === "compact" ? "Compact bubble side enabled." : "Default bubble side restored.",
      });
    },
    [currentUser?.id, pushToast, refreshContacts]
  );

  const handleToggleDisappearing = useCallback(
    (contactId) => {
      if (!currentUser?.id || !contactId) return;
      const result = toggleDisappearingMessages(currentUser.id, contactId);
      if (!result.success) {
        setStorageError(result.error);
        return;
      }
      setStorageError(null);
      refreshContacts();
      pushToast({
        title: "Disappearing messages",
        message: result.disappearing ? "Disappearing messages enabled." : "Disappearing messages disabled.",
      });
    },
    [currentUser?.id, pushToast, refreshContacts]
  );

  const handleClearChat = useCallback(
    async (contactId) => {
      if (!currentUser?.id || !contactId) return;

      const contact = contacts.find((item) => item.id === contactId);
      const confirm = await Swal.fire({
        title: "Clear chat?",
        text: `This will permanently remove all messages with ${contact?.displayName ?? "this chat"}.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Clear chat",
        cancelButtonText: "Cancel",
        background: "var(--color-surface)",
        color: "var(--color-text)",
        confirmButtonColor: "var(--color-neutral)",
        cancelButtonColor: "var(--color-background)",
      });

      if (!confirm.isConfirmed) return;

      const result = await clearConversation(currentUser.id, contactId);
      if (!result.success) {
        setStorageError(result.error);
        return;
      }
      setStorageError(null);
      if (contactId === activeContactId) {
        setMessages([]);
      }
      await refreshContacts();
      pushToast({ title: "Chat cleared", message: "All messages in this conversation were removed." });

      await Swal.fire({
        title: "Chat cleared",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
        background: "var(--color-surface)",
        color: "var(--color-text)",
      });
    },
    [activeContactId, contacts, currentUser?.id, pushToast, refreshContacts]
  );

  const handleExportChat = useCallback(
    async (contactId) => {
      if (!currentUser?.id || !contactId) return;
      try {
        const result = await exportConversation(currentUser.id, contactId);
        if (!result.success) {
          setStorageError(result.error);
          return;
        }

        const blob = new Blob([result.content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = result.fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        setStorageError(null);
        pushToast({ title: "Chat exported", message: result.fileName });
      } catch {
        setStorageError("Could not export chat.");
        pushToast({ title: "Export failed", message: "Could not generate chat export file." });
      }
    },
    [currentUser?.id, pushToast]
  );

  const handleGroupAction = useCallback(
    (action, contactId) => {
      if (!contactId) return;

      switch (action) {
        case "group_info":
          setToolPanel({ type: "group_info", contactId });
          return;
        case "group_media":
          setToolPanel({ type: "media_links_docs", contactId });
          return;
        case "search":
          setToolPanel({ type: "search", contactId });
          return;
        case "mute_notifications":
          handleToggleMute(contactId);
          return;
        case "disappearing_messages":
          handleToggleDisappearing(contactId);
          return;
        case "chat_theme":
          setToolPanel({ type: "chat_theme", contactId });
          return;
        case "chat_sides":
          setToolPanel({ type: "chat_sides", contactId });
          return;
        case "block_user":
          handleToggleBlock(contactId);
          return;
        case "clear_chat":
          handleClearChat(contactId);
          return;
        case "exit_group":
          handleRemoveUser(contactId);
          return;
        default:
          return;
      }
    },
    [handleClearChat, handleRemoveUser, handleToggleBlock, handleToggleDisappearing, handleToggleMute]
  );

  const handleAddMembersToGroup = useCallback(
    async (groupId, memberIds) => {
      if (!groupId) return { success: false, error: "Group is required." };
      try {
        const result = await addMembersToGroup(groupId, memberIds);
        if (!result.success) {
          setStorageError(result.error);
          return result;
        }

        setStorageError(null);
        await refreshContacts();
        pushToast({
          title: "Members added",
          message: `${memberIds.length} member${memberIds.length === 1 ? "" : "s"} added to the group.`,
        });
        return result;
      } catch {
        const result = { success: false, error: "Could not add members." };
        setStorageError(result.error);
        return result;
      }
    },
    [refreshContacts, pushToast]
  );

  const handleRemoveMemberFromGroup = useCallback(
    async (groupId, memberId) => {
      if (!groupId || !memberId) return { success: false, error: "Missing parameters." };
      try {
        const result = await removeMemberFromGroup(groupId, memberId);
        if (!result.success) {
          setStorageError(result.error);
          return result;
        }

        setStorageError(null);
        await refreshContacts();
        return result;
      } catch {
        const result = { success: false, error: "Could not remove member." };
        setStorageError(result.error);
        return result;
      }
    },
    [refreshContacts]
  );
  
  const handleUpdateMemberRole = useCallback(
    async (groupId, memberId, role) => {
      if (!groupId || !memberId || !role) return { success: false, error: "Missing parameters." };
      try {
        const result = await updateMemberRole(groupId, memberId, role);
        if (!result.success) {
          setStorageError(result.error);
          return result;
        }

        setStorageError(null);
        await refreshContacts();
        return result;
      } catch {
        const result = { success: false, error: "Could not update role." };
        setStorageError(result.error);
        return result;
      }
    },
    [refreshContacts]
  );

  const handleDirectChatAction = useCallback(
    (action, contactId) => {
      if (!contactId) return;

      switch (action) {
        case "pinned_messages":
          setToolPanel({ type: "starred", contactId });
          return;
        case "search":
          setToolPanel({ type: "search", contactId });
          return;
        case "media_links_docs":
          setToolPanel({ type: "media_links_docs", contactId });
          return;
        case "disappearing_messages":
          handleToggleDisappearing(contactId);
          return;
        case "chat_theme":
          setToolPanel({ type: "chat_theme", contactId });
          return;
        case "chat_sides":
          setToolPanel({ type: "chat_sides", contactId });
          return;
        case "clear_chat":
          handleClearChat(contactId);
          return;
        case "export_chat":
          handleExportChat(contactId);
          return;
        default:
          return;
      }
    },
    [handleClearChat, handleExportChat, handleToggleBlock, handleToggleDisappearing]
  );

  const activeContact = useMemo(
    () => contacts.find((c) => c.id === activeContactId) ?? null,
    [contacts, activeContactId]
  );

  const activeChatAppearance = useMemo(() => {
    if (!currentUser?.id || !activeContactId) {
      const fallback = CHAT_THEMES.midnight;
      return {
        themeId: fallback.id,
        chatSide: "default",
        disappearing: false,
        theme: fallback,
      };
    }
    return getChatThemePreference(currentUser.id, activeContactId);
  }, [currentUser?.id, activeContactId, contacts]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!toolPanel || !currentUser?.id) {
        if (!cancelled) setToolPanelPayload(null);
        return;
      }

      const contact = contacts.find((item) => item.id === toolPanel.contactId) ?? null;

      if (toolPanel.type === "starred") {
        const starredMessages = await getStarredMessages(currentUser.id, toolPanel.contactId ?? null);
        if (!cancelled) {
          setToolPanelPayload({
            ...toolPanel,
            contact,
            messages: starredMessages,
          });
        }
        return;
      }

      if (toolPanel.type === "media_links_docs") {
        const mediaPayload = await getMediaLinksDocs(currentUser.id, toolPanel.contactId);
        if (!cancelled) {
          setToolPanelPayload({
            ...toolPanel,
            contact,
            ...mediaPayload,
          });
        }
        return;
      }

      if (toolPanel.type === "search") {
        const searchMessages = await getVisibleMessages(currentUser.id, toolPanel.contactId);
        if (!cancelled) {
          setToolPanelPayload({
            ...toolPanel,
            contact,
            messages: searchMessages,
          });
        }
        return;
      }

      if (toolPanel.type === "group_info") {
        if (!cancelled) {
          setToolPanelPayload({
            ...toolPanel,
            contact,
          });
        }
        return;
      }

      if (toolPanel.type === "chat_theme") {
        const appearance = getChatThemePreference(currentUser.id, toolPanel.contactId);
        if (!cancelled) {
          setToolPanelPayload({
            ...toolPanel,
            contact,
            appearance,
            themes: Object.values(CHAT_THEMES),
          });
        }
        return;
      }

      if (toolPanel.type === "chat_sides") {
        const appearance = getChatThemePreference(currentUser.id, toolPanel.contactId);
        if (!cancelled) {
          setToolPanelPayload({
            ...toolPanel,
            contact,
            appearance,
          });
        }
        return;
      }

      if (!cancelled) {
        setToolPanelPayload({ ...toolPanel, contact });
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [contacts, currentUser?.id, messages, toolPanel]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!currentUser?.id) {
        if (!cancelled) setBlockedUsers([]);
        return;
      }
      const nextBlocked = await getBlockedContacts(currentUser.id);
      if (!cancelled) {
        setBlockedUsers(nextBlocked);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, contacts]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!currentUser?.id || !activeContact?.isGroup) {
        if (!cancelled) setGroupAddCandidates([]);
        return;
      }

      const candidates = await getAddableMembersForGroup(currentUser.id, activeContact.id);
      if (!cancelled) {
        setGroupAddCandidates(candidates);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeContact?.id, activeContact?.isGroup, activeContact?.members, contacts, currentUser?.id]);

  const saveScrollPosition = useCallback((contactId, top) => {
    if (!contactId) return;
    scrollPositionsRef.current.set(contactId, top);
  }, []);

  const getSavedScrollPosition = useCallback((contactId) => {
    if (!contactId) return 0;
    return scrollPositionsRef.current.get(contactId) ?? 0;
  }, []);

  const filteredContacts = useMemo(() => {
    if (!debouncedSearch) return contacts;
    return contacts.filter(
      (c) =>
        String(c?.displayName ?? "").toLowerCase().includes(debouncedSearch) ||
        String(c?.username ?? "").toLowerCase().includes(debouncedSearch)
    );
  }, [contacts, debouncedSearch]);

  const contactsWithMeta = useMemo(() => {
    return filteredContacts.map((contact) => ({
      ...contact,
      lastMessage: contact.lastMessage ?? null,
      unreadCount: activeContactId === contact.id ? 0 : Number(contact.unreadCount ?? 0),
    }));
  }, [filteredContacts, currentUser?.id, messages, activeContactId]);

  const chatSections = useMemo(() => {
    const sorted = [...contactsWithMeta].sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    const pinned = sorted.filter((c) => c.pinned && !c.archived);
    const archived = sorted.filter((c) => c.archived);
    const regular = sorted.filter((c) => !c.pinned && !c.archived);
    return { pinned, regular, archived };
  }, [contactsWithMeta]);

  const isTyping = Boolean(activeContactId && typingByChat[activeContactId]);

  useEffect(() => {
    return () => {
      botCleanupRef.current?.();
      outgoingStatusCleanup.current.forEach((cleanup) => cleanup());
      outgoingStatusCleanup.current.clear();
      toastTimersRef.current.forEach((timer) => clearTimeout(timer));
      toastTimersRef.current.clear();
    };
  }, []);

  const handleEmitTypingStart = useCallback(() => {
    if (!activeContactId || !SHOULD_USE_SOCKET) return;
    emitSocketEvent("typing:start", { chatId: activeContactId });
  }, [activeContactId]);

  const handleEmitTypingStop = useCallback(() => {
    if (!activeContactId || !SHOULD_USE_SOCKET) return;
    emitSocketEvent("typing:stop", { chatId: activeContactId });
  }, [activeContactId]);

  return {
    contacts,
    contactsWithMeta,
    chatSections,
    activeContact,
    activeContactId,
    messages,
    isTyping,
    typingByChat,
    storageError,
    searchQuery,
    toasts,
    soundEnabled,
    settings,
    isSettingsOpen,
    toolPanel: toolPanelPayload,
    activeChatAppearance,
    inputFocusToken,
    setSearchQuery,
    dismissToast,
    closeSettings,
    closeToolPanel,
    selectContact,
    clearActiveContact,
    handleSendMessage,
    handleReaction,
    handleToggleStar,
    handleEditMessage,
    handleDeleteMessage,
    handleTogglePin,
    handleToggleMute,
    handleToggleArchive,
    handleCreateGroup,
    handleOpenStarred,
    handleReadAll,
    handleOpenSettings,
    handleToggleSetting,
    handleChangeTheme,
    handleUpdateChatSides,
    handleToggleChatSide,
    handleInviteFriends,
    handleInviteByLink,
    handleOpenBlockedUsers,
    closeBlockedUsers,
    handleToggleBlock,
    handleRemoveUser,
    handleGroupAction,
    handleAddMembersToGroup,
    handleRemoveMemberFromGroup,
    handleUpdateMemberRole,
    handleDirectChatAction,
    groupAddCandidates,
    blockedUsers,
    isBlockedUsersOpen,
    refreshContacts,
    saveScrollPosition,
    getSavedScrollPosition,
    handleEmitTypingStart,
    handleEmitTypingStop,
  };
}

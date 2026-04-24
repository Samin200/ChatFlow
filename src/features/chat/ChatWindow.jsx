import { useState } from "react";
import ChatHeader from "./ChatHeader.jsx";
import MessageList from "./MessageList.jsx";
import MessageInput from "./MessageInput.jsx";
import { useEffect, useLayoutEffect, useRef, useCallback } from "react";
import ContactProfileModal from "./ContactProfileModal.jsx";
import AddMembersModal from "./AddMembersModal.jsx";
import Swal from "sweetalert2";

export default function ChatWindow({
  currentUser,
  activeContact,
  activeContactId,
  messages,
  isMessagesLoading,
  isTyping,
  storageError,
  onSend,
  onReact,
  onEditMessage,
  onDeleteMessage,
  onBack,
  onInviteFriends,
  onInviteByLink,
  onOpenBlockedUsers,
  onToggleBlock,
  onRemoveUser,
  onGroupAction,
  onAddMembersToGroup,
  onDirectChatAction,
  onToggleStar,
  groupAddCandidates,
  activeChatAppearance,
  appTheme,
  inputFocusToken,
  saveScrollPosition,
  getSavedScrollPosition,
  onTypingStart,
  onTypingStop,
  onInitiateCall,
}) {
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [isContactProfileOpen, setIsContactProfileOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  
  const scrollContainerRef = useRef(null);
  const lastMessagesCountRef = useRef(messages.length);
  const isInitialLoadRef = useRef(true);

  const scrollToBottom = useCallback((behavior = "auto") => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior
      });
    }
  }, []);

  // Reset initial load state when switching chats
  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [activeContactId]);

  useLayoutEffect(() => {
    if (isMessagesLoading || !messages.length) return;

    if (isInitialLoadRef.current) {
      const saved = getSavedScrollPosition?.(activeContactId);
      if (saved !== undefined && saved !== null) {
        scrollContainerRef.current.scrollTop = saved;
      } else {
        // Use requestAnimationFrame to ensure height is calculated after children mount
        requestAnimationFrame(() => {
          scrollToBottom("auto");
        });
      }
      isInitialLoadRef.current = false;
    } else {
      const currentCount = messages.length;
      const prevCount = lastMessagesCountRef.current;
      lastMessagesCountRef.current = currentCount;

      if (currentCount > prevCount) {
        const lastMsg = messages[messages.length - 1];
        const isMyMessage = lastMsg?.senderId === currentUser?.id;
        const container = scrollContainerRef.current;
        const isAtBottom = container && (container.scrollTop + container.clientHeight >= container.scrollHeight - 150);

        if (isMyMessage || isAtBottom) {
          scrollToBottom("smooth");
        }
      }
    }
  }, [messages, isMessagesLoading, activeContactId, getSavedScrollPosition, scrollToBottom, currentUser?.id]);

  function handleEdit(message) {
    setEditingMessage(message);
    setReplyTo(null);
  }

  function handleDelete(messageId) {
    Swal.fire({
      title: "Delete message?",
      text: "This action cannot be undone.",
      icon: "warning",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Delete for everyone",
      denyButtonText: "Delete for me",
      cancelButtonText: "Cancel",
      background: "var(--color-surface)",
      color: "var(--color-text)",
      confirmButtonColor: "var(--color-primary)",
      denyButtonColor: "rgba(255,255,255,0.1)",
    }).then((result) => {
      if (result.isConfirmed) {
        onDeleteMessage?.(messageId, "everyone");
        setSelectedMessage(null);
      } else if (result.isDenied) {
        onDeleteMessage?.(messageId, "me");
        setSelectedMessage(null);
      }
    });
  }

  const isDefaultChatTheme =
    (activeChatAppearance?.themeId === "midnight" || !activeChatAppearance?.themeId) &&
    (activeChatAppearance?.backgroundMode === "solid" || !activeChatAppearance?.backgroundMode) &&
    (!activeChatAppearance?.solidColor ||
      String(activeChatAppearance?.solidColor).toLowerCase() ===
        String(activeChatAppearance?.theme?.chatBackground ?? "").toLowerCase());

  const isDefaultChatSides =
    !activeChatAppearance?.useCustomSideStyle &&
    (activeChatAppearance?.customSideLayout ?? "default") === "default";

  const forceLightThemeForDefaults = appTheme?.name === "Light";
  const useAppThemeForHeader = isDefaultChatTheme || forceLightThemeForDefaults;
  const useAppThemeForBackground = isDefaultChatTheme;
  const useAppThemeForBubbles = isDefaultChatSides;

  const resolvedTheme = {
    ...(activeChatAppearance?.theme ?? {}),
    headerBackground: useAppThemeForHeader
      ? "color-mix(in srgb, var(--color-surface) 82%, transparent)"
      : activeChatAppearance?.theme?.headerBackground,
    inputBackground: useAppThemeForHeader
      ? "color-mix(in srgb, var(--color-surface) 88%, transparent)"
      : activeChatAppearance?.theme?.inputBackground,
    mineBubble: useAppThemeForBubbles
      ? "var(--color-accent)"
      : activeChatAppearance?.theme?.mineBubble,
    theirBubble: useAppThemeForBubbles
      ? "var(--color-surface)"
      : activeChatAppearance?.theme?.theirBubble,
  };

  const resolvedAppearance = {
    ...activeChatAppearance,
    theme: resolvedTheme,
    mineBubble: useAppThemeForBubbles
      ? "var(--color-accent)"
      : (activeChatAppearance?.mineBubble || resolvedTheme.mineBubble),
    theirBubble: useAppThemeForBubbles
      ? "var(--color-surface)"
      : (activeChatAppearance?.theirBubble || resolvedTheme.theirBubble),
    backgroundStyle: useAppThemeForBackground
      ? { backgroundColor: "var(--color-background)", backgroundImage: "none" }
      : activeChatAppearance?.backgroundStyle,
  };

  return (
    <div
      className="relative isolate flex flex-col h-full min-h-0"
      style={resolvedAppearance?.backgroundStyle ?? { backgroundColor: resolvedTheme?.chatBackground ?? "var(--color-background)" }}
    >
      <ChatHeader
        currentUser={currentUser}
        contact={activeContact}
        isTyping={isTyping}
        appTheme={appTheme}
        onBack={onBack}
        onOpenProfile={() => setIsContactProfileOpen(true)}
        onOpenAddMembers={() => setIsAddMembersOpen(true)}
        onInviteFriends={onInviteFriends}
        onInviteByLink={onInviteByLink}
        onOpenBlockedUsers={onOpenBlockedUsers}
        onToggleBlock={onToggleBlock}
        onRemoveUser={onRemoveUser}
        onGroupAction={onGroupAction}
        onDirectChatAction={onDirectChatAction}
        onInitiateCall={onInitiateCall}
        headerBackground={resolvedTheme?.headerBackground}
        selectedMessage={selectedMessage}
        onClearSelection={() => { setSelectedMessage(null); setEditingMessage(null); }}
        onReply={(msg) => { setReplyTo(msg); setSelectedMessage(null); }}
        onToggleStar={(msgId) => { 
          const id = msgId || selectedMessage?.id;
          if (id) onToggleStar?.(id); 
          setSelectedMessage(null); 
        }}
        onDelete={(msgId) => { handleDelete(msgId); }}
        onEdit={(msg) => { handleEdit(msg); setSelectedMessage(null); }}
      />

      <div 
        ref={scrollContainerRef}
        onScroll={() => {
          if (scrollContainerRef.current) {
            saveScrollPosition?.(activeContactId, scrollContainerRef.current.scrollTop);
          }
        }}
        className="flex-1 overflow-y-auto min-h-0"
      >
        <MessageList
          messages={messages}
          currentUser={currentUser}
          activeContact={activeContact}
          activeContactId={activeContactId}
          isMessagesLoading={isMessagesLoading}
          isTyping={isTyping}
          onReact={onReact}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStar={onToggleStar}
          onOpenImage={setFullscreenImage}
          onReply={setReplyTo}
          chatSide={resolvedAppearance?.chatSide}
          appearance={resolvedAppearance}
          selectedMessageId={selectedMessage?.id}
          onSelectMessage={setSelectedMessage}
          scrollToBottom={scrollToBottom}
        />
      </div>

      <MessageInput
        onSend={(data) => {
          if (editingMessage) {
            onEditMessage?.(editingMessage.id, data.text);
            setEditingMessage(null);
          } else {
            onSend?.({ ...data, replyToMessageId: replyTo?.id });
            setReplyTo(null);
          }
        }}
        disabled={!activeContact}
        activeContact={activeContact}
        storageError={storageError}
        inputFocusToken={inputFocusToken}
        theme={resolvedTheme}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
      />

      {fullscreenImage && (
        <button
          onClick={() => setFullscreenImage(null)}
          className="fixed inset-0 z-50 bg-black/85 p-4 flex items-center justify-center animate-in fade-in duration-200"
        >
          <img src={fullscreenImage} alt="Fullscreen" className="max-h-full max-w-full object-contain rounded-xl animate-image-zoom" />
        </button>
      )}

      <ContactProfileModal
        contact={activeContact}
        open={isContactProfileOpen}
        onClose={() => setIsContactProfileOpen(false)}
      />

      <AddMembersModal
        open={isAddMembersOpen}
        candidates={groupAddCandidates}
        onClose={() => setIsAddMembersOpen(false)}
        onSubmit={(memberIds) => onAddMembersToGroup?.(activeContact?.id, memberIds)}
      />
    </div>
  );
}

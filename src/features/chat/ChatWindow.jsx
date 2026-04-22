import { useState } from "react";
import ChatHeader from "./ChatHeader.jsx";
import MessageList from "./MessageList.jsx";
import MessageInput from "./MessageInput.jsx";
import ContactProfileModal from "./ContactProfileModal.jsx";
import AddMembersModal from "./AddMembersModal.jsx";

export default function ChatWindow({
  currentUser,
  activeContact,
  activeContactId,
  messages,
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

  function handleEdit(message) {
    const next = window.prompt("Edit message", message.text ?? "");
    if (next === null) return;
    onEditMessage?.(message.id, next);
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
      />

      <MessageList
        messages={messages}
        currentUser={currentUser}
        activeContact={activeContact}
        activeContactId={activeContactId}
        isTyping={isTyping}
        onReact={onReact}
        onEdit={handleEdit}
        onDelete={onDeleteMessage}
        onToggleStar={onToggleStar}
        onOpenImage={setFullscreenImage}
        saveScrollPosition={saveScrollPosition}
        getSavedScrollPosition={getSavedScrollPosition}
        chatSide={resolvedAppearance?.chatSide}
        appearance={resolvedAppearance}
      />

      <MessageInput
        onSend={onSend}
        disabled={!activeContact}
        activeContact={activeContact}
        storageError={storageError}
        inputFocusToken={inputFocusToken}
        theme={resolvedTheme}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
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

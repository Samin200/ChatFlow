import { useCallback, useEffect, useMemo, useState } from "react";
import ChatSidebar from "./ChatSidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import BlockedUsersModal from "./BlockedUsersModal.jsx";
import SettingsModal from "./SettingsModal.jsx";
import ChatToolModal from "./ChatToolModal.jsx";
import AppThemeModal from "./AppThemeModal.jsx";
import { applyTheme, findTheme, getActiveThemeName, getAppThemes } from "../../utils/appTheme";
import ChatFlowIcon from "../../components/ChatFlowIcon.jsx";

export default function ChatLayout({
  currentUser,
  chatSections,
  activeContact,
  activeContactId,
  messages,
  isMessagesLoading,
  isTyping,
  storageError,
  soundEnabled,
  settings,
  isSettingsOpen,
  toolPanel,
  activeChatAppearance,
  searchQuery,
  onSearchChange,
  onSelectContact,
  onSend,
  onReact,
  onEditMessage,
  onDeleteMessage,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  onToggleSound,
  inputFocusToken,
  saveScrollPosition,
  getSavedScrollPosition,
  onCreateGroup,
  onOpenStarred,
  onReadAll,
  onOpenSettings,
  onCloseSettings,
  onToggleSetting,
  onInviteFriends,
  onInviteByLink,
  onOpenBlockedUsers,
  onCloseBlockedUsers,
  onToggleBlock,
  onRemoveUser,
  onGroupAction,
  onAddMembersToGroup,
  onRemoveMemberFromGroup,
  onUpdateMemberRole,
  onDirectChatAction,
  onCloseToolPanel,
  onChangeTheme,
  onUpdateChatSides,
  onToggleChatSide,
  onToggleStarMessage,
  onInitiateCall,
  groupAddCandidates,
  blockedUsers,
  isBlockedUsersOpen,
  onClearContact,
  onLogout,
  onUpdateProfile,
  onOpenAdminPanel,
  onTypingStart,
  onTypingStop,
}) {
  // Mobile: show sidebar ("list") or chat window ("chat")
  const [mobileView, setMobileView] = useState("list");
  const [isAppThemeOpen, setIsAppThemeOpen] = useState(false);
  const [appTheme, setAppTheme] = useState(() => {
    const themes = getAppThemes();
    return findTheme(themes, getActiveThemeName());
  });

  useEffect(() => {
    if (!appTheme) return;
    // Keep CSS variables in sync with the currently selected app theme.
    applyTheme(appTheme);
  }, [appTheme]);

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const syncScreenMode = () => setIsDesktop(mediaQuery.matches);
    syncScreenMode();
    mediaQuery.addEventListener("change", syncScreenMode);
    return () => mediaQuery.removeEventListener("change", syncScreenMode);
  }, []);

  useEffect(() => {
    if (activeContactId) {
      setMobileView("chat");
    }
  }, [activeContactId]);

  const handleSelectContact = useCallback((contactId) => {
    onSelectContact(contactId);
    setMobileView("chat");
  }, [onSelectContact]);

  const handleBack = useCallback(() => {
    onClearContact();
    setMobileView("list");
  }, [onClearContact]);

  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);

  function handleTouchStart(event) {
    setTouchStartX(event.touches[0]?.clientX ?? 0);
    setTouchStartY(event.touches[0]?.clientY ?? 0);
  }

  function handleTouchEnd(event) {
    if (isDesktop) return;
    if (mobileView !== "chat") return;
    const endX = event.changedTouches[0]?.clientX ?? 0;
    const endY = event.changedTouches[0]?.clientY ?? 0;
    const distance = endX - touchStartX;
    const verticalTravel = Math.abs(endY - touchStartY);

    // Ignore mostly vertical gestures so message scrolling remains smooth.
    if (touchStartX < 44 && distance > 80 && verticalTravel < 48) {
      handleBack();
    }
  }

  const handleOpenAppTheme = useCallback(() => {
    setIsAppThemeOpen(true);
  }, []);

  const handleCloseAppTheme = useCallback(() => {
    setIsAppThemeOpen(false);
  }, []);

  const chatPanel = useMemo(() => {
    if (activeContact) {
      return (
        <ChatWindow
          currentUser={currentUser}
          activeContact={activeContact}
          activeContactId={activeContactId}
          messages={messages}
          isMessagesLoading={isMessagesLoading}
          isTyping={isTyping}
          storageError={storageError}
          onSend={onSend}
          onReact={onReact}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onBack={handleBack}
          onInviteFriends={onInviteFriends}
          onInviteByLink={onInviteByLink}
          onOpenBlockedUsers={onOpenBlockedUsers}
          onToggleBlock={onToggleBlock}
          onRemoveUser={onRemoveUser}
          onGroupAction={onGroupAction}
          onAddMembersToGroup={onAddMembersToGroup}
          onDirectChatAction={onDirectChatAction}
          onToggleStar={onToggleStarMessage}
          onInitiateCall={onInitiateCall}
          groupAddCandidates={groupAddCandidates}
          activeChatAppearance={activeChatAppearance}
          appTheme={appTheme}
          inputFocusToken={inputFocusToken}
          saveScrollPosition={saveScrollPosition}
          getSavedScrollPosition={getSavedScrollPosition}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
        />
      );
    }

    return (
      <EmptyState />
    );
  }, [
    activeContact,
    activeContactId,
    activeChatAppearance,
    appTheme,
    currentUser,
    getSavedScrollPosition,
    groupAddCandidates,
    handleBack,
    inputFocusToken,
    isMessagesLoading,
    isTyping,
    messages,
    onAddMembersToGroup,
    onDeleteMessage,
    onDirectChatAction,
    onEditMessage,
    onGroupAction,
    onReact,
    onRemoveUser,
    onSend,
    onToggleBlock,
    onToggleStarMessage,
    saveScrollPosition,
    storageError,
    onTypingStart,
    onTypingStop,
  ]);

  return (
    <div
      className="h-full min-h-0 w-full relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {isDesktop ? (
        <div className="grid h-full min-h-0 w-full grid-cols-[22rem_minmax(0,1fr)] lg:grid-cols-[24rem_minmax(0,1fr)]">
          <div className="h-full min-h-0 min-w-0">
            <ChatSidebar
              currentUser={currentUser}
              chatSections={chatSections}
              activeContactId={activeContactId}
              appTheme={appTheme}
              soundEnabled={soundEnabled}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              onSelectContact={handleSelectContact}
              onTogglePin={onTogglePin}
              onToggleMute={onToggleMute}
              onToggleArchive={onToggleArchive}
              onToggleSound={onToggleSound}
              onCreateGroup={onCreateGroup}
              onOpenStarred={onOpenStarred}
              onReadAll={onReadAll}
              onOpenAppTheme={handleOpenAppTheme}
              onOpenSettings={onOpenSettings}
              onOpenAdminPanel={onOpenAdminPanel}
              onLogout={onLogout}
              onUpdateProfile={onUpdateProfile}
            />
          </div>

          <div className="h-full min-h-0 min-w-0 flex flex-col">{chatPanel}</div>
        </div>
      ) : (
        <div className="relative h-full min-h-0 w-full overflow-hidden">
          <div
            className={`absolute inset-0 transition-transform duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
              mobileView === "chat" ? "-translate-x-[30%] opacity-50" : "translate-x-0 opacity-100"
            }`}
          >
            <ChatSidebar
              currentUser={currentUser}
              chatSections={chatSections}
              activeContactId={activeContactId}
              appTheme={appTheme}
              soundEnabled={soundEnabled}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              onSelectContact={handleSelectContact}
              onTogglePin={onTogglePin}
              onToggleMute={onToggleMute}
              onToggleArchive={onToggleArchive}
              onToggleSound={onToggleSound}
              onCreateGroup={onCreateGroup}
              onOpenStarred={onOpenStarred}
              onReadAll={onReadAll}
              onOpenAppTheme={handleOpenAppTheme}
              onOpenSettings={onOpenSettings}
              onOpenAdminPanel={onOpenAdminPanel}
              onLogout={onLogout}
              onUpdateProfile={onUpdateProfile}
            />
          </div>

          <div
            className={`absolute inset-0 transition-transform duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] z-10 shadow-2xl ${
              mobileView === "chat" ? "translate-x-0" : "translate-x-full"
            }`}
            style={mobileView !== "chat" ? { display: "none" } : { display: "flex" }}
          >
            <div className="h-full min-h-0 min-w-0 flex flex-col w-full">{chatPanel}</div>
          </div>
        </div>
      )}

      <BlockedUsersModal
        open={isBlockedUsersOpen}
        users={blockedUsers}
        onClose={onCloseBlockedUsers}
        onUnblock={onToggleBlock}
      />

      <SettingsModal
        open={isSettingsOpen}
        settings={settings}
        onClose={onCloseSettings}
        onToggleSetting={onToggleSetting}
      />

      <AppThemeModal
        open={isAppThemeOpen}
        onClose={handleCloseAppTheme}
        onThemeApplied={setAppTheme}
      />

      <ChatToolModal
        currentUser={currentUser}
        panel={toolPanel}
        onClose={onCloseToolPanel}
        onChangeTheme={onChangeTheme}
        onUpdateChatSides={onUpdateChatSides}
        onToggleChatSide={onToggleChatSide}
        onToggleStar={onToggleStarMessage}
        onAddMembersToGroup={onAddMembersToGroup}
        onRemoveMemberFromGroup={onRemoveMemberFromGroup}
        onUpdateMemberRole={onUpdateMemberRole}
        groupAddCandidates={groupAddCandidates}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col h-full">
      {/* Header placeholder */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/8 backdrop-blur-sm"
        style={{ background: "color-mix(in srgb, var(--color-surface) 84%, transparent)" }}
      >
        <div className="flex items-center gap-3">
          <ChatFlowIcon className="h-10 w-10 rounded-full" />
          <div>
            <h1 className="font-bold" style={{ color: "var(--color-text)" }}>ChatFlow</h1>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Your messages await</p>
          </div>
        </div>
      </div>

      {/* Empty state body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
        {/* Animated illustration */}
        <div className="relative">
          <ChatFlowIcon className="h-24 w-24 rounded-3xl" />
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>
            Welcome to ChatFlow
          </h2>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: "var(--color-text-muted)" }}>
            Select a conversation from the sidebar to start chatting. Your messages are private and stored locally.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 60%, transparent)" }} />
            <span>Real-time messaging with instant delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--color-secondary) 60%, transparent)" }} />
            <span>Emoji reactions on any message</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 60%, transparent)" }} />
            <span>Image sharing with preview</span>
          </div>
        </div>
      </div>
    </div>
  );
}

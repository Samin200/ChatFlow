import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatLayout from "../features/chat/ChatLayout.jsx";
import { useChat } from "../hooks/useChat.js";
import AdminPage from "./AdminPage.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { useCallContext } from "../providers/CallProvider.jsx";

export default function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, handleLogout, handleUpdateProfile } = useAuth();
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Sync with useChat
  const {
    chatSections,
    activeContact,
    activeContactId,
    messages,
    isTyping,
    storageError,
    searchQuery,
    setSearchQuery,
    selectContact,
    clearActiveContact,
    handleSendMessage,
    handleReaction,
    handleEditMessage,
    handleDeleteMessage,
    handleTogglePin,
    handleToggleMute,
    handleToggleArchive,
    soundEnabled,
    settings,
    isSettingsOpen,
    toolPanel,
    activeChatAppearance,
    inputFocusToken,
    saveScrollPosition,
    getSavedScrollPosition,
    handleCreateGroup,
    handleOpenStarred,
    handleReadAll,
    handleOpenSettings,
    closeSettings,
    closeToolPanel,
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
    handleToggleStar,
    handleEmitTypingStart,
    handleEmitTypingStop,
    isMessagesLoading,
  } = useChat(currentUser, chatId);

  const handleCallEnded = useCallback((endedChatId, durationStr, isVideo) => {
    handleSendMessage({
      text: `📞 ${isVideo ? "Video" : "Voice"} call ended · ${durationStr}`,
      type: "text",
      chatId: endedChatId
    });
  }, [handleSendMessage]);

  const onCreateGroup = useCallback(async (name, memberIds) => {
    const result = await handleCreateGroup(name, memberIds);
    if (result?.success && result.group?.id) {
      onSelectContact(result.group.id);
    }
    return result;
  }, [handleCreateGroup, onSelectContact]);

  const voiceCall = useCallContext();

  // When a contact is selected, navigate to the URL
  function onSelectContact(id) {
    if (id) {
      navigate(`/chat/${id}`);
    } else {
      navigate("/");
    }
  }

  function onLogout() {
    handleLogout();
    navigate("/login");
  }

  if (!currentUser?.id) {
    return (
      <div className="h-[100dvh] w-full bg-slate-950 text-slate-200 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-slate-400">We could not load your chat session.</p>
          <button
            onClick={onLogout}
            className="mt-4 px-4 py-2 rounded-lg bg-teal-500/20 border border-teal-400/40 text-teal-200 hover:bg-teal-500/30 transition-colors"
          >
            Back To Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] min-h-0 w-full overflow-hidden relative"
      style={{ backgroundColor: "var(--color-background)", color: "var(--color-text)" }}
    >
      <ChatLayout
        currentUser={currentUser}
        chatSections={chatSections}
        activeContact={activeContact}
        activeContactId={activeContactId}
        messages={messages}
        isMessagesLoading={isMessagesLoading}
        isTyping={isTyping}
        storageError={storageError}
        soundEnabled={soundEnabled}
        settings={settings}
        isSettingsOpen={isSettingsOpen}
        toolPanel={toolPanel}
        activeChatAppearance={activeChatAppearance}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectContact={onSelectContact}
        onSend={handleSendMessage}
        onReact={handleReaction}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onTogglePin={handleTogglePin}
        onToggleStarMessage={handleToggleStar}
        onToggleMute={handleToggleMute}
        onToggleArchive={handleToggleArchive}
        onToggleSound={() => handleToggleSetting("soundEnabled")}
        inputFocusToken={inputFocusToken}
        saveScrollPosition={saveScrollPosition}
        getSavedScrollPosition={getSavedScrollPosition}
        onClearContact={() => navigate("/")}
        onCreateGroup={onCreateGroup}
        onOpenStarred={handleOpenStarred}
        onReadAll={handleReadAll}
        onOpenSettings={handleOpenSettings}
        onCloseSettings={closeSettings}
        onToggleSetting={handleToggleSetting}
        onCloseToolPanel={closeToolPanel}
        onChangeTheme={handleChangeTheme}
        onUpdateChatSides={handleUpdateChatSides}
        onToggleChatSide={handleToggleChatSide}
        onInitiateCall={(targetId, isVideo) => {
          if (activeContact) {
             const targetContact = { ...activeContact, id: targetId };
             voiceCall.startCall(targetContact, activeContactId);
          }
        }}
        onInviteFriends={handleInviteFriends}
        onInviteByLink={handleInviteByLink}
        onOpenBlockedUsers={handleOpenBlockedUsers}
        onCloseBlockedUsers={closeBlockedUsers}
        onToggleBlock={handleToggleBlock}
        onRemoveUser={handleRemoveUser}
        onGroupAction={handleGroupAction}
        onAddMembersToGroup={handleAddMembersToGroup}
        onRemoveMemberFromGroup={handleRemoveMemberFromGroup}
        onUpdateMemberRole={handleUpdateMemberRole}
        onDirectChatAction={handleDirectChatAction}
        groupAddCandidates={groupAddCandidates}
        blockedUsers={blockedUsers}
        isBlockedUsersOpen={isBlockedUsersOpen}
        onLogout={onLogout}
        onUpdateProfile={handleUpdateProfile}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onTypingStart={handleEmitTypingStart}
        onTypingStop={handleEmitTypingStop}
      />

      {Boolean(currentUser?.isAdmin) && isAdminPanelOpen && (
        <AdminPage
          currentUser={currentUser}
          onLogout={onLogout}
          onClose={() => setIsAdminPanelOpen(false)}
          onOpenChat={(id) => {
            if (!id) return;
            onSelectContact(id);
            setIsAdminPanelOpen(false);
          }}
        />
      )}
    </div>
  );
}

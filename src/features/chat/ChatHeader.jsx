import { getInitials, getAvatarColor, formatLastSeen } from "../../utils/helpers.js";
import { ArrowLeft, Phone, Video } from "lucide-react";
import ChatMenu from "./ChatMenu.jsx";
import ChatFlowIcon from "../../components/ChatFlowIcon.jsx";

export default function ChatHeader({
  contact,
  isTyping,
  appTheme,
  onBack,
  onOpenProfile,
  onOpenAddMembers,
  onInviteFriends,
  onInviteByLink,
  onOpenBlockedUsers,
  onToggleBlock,
  onRemoveUser,
  onGroupAction,
  onDirectChatAction,
  onInitiateCall,
  headerBackground,
}) {
  const textColor = "var(--color-text)";
  const mutedColor = "var(--color-text-muted)";

  if (!contact) {
    return (
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/8 backdrop-blur-sm"
        style={{ background: "color-mix(in srgb, var(--color-surface) 84%, transparent)" }}
      >
        <div className="flex items-center gap-3">
          <ChatFlowIcon className="h-10 w-10 rounded-full" />
          <div>
            <h1 className="font-bold text-lg leading-tight" style={{ color: textColor }}>
              ChatFlow
            </h1>
            <p className="text-xs" style={{ color: mutedColor }}>Select a conversation</p>
          </div>
        </div>
      </div>
    );
  }

  const avatarColor = getAvatarColor(contact.id);

  const groupItems = [
    { label: "Add Members", onClick: () => onOpenAddMembers?.() },
    { label: "Group Info", onClick: () => onGroupAction?.("group_info", contact.id) },
    { label: "Group Media", onClick: () => onGroupAction?.("group_media", contact.id) },
    { label: "Search", onClick: () => onGroupAction?.("search", contact.id) },
    {
      label: contact?.muted ? "Unmute Notifications" : "Mute Notifications",
      onClick: () => onGroupAction?.("mute_notifications", contact.id),
    },
    { label: "Disappearing Messages", onClick: () => onGroupAction?.("disappearing_messages", contact.id) },
    { label: "Chat Theme", onClick: () => onGroupAction?.("chat_theme", contact.id) },
    { label: "Chat Sides", onClick: () => onGroupAction?.("chat_sides", contact.id) },
    { label: "Clear Chat", onClick: () => onGroupAction?.("clear_chat", contact.id), danger: true },
    { label: "Exit Group", onClick: () => onGroupAction?.("exit_group", contact.id), danger: true },
  ];

  const directChatItems = [
    {
      label: "Pinned Messages",
      onClick: () => onDirectChatAction?.("pinned_messages", contact.id),
    },
    { label: "Search", onClick: () => onDirectChatAction?.("search", contact.id) },
    {
      label: "Media, Links, and Docs",
      onClick: () => onDirectChatAction?.("media_links_docs", contact.id),
    },
    {
      label: "Disappearing Messages",
      onClick: () => onDirectChatAction?.("disappearing_messages", contact.id),
    },
    { label: "Chat Theme", onClick: () => onDirectChatAction?.("chat_theme", contact.id) },
    { label: "Chat Sides", onClick: () => onDirectChatAction?.("chat_sides", contact.id) },
    { label: contact?.blocked ? "Unblock User" : "Block User", onClick: () => onDirectChatAction?.("block_user", contact.id), danger: Boolean(!contact?.blocked) },
    { label: "Clear Chat", onClick: () => onDirectChatAction?.("clear_chat", contact.id), danger: true },
    { label: "Export Chat", onClick: () => onDirectChatAction?.("export_chat", contact.id) },
  ];

  return (
    <div
      className="relative z-30 flex items-center gap-3 px-4 py-3 border-b border-white/8 backdrop-blur-sm"
      style={{ background: headerBackground ?? "rgba(15, 23, 42, 0.7)" }}
    >
      {/* Back button (mobile) */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex-shrink-0 transition-colors p-2 -ml-2 rounded-2xl hover:bg-white/5 md:hidden"
          style={{ color: mutedColor }}
          aria-label="Back to chats"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      )}

      <button
        onClick={() => onOpenProfile?.()}
        className="flex-1 min-w-0 flex items-center gap-3 text-left rounded-xl hover:bg-white/5 transition-colors p-1"
      >
        <div className="relative flex-shrink-0">
          {contact.avatar ? (
            <img
              src={contact.avatar}
              alt={contact.displayName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-sm font-bold`}
            >
              {getInitials(contact.displayName)}
            </div>
          )}
          <div
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2"
            style={{ borderColor: "var(--color-surface)" }}
          />
        </div>

        <div className="min-w-0">
          <h2 className="font-semibold text-[1.1rem] md:text-sm leading-tight truncate" style={{ color: textColor }}>
            {contact.displayName}
          </h2>
          <p className="text-[0.7rem] md:text-xs leading-tight mt-0.5">
            {isTyping ? (
              <span className="text-teal-400 font-medium">typing…</span>
            ) : contact.online ? (
              <span className="text-emerald-400">online</span>
            ) : (
              <span style={{ color: mutedColor }}>{formatLastSeen(contact.lastSeen)}</span>
            )}
          </p>
        </div>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-0.5 md:gap-1">
        <button
          onClick={() => onInitiateCall?.(contact.otherUserId || contact.id, false)}
          className="p-2.5 md:p-2 rounded-xl hover:bg-white/5 transition-all active:scale-95"
          style={{ color: mutedColor }}
          title="Start voice call"
        >
          <Phone className="w-5.5 h-5.5 md:w-5 md:h-5" />
        </button>
        <button
          onClick={() => onInitiateCall?.(contact.otherUserId || contact.id, true)}
          className="p-2.5 md:p-2 rounded-xl hover:bg-white/5 transition-all active:scale-95"
          style={{ color: mutedColor }}
          title="Start video call"
        >
          <Video className="w-5.5 h-5.5 md:w-5 md:h-5" />
        </button>
        <ChatMenu
          menuClassName="z-[85]"
          items={
            contact.isGroup
              ? groupItems
              : directChatItems
          }
        />
      </div>
    </div>
  );
}

import { memo, useEffect, useMemo, useState } from "react";
import { Archive, Bell, BellOff, Check, CheckCheck, Clock3, Pin, Search, UserPlus, Shield, Palette, Settings } from "lucide-react";
import { getInitials, getAvatarColor, formatSidebarTime } from "../../utils/helpers.js";
import ProfileModal from "./ProfileModal.jsx";
import ChatMenu from "./ChatMenu.jsx";
import NewGroupModal from "./NewGroupModal.jsx";
import ChatFlowIcon from "../../components/ChatFlowIcon.jsx";
import { getAuthToken } from "../../services/storageService.js";
import api from "../../services/api.js";
import Swal from "sweetalert2";

export default function ChatSidebar({
  currentUser,
  chatSections,
  activeContactId,
  appTheme,
  soundEnabled,
  searchQuery,
  onSearchChange,
  onSelectContact,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  onToggleSound,
  onCreateGroup,
  onOpenStarred,
  onReadAll,
  onOpenAppTheme,
  onOpenSettings,
  onOpenAdminPanel,
  onLogout,
  onUpdateProfile,
}) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isFindUserOpen, setIsFindUserOpen] = useState(false);
  const [selectedFoundUser, setSelectedFoundUser] = useState(null);
  const currentUserAvatarColor = getAvatarColor(currentUser?.id);

  const groupCandidates = useMemo(() => {
    const merged = [
      ...(chatSections?.pinned ?? []),
      ...(chatSections?.regular ?? []),
      ...(chatSections?.archived ?? []),
    ];
    // Filter out groups and ensure we have unique user objects with the correct ID
    const userContacts = merged.filter((c) => !c.isGroup && c.otherUserId);
    const seen = new Set();
    const unique = [];
    for (const c of userContacts) {
      if (!seen.has(c.otherUserId)) {
        seen.add(c.otherUserId);
        unique.push({
          ...c,
          id: c.otherUserId, // Use the actual USER ID for selection
        });
      }
    }
    return unique;
  }, [chatSections]);

  const sidebarMenuItems = [
    ...(currentUser?.isAdmin
      ? [
          {
            label: "Admin Panel",
            icon: Shield,
            onClick: () => onOpenAdminPanel?.(),
          },
        ]
      : []),
    {
      label: "New Group",
      icon: UserPlus,
      onClick: () => setIsNewGroupOpen(true),
    },
    { label: "Read all", icon: CheckCheck, onClick: () => onReadAll?.() },
    { label: "App Theme", icon: Palette, onClick: () => onOpenAppTheme?.() },
    { label: "Settings", icon: Settings, onClick: () => onOpenSettings?.() },
  ];

  const sidebarSurface = "var(--color-surface)";
  const sidebarBg = "var(--color-background)";
  const sidebarText = "var(--color-text)";
  const sidebarMuted = "var(--color-text-muted)";

  return (
    <div
      className="flex flex-col h-full border-r border-white/8"
      style={{
        backgroundColor: sidebarBg,
        backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${sidebarSurface} 82%, transparent), transparent 40%)`,
      }}
    >
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <ChatFlowIcon className="h-10 w-10" />
            <span className="font-bold text-lg tracking-tight" style={{ color: sidebarText }}>
              ChatFlow
            </span>
          </div>

          <div className="flex items-center gap-2">
              <button
              onClick={onToggleSound}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
              style={{ color: sidebarMuted }}
              title={soundEnabled ? "Sound on" : "Sound off"}
            >
              {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsFindUserOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
              style={{ color: sidebarMuted }}
              title="Find user"
            >
              <UserPlus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="relative w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all overflow-hidden"
              title="Open profile"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser?.displayName ?? currentUser?.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${currentUserAvatarColor} flex items-center justify-center text-white text-xs font-semibold`}>
                  {getInitials(currentUser?.displayName ?? currentUser?.username)}
                </div>
              )}
            </button>
            <ChatMenu items={sidebarMenuItems} />
          </div>
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: sidebarMuted }}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none transition-all placeholder-[color:var(--color-text-muted)]"
            style={{
              boxShadow: "none",
               color: sidebarText,
               backgroundColor: "color-mix(in srgb, var(--color-surface) 82%, transparent)",
               borderColor: "color-mix(in srgb, var(--color-text) 12%, transparent)",
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4" style={{ overscrollBehavior: "contain" }}>
        <Section
          title="Pinned"
          contacts={chatSections?.pinned ?? []}
          activeContactId={activeContactId}
          currentUserId={currentUser?.id}
          appTheme={appTheme}
          query={normalizedQuery}
          onSelectContact={onSelectContact}
          onTogglePin={onTogglePin}
          onToggleMute={onToggleMute}
          onToggleArchive={onToggleArchive}
          icon={<Pin className="h-3 w-3" />}
        />
        <Section
          title="Messages"
          contacts={chatSections?.regular ?? []}
          activeContactId={activeContactId}
          currentUserId={currentUser?.id}
          appTheme={appTheme}
          query={normalizedQuery}
          onSelectContact={onSelectContact}
          onTogglePin={onTogglePin}
          onToggleMute={onToggleMute}
          onToggleArchive={onToggleArchive}
        />
        <Section
          title="Archived"
          contacts={chatSections?.archived ?? []}
          activeContactId={activeContactId}
          currentUserId={currentUser?.id}
          appTheme={appTheme}
          query={normalizedQuery}
          onSelectContact={onSelectContact}
          onTogglePin={onTogglePin}
          onToggleMute={onToggleMute}
          onToggleArchive={onToggleArchive}
          icon={<Archive className="h-3 w-3" />}
        />

        {(chatSections?.pinned?.length ?? 0) +
          (chatSections?.regular?.length ?? 0) +
          (chatSections?.archived?.length ?? 0) ===
          0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
            <Search className="w-10 h-10" style={{ color: sidebarMuted }} />
              <p className="text-sm" style={{ color: sidebarMuted }}>
              {searchQuery ? "No contacts match your search." : "No contacts yet."}
            </p>
          </div>
        )}
      </div>

      <ProfileModal
        user={currentUser}
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSave={onUpdateProfile}
        onLogout={onLogout}
      />

      <NewGroupModal
        open={isNewGroupOpen}
        candidates={groupCandidates}
        onClose={() => setIsNewGroupOpen(false)}
        onSubmit={(payload) => onCreateGroup?.(payload.name, payload.memberIds)}
      />

      <FindUserModal
        open={isFindUserOpen}
        onClose={() => setIsFindUserOpen(false)}
        onSelectUser={(user) => {
          setSelectedFoundUser(user);
          setIsFindUserOpen(false);
        }}
      />

      <FindUserContactInfoModal
        open={Boolean(selectedFoundUser)}
        user={selectedFoundUser}
        onClose={() => setSelectedFoundUser(null)}
        onMessage={async (user) => {
          if (!user?.id) return;
          const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
          const token = getAuthToken();

          try {
            const response = await fetch(`${base}/api/chats`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                type: "direct",
                participantIds: [user.id],
              }),
            });

            if (!response.ok) return;

            const payload = await response.json();
            const chat = payload?.chat || payload?.data?.chat || payload?.data || payload;
            const chatId = String(chat?.id ?? chat?._id ?? "");
            if (!chatId) return;

            onSelectContact?.(chatId);
            setSelectedFoundUser(null);
          } catch {
            // Keep flow silent for now, preserving sidebar behavior.
          }
        }}
      />
    </div>
  );
}

function FindUserModal({ open, onClose, onSelectUser }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const normalized = query.trim();
    if (!normalized) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/api/users/search?q=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
        });

        const payload = res.data;
        const rawUsers = Array.isArray(payload?.users)
          ? payload.users
          : Array.isArray(payload?.data?.users)
            ? payload.data.users
            : Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload)
                ? payload
                : [];

        const normalizedUsers = rawUsers
          .map((user) => ({
            id: String(user?.id ?? user?._id ?? ""),
            username: String(user?.username ?? ""),
            displayName: String(user?.displayName ?? user?.name ?? user?.username ?? "Unknown"),
            avatar: user?.avatar ?? null,
          }))
          .filter((user) => user.id);

        setResults(normalizedUsers.slice(0, 12));
      } catch (error) {
        if (error?.name !== "AbortError" && error?.code !== "ERR_CANCELED") {
          setResults([]);
          Swal.fire({ icon: "error", title: "Search failed", text: error.message });
        }
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  function resetAndClose() {
    setQuery("");
    setResults([]);
    setIsLoading(false);
    onClose?.();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-3 sm:p-6">
      <button
        className="absolute inset-0 bg-black/65"
        onClick={resetAndClose}
        aria-label="Close find user modal"
      />

      <div
        className="relative w-full max-w-3xl max-h-[88dvh] overflow-hidden rounded-3xl border backdrop-blur-xl animate-message-in"
        style={{
          borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--color-surface) 95%, black 5%)",
        }}
      >
        <div className="px-4 sm:px-6 py-4 border-b" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={resetAndClose}
              className="font-medium transition-colors"
              style={{ color: "var(--color-text-muted)" }}
            >
              Cancel
            </button>
            <div className="text-center">
              <h2 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Find User</h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Search by username or display name
              </p>
            </div>
            <div className="w-10" />
          </div>

          <div className="mt-4 rounded-xl border px-3 py-2.5 flex items-center gap-2" style={{ borderColor: "color-mix(in srgb, var(--color-accent) 44%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)" }}>
            <Search className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find user..."
              className="w-full bg-transparent outline-none"
              style={{ color: "var(--color-text)" }}
              autoFocus
            />
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(88dvh-11rem)]">
          {query.trim() && (
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
              Suggestions
            </p>
          )}

          {!query.trim() ? (
            <div className="rounded-2xl border py-10 text-center" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)", color: "var(--color-text-muted)" }}>
              <Search className="w-8 h-8 mx-auto mb-2 opacity-70" />
              Start typing to find users.
            </div>
          ) : isLoading ? (
            <div className="rounded-2xl border py-10 text-center" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)", color: "var(--color-text-muted)" }}>
              Searching users...
            </div>
          ) : !results.length ? (
            <div className="rounded-2xl border py-10 text-center" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)", color: "var(--color-text-muted)" }}>
              <Search className="w-8 h-8 mx-auto mb-2 opacity-70" />
              No users found.
            </div>
          ) : (
            <div className="rounded-2xl border divide-y" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)", borderTopColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}>
              {results.map((user) => {
                const avatarColor = getAvatarColor(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => onSelectUser?.(user)}
                    className="w-full px-4 py-3 flex items-center gap-3 transition-colors text-left hover:bg-white/5"
                    style={{ color: "var(--color-text)" }}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.displayName}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-semibold`}>
                        {getInitials(user.displayName)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{ color: "var(--color-text)" }}>{user.displayName}</p>
                      <p className="text-sm truncate" style={{ color: "var(--color-text-muted)" }}>@{user.username}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FindUserContactInfoModal({ open, user, onClose, onMessage }) {
  if (!open || !user) return null;

  const avatarColor = getAvatarColor(user.id);

  return (
    <div className="fixed inset-0 z-[96] flex items-end sm:items-center justify-center p-3 sm:p-6">
      <button
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
        aria-label="Close contact info"
      />

      <div
        className="relative w-full max-w-2xl rounded-3xl border backdrop-blur-xl animate-message-in"
        style={{
          borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--color-surface) 95%, black 5%)",
        }}
      >
        <div className="px-5 sm:px-6 py-4 border-b" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
              Contact Info
            </h2>
            <button
              onClick={onClose}
              className="text-sm font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              Close
            </button>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-5">
          <div className="flex items-center gap-4">
            {user.avatar ? (
              <img src={user.avatar} alt={user.displayName} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-xl font-bold`}>
                {getInitials(user.displayName)}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xl font-semibold truncate" style={{ color: "var(--color-text)" }}>
                {user.displayName}
              </p>
              <p className="text-sm truncate" style={{ color: "var(--color-text-muted)" }}>
                @{user.username}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border text-sm"
              style={{
                color: "var(--color-text)",
                borderColor: "color-mix(in srgb, var(--color-text) 18%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--color-surface) 84%, transparent)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onMessage?.(user)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  contacts,
  activeContactId,
  currentUserId,
  appTheme,
  query,
  onSelectContact,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  icon,
}) {
  if (!contacts?.length) return null;
  return (
    <div className="mb-3">
      <div
        className="px-3 mb-1 text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1.5"
        style={{ color: "var(--color-text-muted)" }}
      >
        {icon ? <span className="inline-flex">{icon}</span> : null}
        <span>{title}</span>
      </div>
      <div className="flex flex-col gap-1">
        {contacts.map((contact) => (
          <ChatItem
            key={contact.id}
            contact={contact}
            isActive={contact.id === activeContactId}
            currentUserId={currentUserId}
            appTheme={appTheme}
            query={query}
            onSelectContact={onSelectContact}
            onTogglePin={onTogglePin}
            onToggleMute={onToggleMute}
            onToggleArchive={onToggleArchive}
          />
        ))}
      </div>
    </div>
  );
}

const ChatItem = memo(function ChatItem({
  contact,
  isActive,
  currentUserId,
  appTheme,
  onSelectContact,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  query,
}) {
  const avatarColor = getAvatarColor(contact.id);
  const lastMsg = contact.lastMessage;
  const unread = contact.unreadCount ?? 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const isOutgoingPreview = Boolean(lastMsg && currentUserId && lastMsg.senderId === currentUserId);
  const presenceState = contact.presenceStatus ?? (contact.online ? "online" : "offline");
  const textColor = appTheme?.text ?? "var(--color-text)";
  const mutedColor = appTheme?.textMuted ?? "var(--color-text-muted)";

  const lastMsgPreview = lastMsg
    ? lastMsg.deleted
      ? "Message deleted"
      : lastMsg.type === "image"
        ? "Image"
        : lastMsg.type === "voice"
          ? "Voice message"
          : lastMsg.text?.startsWith('e2ee:')
            ? "🔒 Encrypted message"
            : lastMsg.text?.slice(0, 40) + (lastMsg.text?.length > 40 ? "..." : "")
    : "Start a conversation";

  return (
    <div className="relative group">
      <button
        onClick={() => onSelectContact(contact.id)}
        className={`w-full flex items-center gap-2.5 md:gap-3 px-3 py-3 md:py-3.5 rounded-2xl transition-all duration-200 text-left min-h-[72px] md:min-h-[80px] border ${
          isActive ? "" : "hover:bg-white/5 border-transparent"
        }`}
        style={
          isActive
            ? {
                backgroundColor: "color-mix(in srgb, var(--color-accent) 17%, transparent)",
                borderColor: "color-mix(in srgb, var(--color-accent) 45%, transparent)",
                boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-accent) 16%, transparent)",
              }
            : undefined
        }
      >
        <div className="relative flex-shrink-0">
          {contact.avatar ? (
            <img
              src={contact.avatar}
              alt={contact.displayName}
              className="w-[clamp(2.5rem,8vw,3.2rem)] h-[clamp(2.5rem,8vw,3.2rem)] rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-[clamp(2.5rem,8vw,3.2rem)] h-[clamp(2.5rem,8vw,3.2rem)] rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-[clamp(0.95rem,2.3vw,1.3rem)] font-bold`}
            >
              {getInitials(contact.displayName)}
            </div>
          )}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
            style={{
              backgroundColor: getPresenceDotColor(presenceState),
              borderColor: "var(--color-surface)",
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
            className="text-[1.05rem] md:text-base font-semibold truncate leading-tight"
              style={isActive ? { color: "var(--color-accent)" } : { color: textColor }}
            >
              {highlightMatch(contact.displayName, query)}
            </span>
            <div className="flex items-center gap-1.5">
              {contact.pinned && <Pin className="h-3 w-3" style={{ color: "var(--color-accent)" }} />}
              {contact.muted && (
                <BellOff
                  className="h-3 w-3"
                  style={{ color: "color-mix(in srgb, var(--color-text-muted) 88%, var(--color-accent) 12%)" }}
                />
              )}
              {lastMsg && (
                <span
                  className="text-[10px]"
                  style={{ color: `color-mix(in srgb, ${mutedColor} 86%, var(--color-accent) 14%)` }}
                >
                  {formatSidebarTime(lastMsg.createdAt)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {isOutgoingPreview && <SidebarStatusTick status={lastMsg?.status} />}
              <span
                className={`text-[0.8rem] md:text-xs truncate ${unread > 0 ? "font-medium" : ""}`}
                style={{ color: unread > 0 ? textColor : mutedColor }}
              >
                {highlightMatch(lastMsgPreview, query)}
              </span>
            </div>
            {unread > 0 && !contact.muted && (
              <span
                className="flex-shrink-0 min-w-[20px] h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1.5 animate-badge-pulse"
                style={{ backgroundColor: "var(--color-accent)" }}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
        </div>
      </button>

      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--color-text-muted)" }}
        aria-label="Chat actions"
      >
        ⋯
      </button>

      {menuOpen && (
        <div
          className="absolute right-2 top-full mt-1 z-30 border rounded-xl p-1 min-w-32 shadow-xl animate-reaction-pop"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-surface) 94%, black 6%)",
            borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
          }}
        >
          <MenuAction label={contact.pinned ? "Unpin" : "Pin"} onClick={() => onTogglePin(contact.id)} />
          <MenuAction label={contact.muted ? "Unmute" : "Mute"} onClick={() => onToggleMute(contact.id)} />
          <MenuAction label={contact.archived ? "Unarchive" : "Archive"} onClick={() => onToggleArchive(contact.id)} />
        </div>
      )}
    </div>
  );
});

function MenuAction({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 rounded-lg transition-colors"
      style={{ color: "var(--color-text)" }}
    >
      {label}
    </button>
  );
}

function SidebarStatusTick({ status }) {
  if (status === "sending") {
    return <Clock3 className="w-3 h-3 text-slate-400 flex-shrink-0" />;
  }
  if (status === "sent") {
    return <Check className="w-3 h-3 text-slate-400 flex-shrink-0" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
  }
  return <CheckCheck className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />;
}

function getPresenceDotColor(status) {
  if (status === "dnd") return "#ef4444";
  if (status === "idle" || status === "away") return "#f59e0b";
  if (status === "offline") return "#6b7280";
  return "#22c55e";
}

function highlightMatch(text, query) {
  if (!query) return text;
  const raw = String(text ?? "");
  const lower = raw.toLowerCase();
  const index = lower.indexOf(query);
  if (index < 0) return raw;

  const start = raw.slice(0, index);
  const match = raw.slice(index, index + query.length);
  const end = raw.slice(index + query.length);

  return (
    <>
      {start}
      <span style={{ color: "var(--color-accent)" }}>{match}</span>
      {end}
    </>
  );
}

import { useRef, useState } from "react";
import { formatMessageTime, validateImageFile } from "../../utils/helpers.js";
import ImageCropModal from "./ImageCropModal.jsx";
import { BUILT_IN_THEMES } from "../../utils/appTheme";

function getThemeHex(token, fallback) {
  if (typeof window === "undefined") return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export default function ChatToolModal({
  currentUser,
  panel,
  onClose,
  onChangeTheme,
  onUpdateChatSides,
  onToggleChatSide,
  onToggleStar,
  onAddMembersToGroup,
  onRemoveMemberFromGroup,
  onUpdateMemberRole,
  groupAddCandidates,
}) {
  if (!panel) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--color-surface) 95%, black 5%)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}>
          <h3 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>{getTitle(panel)}</h3>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1"
            style={{ color: "var(--color-text-muted)", backgroundColor: "transparent" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-surface) 86%, var(--color-accent) 14%)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Close
          </button>
        </div>

        <div className="p-3 overflow-y-auto max-h-[calc(80vh-58px)]">
          {panel.type === "group_info" && (
            <GroupInfoBlock
              currentUser={currentUser}
              panel={panel}
              onAddMembersToGroup={onAddMembersToGroup}
              onRemoveMemberFromGroup={onRemoveMemberFromGroup}
              onUpdateMemberRole={onUpdateMemberRole}
              groupAddCandidates={groupAddCandidates}
            />
          )}
          {panel.type === "chat_theme" && (
            <ThemeBlock panel={panel} onChangeTheme={onChangeTheme} onToggleChatSide={onToggleChatSide} />
          )}
          {panel.type === "chat_sides" && (
            <ChatSidesBlock panel={panel} onUpdateChatSides={onUpdateChatSides} />
          )}
          {panel.type === "search" && <SearchBlock panel={panel} />}
          {panel.type === "media_links_docs" && <MediaBlock panel={panel} />}
          {panel.type === "starred" && <StarredBlock panel={panel} onToggleStar={onToggleStar} />}
        </div>
      </div>
    </div>
  );
}

function GroupInfoBlock({ currentUser, panel, onAddMembersToGroup, onRemoveMemberFromGroup, onUpdateMemberRole, groupAddCandidates = [] }) {
  const members = panel.contact?.members ?? [];
  const groupRoles = panel.contact?.groupRoles ?? {};
  
  const myRole = groupRoles[currentUser?.id] || "member";
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Filter candidates that are not already members
  const memberIds = new Set(members.map(m => String(m.id || m._id)));
  const addableUsers = groupAddCandidates.filter(u => !memberIds.has(String(u.id || u._id)));

  // Close menus when clicking outside (naive approach)
  useEffect(() => {
    const handleWindowClick = () => {
      setOpenMenuId(null);
      setIsAddMenuOpen(false);
    };
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl border px-4 py-4 flex flex-col items-center text-center gap-2" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: "var(--color-accent)", color: "white" }}>
          {panel.contact?.displayName?.charAt(0) ?? "G"}
        </div>
        <div>
          <p className="font-semibold text-base" style={{ color: "var(--color-text)" }}>{panel.contact?.displayName ?? "Group"}</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{members.length} Members</p>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)" }}>
        <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            Members List
          </span>
          {(myRole === "admin" || myRole === "owner") && (
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsAddMenuOpen(!isAddMenuOpen); setOpenMenuId(null); }}
                className="text-xs font-medium px-2 py-1 rounded"
                style={{ color: "var(--color-accent)", backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)" }}
              >
                + Add Member
              </button>
              
              {isAddMenuOpen && (
                <div className="absolute right-0 top-8 w-48 z-50 rounded-xl shadow-xl border overflow-hidden animate-in fade-in max-h-48 overflow-y-auto" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 95%, black 5%)" }}>
                  {addableUsers.length === 0 ? (
                    <div className="p-3 text-xs text-center" style={{ color: "var(--color-text-muted)" }}>No eligible contacts</div>
                  ) : (
                    <div className="flex flex-col">
                      {addableUsers.map(user => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setIsAddMenuOpen(false);
                            onAddMembersToGroup?.(panel.contactId, [user.id]);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-left hover:bg-white/10 transition-colors"
                        >
                          <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`} alt="" className="w-6 h-6 rounded-full object-cover" />
                          <span className="text-xs font-medium truncate w-full" style={{ color: "var(--color-text)" }}>{user.displayName || user.username}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          {members.map(m => {
            const memberId = m.id || m._id;
            const role = groupRoles[memberId] || "member";
            const isMe = memberId === currentUser?.id;
            
            // Check permissions
            const canKick = (myRole === "owner" && role !== "owner" && !isMe) || 
                            (myRole === "admin" && role === "member" && !isMe);
            const canPromote = myRole === "owner" && role === "member" && !isMe;
            const canDemote = myRole === "owner" && role === "admin" && !isMe;
            const hasActions = canKick || canPromote || canDemote;

            return (
              <div key={memberId} className="px-3 py-2 flex items-center gap-3 border-b last:border-b-0 hover:bg-white/5 transition-colors relative" style={{ borderColor: "color-mix(in srgb, var(--color-text) 5%, transparent)" }}>
                <img src={m.avatar || "https://ui-avatars.com/api/?background=random"} alt="" className="w-8 h-8 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: "var(--color-text)" }}>
                    {m.displayName || m.username} {isMe ? "(You)" : ""}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: role === "owner" ? "#fbbf24" : role === "admin" ? "#34d399" : "var(--color-text-muted)" }}>
                    {role}
                  </p>
                </div>

                {hasActions && (
                  <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === memberId ? null : memberId); }}
                      className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    
                    {openMenuId === memberId && (
                      <div className="absolute right-0 top-6 w-40 z-50 rounded-xl shadow-xl border overflow-hidden animate-in fade-in" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 95%, black 5%)" }}>
                        <div className="flex flex-col p-1">
                          {canPromote && (
                            <button onClick={() => { setOpenMenuId(null); onUpdateMemberRole?.(panel.contactId, memberId, 'admin'); }} className="text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-white/10" style={{ color: "var(--color-text)" }}>Promote to Admin</button>
                          )}
                          {canDemote && (
                            <button onClick={() => { setOpenMenuId(null); onUpdateMemberRole?.(panel.contactId, memberId, 'member'); }} className="text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-white/10" style={{ color: "var(--color-text)" }}>Demote to Member</button>
                          )}
                          {canKick && (
                            <button onClick={() => { setOpenMenuId(null); onRemoveMemberFromGroup?.(panel.contactId, memberId); }} className="text-left px-3 py-2 text-xs font-medium rounded-lg text-red-400 hover:bg-red-400/10">Remove from Group</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ThemeBlock({ panel, onChangeTheme, onToggleChatSide }) {
  const appearance = panel.appearance ?? {};
  const midnight = BUILT_IN_THEMES[0];
  const defaultBackground = getThemeHex("--color-background", midnight.background);
  const defaultSurface = getThemeHex("--color-surface", midnight.surface);
  const defaultSecondary = getThemeHex("--color-secondary", midnight.secondary);
  const [pendingBackgroundFile, setPendingBackgroundFile] = useState(null);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef(null);

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileError = validateImageFile(file);
    if (fileError) {
      setImageError(fileError);
      return;
    }
    setImageError("");
    setPendingBackgroundFile(file);
  }

  function handleCropCancel() {
    setPendingBackgroundFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleCropApply(croppedDataUrl) {
    onChangeTheme?.(panel.contactId, {
      backgroundMode: "image",
      backgroundImage: croppedDataUrl,
    });
    setPendingBackgroundFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleReset() {
    onChangeTheme?.(panel.contactId, {
      backgroundMode: "solid",
      solidColor: null, // This will trigger reset to theme default
      gradientFrom: null,
      gradientTo: null,
      backgroundImage: null,
      mineBubble: null,
      theirBubble: null,
      useCustomSideStyle: false,
      customSideLayout: "default",
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)" }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <label className="flex items-center gap-2 rounded-lg border px-2 py-2 cursor-pointer" style={{ color: "var(--color-text)", borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}>
            <input
              type="radio"
              name="theme-mode"
              checked={appearance.backgroundMode === "solid"}
              onChange={() => onChangeTheme?.(panel.contactId, { backgroundMode: "solid" })}
            />
            Solid Color
          </label>
          <label className="flex items-center gap-2 rounded-lg border px-2 py-2 cursor-pointer" style={{ color: "var(--color-text)", borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}>
            <input
              type="radio"
              name="theme-mode"
              checked={appearance.backgroundMode === "gradient"}
              onChange={() => onChangeTheme?.(panel.contactId, { backgroundMode: "gradient" })}
            />
            Gradient
          </label>
          <label className="flex items-center gap-2 rounded-lg border px-2 py-2 cursor-pointer" style={{ color: "var(--color-text)", borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}>
            <input
              type="radio"
              name="theme-mode"
              checked={appearance.backgroundMode === "image"}
              onChange={() => onChangeTheme?.(panel.contactId, { backgroundMode: "image" })}
            />
            Custom Image
          </label>
        </div>

        {appearance.backgroundMode === "solid" && (
          <div className="rounded-lg border p-3" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 85%, transparent)" }}>
            <label className="block text-sm mb-2" style={{ color: "var(--color-text)" }}>Background Color</label>
            <div 
              className="mb-2 w-full h-10 border border-white/15 rounded-md shadow-inner transition-colors duration-200" 
              style={{ backgroundColor: appearance.solidColor ?? defaultBackground }}
            />
            <input
              type="color"
              value={appearance.solidColor ?? defaultBackground}
              onChange={(event) =>
                onChangeTheme?.(panel.contactId, {
                  backgroundMode: "solid",
                  solidColor: event.target.value,
                })
              }
              className="h-10 w-full rounded-lg border border-white/15 cursor-pointer"
              style={{ backgroundColor: appearance.solidColor ?? defaultBackground }}
            />
          </div>
        )}

        {appearance.backgroundMode === "gradient" && (
          <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 85%, transparent)" }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-2" style={{ color: "var(--color-text)" }}>From</label>
                <div 
                  className="mb-2 w-full h-10 border border-white/15 rounded-md shadow-inner transition-colors duration-200" 
                  style={{ backgroundColor: appearance.gradientFrom ?? defaultSurface }}
                />
                <input
                  type="color"
                  value={appearance.gradientFrom ?? defaultSurface}
                  onChange={(event) =>
                    onChangeTheme?.(panel.contactId, {
                      backgroundMode: "gradient",
                      gradientFrom: event.target.value,
                    })
                  }
                  className="h-10 w-full rounded-lg border border-white/15 cursor-pointer"
                  style={{ backgroundColor: appearance.gradientFrom ?? defaultSurface }}
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: "var(--color-text)" }}>To</label>
                <div 
                  className="mb-2 w-full h-10 border border-white/15 rounded-md shadow-inner transition-colors duration-200" 
                  style={{ backgroundColor: appearance.gradientTo ?? defaultSecondary }}
                />
                <input
                  type="color"
                  value={appearance.gradientTo ?? defaultSecondary}
                  onChange={(event) =>
                    onChangeTheme?.(panel.contactId, {
                      backgroundMode: "gradient",
                      gradientTo: event.target.value,
                    })
                  }
                  className="h-10 w-full rounded-lg border border-white/15 cursor-pointer"
                  style={{ backgroundColor: appearance.gradientTo ?? defaultSecondary }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: "var(--color-text)" }}>Direction</label>
              <select
                value={appearance.gradientDirection ?? "to bottom"}
                onChange={(event) =>
                  onChangeTheme?.(panel.contactId, {
                    backgroundMode: "gradient",
                    gradientDirection: event.target.value,
                  })
                }
                className="w-full rounded-lg border px-3 py-2 text-sm cursor-pointer"
                style={{
                  color: "var(--color-text)",
                  borderColor: "color-mix(in srgb, var(--color-text) 20%, transparent)",
                  backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)",
                }}
              >
                <option value="to bottom">Top to Bottom</option>
                <option value="to right">Left to Right</option>
                <option value="to bottom right">Diagonal</option>
              </select>
            </div>
          </div>
        )}

        {appearance.backgroundMode === "image" && (
          <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 85%, transparent)" }}>
            <label className="inline-flex items-center rounded-lg border px-3 py-2 text-sm cursor-pointer" style={{ color: "var(--color-text)", borderColor: "color-mix(in srgb, var(--color-text) 20%, transparent)" }}>
              Upload Image
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>

            {appearance.backgroundImage ? (
              <div className="h-24 rounded-lg border border-white/10 bg-center bg-cover" style={{ backgroundImage: `url(${appearance.backgroundImage})` }} />
            ) : (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No custom image selected.</p>
            )}

            {imageError ? <p className="text-xs text-rose-300">{imageError}</p> : null}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleReset}
          className="rounded-xl border px-3 py-2 text-sm transition-opacity hover:opacity-80"
          style={{
            color: "color-mix(in srgb, var(--color-text) 60%, transparent)",
            borderColor: "color-mix(in srgb, var(--color-text) 10%, transparent)",
            backgroundColor: "transparent",
          }}
        >
          Reset to Default
        </button>
      </div>

      <ImageCropModal
        open={Boolean(pendingBackgroundFile)}
        sourceFile={pendingBackgroundFile}
        title="Set Background"
        mode="background"
        applyLabel="Set as Background"
        onApply={handleCropApply}
        onCancel={handleCropCancel}
      />
    </div>
  );
}

function ChatSidesBlock({ panel, onUpdateChatSides }) {
  const appearance = panel.appearance ?? {};
  const midnight = BUILT_IN_THEMES[0];
  const defaultMineColor = getThemeHex("--color-accent", midnight.accent);
  const defaultTheirColor = getThemeHex("--color-surface", midnight.surface);
  const useCustom = Boolean(appearance.useCustomSideStyle);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)" }}>
        <label className="flex items-center gap-2" style={{ color: "var(--color-text)" }}>
          <input
            type="checkbox"
            checked={!useCustom}
            onChange={() =>
              onUpdateChatSides?.(panel.contactId, {
                useCustomSideStyle: false,
              })
            }
          />
          Default
        </label>
        <label className="flex items-center gap-2" style={{ color: "var(--color-text)" }}>
          <input
            type="checkbox"
            checked={useCustom}
            onChange={() =>
              onUpdateChatSides?.(panel.contactId, {
                useCustomSideStyle: true,
              })
            }
          />
          Custom
        </label>

        <label className="flex items-center gap-2" style={{ color: "var(--color-text)" }}>
          <input
            type="checkbox"
            checked={Boolean(appearance.showMyAvatarInChat)}
            onChange={(event) =>
              onUpdateChatSides?.(panel.contactId, {
                showMyAvatarInChat: event.target.checked,
              })
            }
          />
          Show my profile picture in chat
        </label>
      </div>

      {useCustom && (
        <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)" }}>
          <div>
            <label className="block text-sm mb-2" style={{ color: "var(--color-text)" }}>Chat Side Layout</label>
            <select
              value={appearance.customSideLayout ?? "default"}
              onChange={(event) =>
                onUpdateChatSides?.(panel.contactId, {
                  customSideLayout: event.target.value,
                })
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                color: "var(--color-text)",
                borderColor: "color-mix(in srgb, var(--color-text) 20%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)",
              }}
            >
              <option value="default">Default (Mine right, Other left)</option>
              <option value="swap">Swap sides</option>
              <option value="all_left">All messages left</option>
              <option value="all_right">All messages right</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-sm mb-2" style={{ color: "var(--color-text)" }}>My Message Color</label>
              <input
                type="color"
                value={appearance.mineBubble ?? defaultMineColor}
                onChange={(event) =>
                  onUpdateChatSides?.(panel.contactId, {
                    mineBubble: event.target.value,
                  })
                }
                className="h-10 w-full rounded-lg border border-white/15 bg-transparent"
              />
            </div>
            <div>
                <label className="block text-sm mb-2" style={{ color: "var(--color-text)" }}>Other Message Color</label>
              <input
                type="color"
                value={appearance.theirBubble ?? defaultTheirColor}
                onChange={(event) =>
                  onUpdateChatSides?.(panel.contactId, {
                    theirBubble: event.target.value,
                  })
                }
                className="h-10 w-full rounded-lg border border-white/15 bg-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchBlock({ panel }) {
  const messages = panel.messages ?? [];
  return (
    <div className="space-y-2">
      {messages.length === 0 && <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No messages yet.</p>}
      {messages.map((message) => (
        <div key={message.id} className="rounded-xl border px-3 py-2" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)" }}>
          <p className="text-sm truncate" style={{ color: "var(--color-text)" }}>{message.text || message.type}</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{formatMessageTime(message.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

function MediaBlock({ panel }) {
  return (
    <div className="space-y-3">
      <section>
        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Media</p>
        <div className="grid grid-cols-3 gap-2">
          {(panel.media ?? []).map((message) => (
            <img key={message.id} src={message.imageData} alt="Media" className="h-20 w-full rounded-lg object-cover" loading="lazy" />
          ))}
          {(panel.media ?? []).length === 0 && <p className="text-sm col-span-3" style={{ color: "var(--color-text-muted)" }}>No media files.</p>}
        </div>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Links</p>
        <div className="space-y-1.5">
          {(panel.links ?? []).map((item, index) => (
            <a
              key={`${item.messageId}-${index}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)",
                color: "var(--color-accent)",
              }}
            >
              {item.url}
            </a>
          ))}
          {(panel.links ?? []).length === 0 && <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No links found.</p>}
        </div>
      </section>
    </div>
  );
}

function StarredBlock({ panel, onToggleStar }) {
  const messages = panel.messages ?? [];
  return (
    <div className="space-y-2">
      {messages.length === 0 && <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No starred messages.</p>}
      {messages.map((message) => (
        <div key={message.id} className="rounded-xl border px-3 py-2" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)" }}>
          <p className="text-sm truncate" style={{ color: "var(--color-text)" }}>{message.text || message.type}</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{formatMessageTime(message.createdAt)}</p>
            <button
              onClick={() => onToggleStar?.(message.id)}
              className="text-xs rounded-md px-2 py-1 border"
              style={{
                color: "var(--color-text)",
                borderColor: "color-mix(in srgb, var(--color-text) 20%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)",
              }}
            >
              Unstar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function getTitle(panel) {
  if (panel.type === "group_info") return "Group Info";
  if (panel.type === "chat_theme") return "Chat Theme";
  if (panel.type === "chat_sides") return "Chat Sides";
  if (panel.type === "search") return "Search Messages";
  if (panel.type === "media_links_docs") return "Media, Links, and Docs";
  if (panel.type === "starred") return "Starred Messages";
  return "Chat";
}

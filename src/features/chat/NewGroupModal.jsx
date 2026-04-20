import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { getAvatarColor, getInitials } from "../../utils/helpers.js";

export default function NewGroupModal({ open, candidates = [], onClose, onSubmit }) {
  const [name, setName] = useState("New Group");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return candidates;
    return candidates.filter((user) => {
      const displayName = String(user.displayName ?? "").toLowerCase();
      const username = String(user.username ?? "").toLowerCase();
      return displayName.includes(normalized) || username.includes(normalized);
    });
  }, [candidates, query]);

  function resetAndClose() {
    setName("New Group");
    setQuery("");
    setSelectedIds([]);
    onClose?.();
  }

  function handleToggle(userId) {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function handleCreate() {
    const result = onSubmit?.({
      name: name.trim(),
      memberIds: selectedIds,
    });
    if (result?.success === false) return;
    resetAndClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-3 sm:p-6">
      <button
        className="absolute inset-0 bg-black/65"
        onClick={resetAndClose}
        aria-label="Close new group modal"
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
              <h2 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>New Group</h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{selectedIds.length} selected</p>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim()}
              className="font-semibold transition-colors disabled:opacity-50"
              style={{ color: "var(--color-accent)" }}
            >
              Create
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Group name</label>
            <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)" }}>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="New Group"
                maxLength={50}
                className="w-full bg-transparent outline-none"
                style={{ color: "var(--color-text)" }}
              />
            </div>

            <div className="rounded-xl border px-3 py-2.5 flex items-center gap-2" style={{ borderColor: "color-mix(in srgb, var(--color-accent) 44%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)" }}>
              <Search className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search contacts"
                className="w-full bg-transparent outline-none"
                style={{ color: "var(--color-text)" }}
              />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(88dvh-13rem)]">
          {!filteredCandidates.length ? (
            <div className="rounded-2xl border py-10 text-center" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)", color: "var(--color-text-muted)" }}>
              <Users className="w-8 h-8 mx-auto mb-2 opacity-70" />
              No contacts available.
            </div>
          ) : (
            <div className="rounded-2xl border divide-y" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)", borderTopColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}>
              {filteredCandidates.map((user) => {
                const checked = selectedIds.includes(user.id);
                const avatarColor = getAvatarColor(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleToggle(user.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 transition-colors text-left"
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

                      <span
                        className="w-6 h-6 rounded-md border transition-colors"
                        style={
                          checked
                            ? {
                                borderColor: "color-mix(in srgb, var(--color-accent) 60%, transparent)",
                                backgroundColor: "color-mix(in srgb, var(--color-accent) 26%, transparent)",
                              }
                            : {
                                borderColor: "color-mix(in srgb, var(--color-text) 20%, transparent)",
                                backgroundColor: "color-mix(in srgb, var(--color-surface) 82%, transparent)",
                              }
                        }
                      />
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

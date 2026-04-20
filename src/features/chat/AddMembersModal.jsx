import { useMemo, useState } from "react";
import { Search, Link as LinkIcon } from "lucide-react";
import { getAvatarColor, getInitials } from "../../utils/helpers.js";

export default function AddMembersModal({ open, candidates = [], onClose, onSubmit }) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return candidates;
    return candidates.filter(
      (user) =>
        user.displayName.toLowerCase().includes(normalized) ||
        user.username.toLowerCase().includes(normalized)
    );
  }, [candidates, query]);

  function handleToggle(userId) {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function handleClose() {
    setQuery("");
    setSelectedIds([]);
    onClose?.();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-3 sm:p-6">
      <button className="absolute inset-0 bg-slate-950/80" onClick={handleClose} aria-label="Close add members modal" />

      <div className="relative w-full max-w-4xl max-h-[88dvh] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-xl animate-message-in">
        <div className="px-4 sm:px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleClose}
              className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors"
            >
              Cancel
            </button>
            <div className="text-center">
              <h2 className="text-white text-xl font-semibold">Add members</h2>
              <p className="text-slate-300 text-sm">{selectedIds.length}/{candidates.length}</p>
            </div>
            <button
              type="button"
              disabled={!selectedIds.length}
              onClick={() => {
                const result = onSubmit?.(selectedIds);
                if (result?.success !== false) {
                  handleClose();
                }
              }}
              className="text-white font-semibold disabled:text-slate-500 transition-colors"
            >
              Add
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-400/50 bg-white/5 px-4 py-3 flex items-center gap-2">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or username"
              className="w-full bg-transparent text-white placeholder:text-slate-500 outline-none"
            />
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(88dvh-10.5rem)] space-y-5">
          <div className="rounded-xl bg-white/10 px-4 py-3 text-sm text-slate-300">
            Only admins can add members to this group. <span className="text-emerald-400 font-medium">Edit group permissions.</span>
          </div>

          <button
            type="button"
            className="w-full rounded-2xl bg-white/10 hover:bg-white/15 transition-colors px-4 py-4 flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-slate-200">
              <LinkIcon className="w-6 h-6" />
            </div>
            <span className="text-white text-xl font-semibold">Invite via link or QR code</span>
          </button>

          <div>
            <h3 className="text-slate-400 text-lg font-semibold mb-3">Contacts</h3>
            <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/10">
              {!filteredCandidates.length ? (
                <div className="px-4 py-5 text-slate-400 text-sm">No contacts available to add.</div>
              ) : (
                filteredCandidates.map((user) => {
                  const isChecked = selectedIds.includes(user.id);
                  const avatarColor = getAvatarColor(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleToggle(user.id)}
                      className="w-full px-3 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                    >
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.displayName} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-semibold`}>
                          {getInitials(user.displayName)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-white text-xl truncate">{user.displayName}</p>
                        <p className="text-slate-400 text-sm truncate">@{user.username}</p>
                      </div>
                      <span
                        className={`w-7 h-7 rounded-md border transition-colors ${
                          isChecked
                            ? "border-emerald-400 bg-emerald-500/30"
                            : "border-white/20 bg-white/5"
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

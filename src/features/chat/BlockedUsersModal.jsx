import { getAvatarColor, getInitials } from "../../utils/helpers.js";

export default function BlockedUsersModal({ open, users, onClose, onUnblock }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6">
      <button className="absolute inset-0 bg-slate-950/75" onClick={onClose} aria-label="Close blocked users" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-4 sm:p-5 space-y-4 animate-message-in">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Blocked Users</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            Close
          </button>
        </div>

        {!users?.length ? (
          <p className="text-sm text-slate-400">No blocked users.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {users.map((user) => {
              const avatarColor = getAvatarColor(user.id);
              return (
                <div key={user.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.displayName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-xs font-semibold`}>
                      {getInitials(user.displayName)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{user.displayName}</p>
                    <p className="text-xs text-slate-400 truncate">@{user.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnblock?.(user.id)}
                    className="px-3 py-1.5 rounded-lg text-xs text-teal-200 border border-teal-400/30 hover:bg-teal-500/10 transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

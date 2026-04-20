import { formatLastSeen, getAvatarColor, getInitials } from "../../utils/helpers.js";

export default function ContactProfileModal({ contact, open, onClose }) {
  if (!open || !contact) return null;

  const avatarColor = getAvatarColor(contact.id);

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-3 sm:p-6">
      <button className="absolute inset-0 bg-black/65" onClick={onClose} aria-label="Close contact profile" />

      <div
        className="relative w-full max-w-md rounded-2xl border backdrop-blur-xl p-5 space-y-4 animate-message-in"
        style={{
          borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--color-surface) 95%, black 5%)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Contact Info</h2>
          <button onClick={onClose} className="transition-colors text-sm" style={{ color: "var(--color-text-muted)" }}>
            Close
          </button>
        </div>

        <div className="flex items-center gap-3">
          {contact.avatar ? (
            <img
              src={contact.avatar}
              alt={contact.displayName}
              className="w-16 h-16 rounded-full object-cover border"
              style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}
            />
          ) : (
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-lg font-bold`}>
              {getInitials(contact.displayName)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xl font-semibold truncate" style={{ color: "var(--color-text)" }}>{contact.displayName}</p>
            <p className="text-sm truncate" style={{ color: "var(--color-text-muted)" }}>@{contact.username}</p>
          </div>
        </div>

        <div
          className="space-y-2 rounded-xl border p-3"
          style={{
            borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)",
          }}
        >
          <InfoRow label="Status" value={contact.online ? "online" : formatLastSeen(contact.lastSeen)} />
          <InfoRow label="About" value={contact.about || "Hey there! I am using NovaLink."} />
          <InfoRow label="Type" value={contact.isGroup ? "Group" : "Private chat"} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      <p className="text-sm" style={{ color: "var(--color-text)" }}>{value}</p>
    </div>
  );
}

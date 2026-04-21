export default function SettingsModal({ open, settings, onClose, onToggleSetting }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md rounded-2xl p-4 shadow-2xl"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-surface) 96%, black 4%)",
          border: "1px solid color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            Settings
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor =
                "color-mix(in srgb, var(--color-surface) 70%, var(--color-text) 10%)";
              event.currentTarget.style.color = "var(--color-text)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = "transparent";
              event.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <ToggleRow
            title="Sound"
            description="Play in-app message sound indicators"
            checked={Boolean(settings?.soundEnabled)}
            onChange={() => onToggleSetting?.("soundEnabled")}
          />
          <ToggleRow
            title="Notifications"
            description="Allow in-app notification toasts"
            checked={Boolean(settings?.notificationsEnabled)}
            onChange={() => onToggleSetting?.("notificationsEnabled")}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div
      className="rounded-xl px-3 py-3 flex items-center justify-between gap-3"
      style={{
        backgroundColor: "color-mix(in srgb, var(--color-surface) 92%, var(--color-background) 8%)",
        border: "1px solid color-mix(in srgb, var(--color-text-muted) 22%, transparent)",
      }}
    >
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
          {title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="h-6 w-11 rounded-full border transition-colors"
        style={{
          backgroundColor: checked
            ? "var(--color-accent)"
            : "color-mix(in srgb, var(--color-surface) 65%, var(--color-text) 18%)",
          borderColor: checked
            ? "color-mix(in srgb, var(--color-accent) 74%, white 26%)"
            : "color-mix(in srgb, var(--color-text-muted) 26%, transparent)",
        }}
        aria-pressed={checked}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

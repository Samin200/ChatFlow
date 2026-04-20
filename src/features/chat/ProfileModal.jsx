import { useEffect, useRef, useState } from "react";
import { getAvatarColor, getInitials, validateImageFile } from "../../utils/helpers.js";
import ImageCropModal from "./ImageCropModal.jsx";

const BUILT_IN_AVATARS = [
  { id: "p1", category: "classic", src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2367c8e8'/%3E%3Cstop offset='1' stop-color='%23248cb1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='24' fill='url(%23g)'/%3E%3Ccircle cx='42' cy='50' r='5' fill='white'/%3E%3Ccircle cx='78' cy='50' r='5' fill='white'/%3E%3Cpath d='M38 77 Q60 92 82 77' stroke='white' stroke-width='6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" },
  { id: "p2", category: "minimal", src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='24' fill='%23dfe2cf'/%3E%3Ccircle cx='42' cy='50' r='4.5' fill='%230f172a'/%3E%3Ccircle cx='78' cy='50' r='4.5' fill='%230f172a'/%3E%3Cpath d='M44 78 Q60 88 76 78' stroke='%230f172a' stroke-width='5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" },
  { id: "p3", category: "cool", src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='24' fill='%232579a6'/%3E%3Ccircle cx='44' cy='48' r='4' fill='white'/%3E%3Ccircle cx='76' cy='48' r='4' fill='white'/%3E%3Cpath d='M50 79 Q60 73 70 79' stroke='white' stroke-width='5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" },
  { id: "p4", category: "neon", src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='24' fill='%23166d95'/%3E%3Ccircle cx='42' cy='50' r='4.5' fill='white'/%3E%3Ccircle cx='78' cy='50' r='4.5' fill='white'/%3E%3Cpath d='M42 74 Q60 88 78 74' stroke='white' stroke-width='5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" },
  { id: "p5", category: "cute", src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='24' fill='%23e5e7d6'/%3E%3Ccircle cx='42' cy='50' r='4' fill='%23111827'/%3E%3Ccircle cx='78' cy='50' r='4' fill='%23111827'/%3E%3Cpath d='M46 79 Q60 86 74 79' stroke='%23111827' stroke-width='5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" },
  { id: "p6", category: "classic", src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='24' fill='%2355b9d1'/%3E%3Ccircle cx='43' cy='49' r='4' fill='white'/%3E%3Ccircle cx='77' cy='49' r='4' fill='white'/%3E%3Cpath d='M40 75 Q60 95 80 75' stroke='white' stroke-width='6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" },
];

const AVATAR_CATEGORIES = ["cute", "cool", "minimal", "neon", "classic"];

export default function ProfileModal({ user, open, onClose, onSave, onLogout }) {
  const [displayName, setDisplayName] = useState("");
  const [about, setAbout] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [avatarCategory, setAvatarCategory] = useState("classic");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open || !user) return;
    setDisplayName(user.displayName ?? "");
    setAbout(user.about ?? "");
    setAvatar(user.avatar ?? null);
    setError("");
  }, [open, user]);

  if (!open || !user) return null;

  const avatarColor = getAvatarColor(user.id);

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileError = validateImageFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    setError("");
    setPendingAvatarFile(file);
  }

  function handleCropCancel() {
    setPendingAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleCropApply(croppedDataUrl) {
    setAvatar(croppedDataUrl);
    setPendingAvatarFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSelectBuiltInAvatar(src) {
    setAvatar(src);
    setError("");
    setIsAvatarPickerOpen(false);
  }

  function handleRandomBuiltInAvatar() {
    const pick = BUILT_IN_AVATARS[Math.floor(Math.random() * BUILT_IN_AVATARS.length)];
    handleSelectBuiltInAvatar(pick.src);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextName = displayName.trim();

    if (nextName.length < 2) {
      setError("Display name must be at least 2 characters.");
      return;
    }

    setSaving(true);
    const result = await onSave?.({
      displayName: nextName,
      avatar,
      about: about.trim(),
    });
    setSaving(false);

    if (!result?.success) {
      setError(result?.error ?? "Could not save profile.");
      return;
    }

    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6">
      <button className="absolute inset-0" style={{ backgroundColor: "rgba(2, 6, 23, 0.72)" }} onClick={onClose} aria-label="Close profile modal" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-2xl backdrop-blur-xl p-4 sm:p-5 space-y-4 animate-message-in"
        style={{
          background: "color-mix(in srgb, var(--color-surface) 92%, var(--color-background) 8%)",
          border: "1px solid color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Profile</h2>
          <button type="button" onClick={onClose} className="transition-colors" style={{ color: "var(--color-text-muted)" }} aria-label="Close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {avatar ? (
            <img
              src={avatar}
              alt={displayName || user.username}
              className="w-16 h-16 rounded-full object-cover"
              style={{ border: "1px solid color-mix(in srgb, var(--color-text-muted) 28%, transparent)" }}
            />
          ) : (
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-xl font-bold`}>
              {getInitials(displayName || user.username)}
            </div>
          )}

          <label
            className="inline-flex items-center px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors"
            style={{
              color: "var(--color-text)",
              border: "1px solid color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
              background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background) 12%)",
            }}
          >
            Change photo
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
        </div>

        <button
          type="button"
          onClick={() => setIsAvatarPickerOpen(true)}
          className="w-full rounded-xl border px-4 py-3 text-sm font-medium transition-all"
          style={{
            color: "var(--color-text)",
            borderColor: "color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
            background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background) 12%)",
          }}
        >
          Choose Built-in Avatar
        </button>

        <div className="space-y-1.5">
          <label className="text-xs" style={{ color: "var(--color-text-muted)" }}>Display name</label>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={40}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
            style={{
              color: "var(--color-text)",
              border: "1px solid color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
              background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background) 12%)",
              boxShadow: "0 0 0 0 transparent",
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs" style={{ color: "var(--color-text-muted)" }}>About</label>
          <textarea
            value={about}
            onChange={(event) => setAbout(event.target.value)}
            rows={3}
            maxLength={120}
            placeholder="Available"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none transition-all"
            style={{
              color: "var(--color-text)",
              border: "1px solid color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
              background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background) 12%)",
            }}
          />
          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Username: @{user.username}</p>
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-1">
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="mr-auto px-3 py-2 rounded-lg text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-colors"
            >
              Logout
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg transition-colors"
            style={{ color: "var(--color-text-muted)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-2 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-60"
            style={{
              background: "linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 80%, white 20%), var(--color-accent))",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>

      <ImageCropModal
        open={Boolean(pendingAvatarFile)}
        sourceFile={pendingAvatarFile}
        title="Crop Profile Picture"
        aspectRatio={1}
        circularOverlay
        onApply={handleCropApply}
        onCancel={handleCropCancel}
      />

      {isAvatarPickerOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => setIsAvatarPickerOpen(false)}
            aria-label="Close avatar picker"
          />
          <div
            className="relative w-full max-w-2xl max-h-[88dvh] overflow-hidden rounded-2xl border backdrop-blur-xl animate-message-in"
            style={{
              borderColor: "color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
              background: "color-mix(in srgb, var(--color-surface) 94%, var(--color-background) 6%)",
            }}
          >
            <div className="px-5 py-4 border-b flex items-start justify-between" style={{ borderColor: "color-mix(in srgb, var(--color-text-muted) 20%, transparent)" }}>
              <div>
                <h3 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Choose Avatar</h3>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Pick your style</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRandomBuiltInAvatar}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                  style={{
                    color: "var(--color-text)",
                    background: "color-mix(in srgb, var(--color-surface) 82%, var(--color-background) 18%)",
                    border: "1px solid color-mix(in srgb, var(--color-text-muted) 24%, transparent)",
                  }}
                >
                  Randomize
                </button>
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg"
                  style={{ color: "var(--color-text-muted)" }}
                  onClick={() => setIsAvatarPickerOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(88dvh-5.25rem)]">
              <div className="flex flex-wrap gap-2 mb-4">
                {AVATAR_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setAvatarCategory(category)}
                    className="px-4 py-2 rounded-2xl text-sm font-bold uppercase tracking-widest"
                    style={
                      avatarCategory === category
                        ? {
                            color: "white",
                            background: "linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 72%, white 28%), var(--color-accent))",
                          }
                        : {
                            color: "var(--color-text)",
                            background: "color-mix(in srgb, var(--color-surface) 82%, var(--color-background) 18%)",
                          }
                    }
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {BUILT_IN_AVATARS.filter((item) => item.category === avatarCategory).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectBuiltInAvatar(item.src)}
                    className="rounded-3xl overflow-hidden p-0.5"
                    style={{
                      border:
                        avatar === item.src
                          ? "2px solid var(--color-accent)"
                          : "1px solid color-mix(in srgb, var(--color-text-muted) 26%, transparent)",
                    }}
                  >
                    <img src={item.src} alt="Built-in avatar" className="w-full h-full aspect-square rounded-[18px] object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
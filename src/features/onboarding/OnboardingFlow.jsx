import { useState, useRef } from "react";
import { validateImageFile, getInitials, getAvatarColor } from "../../utils/helpers.js";
import { upsertChatUser } from "../../services/storageService.js";
import ImageCropModal from "../chat/ImageCropModal.jsx";

const TOTAL_STEPS = 2;

const BUILT_IN_AVATARS = [
  { id: "a1", category: "classic", src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2367c8e8'/%3E%3Cstop offset='1' stop-color='%23248cb1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='24' fill='url(%23g)'/%3E%3Ccircle cx='42' cy='50' r='5' fill='white'/%3E%3Ccircle cx='78' cy='50' r='5' fill='white'/%3E%3Cpath d='M38 77 Q60 92 82 77' stroke='white' stroke-width='6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" },
  { id: "a2", category: "minimal", src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='24' fill='%23dfe2cf'/%3E%3Ccircle cx='42' cy='50' r='4.5' fill='%230f172a'/%3E%3Ccircle cx='78' cy='50' r='4.5' fill='%230f172a'/%3E%3Cpath d='M44 78 Q60 88 76 78' stroke='%230f172a' stroke-width='5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" },
  { id: "a3", category: "cool", src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='24' fill='%232579a6'/%3E%3Ccircle cx='44' cy='48' r='4' fill='white'/%3E%3Ccircle cx='76' cy='48' r='4' fill='white'/%3E%3Cpath d='M50 79 Q60 73 70 79' stroke='white' stroke-width='5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" },
  { id: "a4", category: "neon", src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='24' fill='%23166d95'/%3E%3Ccircle cx='42' cy='50' r='4.5' fill='white'/%3E%3Ccircle cx='78' cy='50' r='4.5' fill='white'/%3E%3Cpath d='M42 74 Q60 88 78 74' stroke='white' stroke-width='5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" },
  { id: "a5", category: "cute", src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='24' fill='%23e5e7d6'/%3E%3Ccircle cx='42' cy='50' r='4' fill='%23111827'/%3E%3Ccircle cx='78' cy='50' r='4' fill='%23111827'/%3E%3Cpath d='M46 79 Q60 86 74 79' stroke='%23111827' stroke-width='5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" },
  { id: "a6", category: "classic", src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='24' fill='%2355b9d1'/%3E%3Ccircle cx='43' cy='49' r='4' fill='white'/%3E%3Ccircle cx='77' cy='49' r='4' fill='white'/%3E%3Cpath d='M40 75 Q60 95 80 75' stroke='white' stroke-width='6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" },
];

const AVATAR_CATEGORIES = ["cute", "cool", "minimal", "neon", "classic"];

export default function OnboardingFlow({ pendingUser, onComplete }) {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(pendingUser?.username ?? "");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [avatarCategory, setAvatarCategory] = useState("classic");
  const [imageError, setImageError] = useState(null);
  const [nameError, setNameError] = useState(null);
  const fileInputRef = useRef(null);

  function handleNextStep() {
    if (!displayName.trim() || displayName.trim().length < 2) {
      setNameError("Display name must be at least 2 characters.");
      return;
    }
    setNameError(null);
    setStep(2);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      setImageError(err);
      return;
    }
    setImageError(null);
    setPendingAvatarFile(file);
  }

  function handleSelectBuiltInAvatar(src) {
    setAvatar(src);
    setAvatarPreview(src);
    setImageError(null);
    setIsAvatarPickerOpen(false);
  }

  function handleRandomBuiltInAvatar() {
    const pick = BUILT_IN_AVATARS[Math.floor(Math.random() * BUILT_IN_AVATARS.length)];
    handleSelectBuiltInAvatar(pick.src);
  }

  function handleRemoveAvatar() {
    setAvatar(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleCropCancel() {
    setPendingAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleCropApply(croppedDataUrl) {
    setAvatar(croppedDataUrl);
    setAvatarPreview(croppedDataUrl);
    setPendingAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFinish() {
    const finalUser = {
      ...pendingUser,
      displayName: displayName.trim(),
      avatar: avatar ?? null,
    };
    upsertChatUser(finalUser);
    onComplete(finalUser);
  }

  const avatarColor = getAvatarColor(pendingUser?.id);

  return (
    <div className="flex flex-col items-center w-full gap-8">
      <div className="flex items-center gap-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i + 1 <= step ? "w-8" : "w-4"}`}
            style={
              i + 1 <= step
                ? { backgroundColor: "var(--color-accent)" }
                : { backgroundColor: "color-mix(in srgb, var(--color-text-muted) 35%, transparent)" }
            }
          />
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-6 w-full">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-1" style={{ color: "var(--color-text)" }}>What's your name?</h2>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>This is how others will see you in ChatFlow</p>
          </div>

          <div className="flex justify-center">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
              {getInitials(displayName || pendingUser?.username)}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setNameError(null);
              }}
              placeholder="Your display name"
              autoFocus
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all"
              style={{
                color: "var(--color-text)",
                background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background) 12%)",
                borderColor: nameError
                  ? "rgba(239,68,68,.45)"
                  : "color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
              }}
            />
            {nameError && <p className="text-xs text-red-400">{nameError}</p>}
          </div>

          <button
            onClick={handleNextStep}
            className="w-full rounded-xl py-3 font-semibold text-white text-sm transition-all"
            style={{
              background: "linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 80%, white 20%), var(--color-accent))",
              boxShadow: "0 10px 24px color-mix(in srgb, var(--color-accent) 24%, transparent)",
            }}
          >
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6 w-full">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-1" style={{ color: "var(--color-text)" }}>Add a profile picture</h2>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Optional — you can always change it later</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover ring-2"
                  style={{ ringColor: "var(--color-accent)" }}
                />
              ) : (
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                  {getInitials(displayName)}
                </div>
              )}
              {avatarPreview && (
                <button
                  onClick={handleRemoveAvatar}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-400 transition-colors shadow-md"
                >
                  ✕
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border px-5 py-2.5 text-sm font-medium transition-all"
              style={{
                color: "var(--color-text)",
                borderColor: "color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
                background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background) 12%)",
              }}
            >
              {avatarPreview ? "Change Photo" : "Upload Photo"}
            </button>

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

            {imageError && <p className="text-xs text-red-400">{imageError}</p>}
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Images only · Max 2MB</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border py-3 font-medium text-sm transition-all"
              style={{
                color: "var(--color-text-muted)",
                borderColor: "color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
                background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background) 12%)",
              }}
            >
              ← Back
            </button>
            <button
              onClick={handleFinish}
              className="flex-[2] rounded-xl py-3 font-semibold text-white text-sm transition-all"
              style={{
                background: "linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 80%, white 20%), var(--color-accent))",
                boxShadow: "0 10px 24px color-mix(in srgb, var(--color-accent) 24%, transparent)",
              }}
            >
              {avatar ? "Finish Setup" : "Skip & Finish"}
            </button>
          </div>
        </div>
      )}

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
                        avatarPreview === item.src
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

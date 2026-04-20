import { useEffect, useMemo, useState } from "react";
import {
  BUILT_IN_THEMES,
  applyTheme,
  findTheme,
  getActiveThemeName,
  getAppThemes,
  saveActiveThemeName,
  saveAppThemes,
} from "../../utils/appTheme";

const CUSTOM_THEME_NAME = "Custom";
const MIDNIGHT_THEME_NAME = "Midnight Blue";
const CUSTOM_EDITOR_TOKENS = [
  ["primary", "Primary"],
  ["secondary", "Secondary"],
  ["tertiary", "Tertiary"],
  ["neutral", "Neutral"],
  ["background", "Background"],
  ["surface", "Surface"],
  ["text", "Text"],
  ["accent", "Accent"],
];

export default function AppThemeModal({ open, onClose, onThemeApplied }) {
  const [themes, setThemes] = useState(() => getAppThemes());
  const [activeThemeName, setActiveThemeName] = useState(() => getActiveThemeName());
  const [isCustomEditorOpen, setIsCustomEditorOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState(null);
  const [editorSnapshot, setEditorSnapshot] = useState(null);

  useEffect(() => {
    if (!open) return;
    const storedThemes = getAppThemes();
    const storedActiveThemeName = getActiveThemeName();
    setThemes(storedThemes);
    setActiveThemeName(storedActiveThemeName);
    setIsCustomEditorOpen(false);
    setCustomDraft(null);
    setEditorSnapshot(null);
  }, [open]);

  const customTheme = useMemo(() => findTheme(themes, CUSTOM_THEME_NAME), [themes]);

  useEffect(() => {
    if (!isCustomEditorOpen || !customDraft) return;
    applyTheme(customDraft);
    onThemeApplied?.(customDraft);
  }, [isCustomEditorOpen, customDraft, onThemeApplied]);

  const handleSelectTheme = (name) => {
    const selectedTheme = findTheme(themes, name);
    setActiveThemeName(selectedTheme.name);
    saveActiveThemeName(selectedTheme.name);
    applyTheme(selectedTheme);
    onThemeApplied?.(selectedTheme);
    if (selectedTheme.name === CUSTOM_THEME_NAME) {
      openCustomThemeEditor(selectedTheme);
    } else {
      onClose?.();
    }
  };

  const openCustomThemeEditor = (themeToEdit) => {
    setEditorSnapshot({ activeThemeName, themes });
    setCustomDraft({ ...themeToEdit });
    setIsCustomEditorOpen(true);
  };

  const handleOpenCustomEditor = () => {
    setActiveThemeName(CUSTOM_THEME_NAME);
    saveActiveThemeName(CUSTOM_THEME_NAME);
    applyTheme(customTheme);
    onThemeApplied?.(customTheme);
    openCustomThemeEditor(customTheme);
  };

  const handleCustomTokenChange = (token, value) => {
    setCustomDraft((prev) => ({ ...prev, [token]: value }));
  };

  const handleResetCustomDraft = () => {
    const midnight = findTheme(BUILT_IN_THEMES, MIDNIGHT_THEME_NAME);
    setCustomDraft({ ...midnight, name: CUSTOM_THEME_NAME });
  };

  const handleCancelCustomEditor = () => {
    if (editorSnapshot) {
      setThemes(editorSnapshot.themes);
      setActiveThemeName(editorSnapshot.activeThemeName);
      const restored = findTheme(editorSnapshot.themes, editorSnapshot.activeThemeName);
      applyTheme(restored);
      onThemeApplied?.(restored);
      saveActiveThemeName(editorSnapshot.activeThemeName);
    }
    setIsCustomEditorOpen(false);
    setCustomDraft(null);
    setEditorSnapshot(null);
  };

  const handleSaveCustomTheme = () => {
    if (!customDraft) return;
    const nextThemes = themes.map((theme) =>
      theme.name === CUSTOM_THEME_NAME ? { ...customDraft, name: CUSTOM_THEME_NAME } : theme
    );
    setThemes(nextThemes);
    saveAppThemes(nextThemes);
    setActiveThemeName(CUSTOM_THEME_NAME);
    saveActiveThemeName(CUSTOM_THEME_NAME);
    const nextCustomTheme = { ...customDraft, name: CUSTOM_THEME_NAME };
    applyTheme(nextCustomTheme);
    onThemeApplied?.(nextCustomTheme);
    setIsCustomEditorOpen(false);
    setCustomDraft(null);
    setEditorSnapshot(null);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center p-2 sm:items-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/65" />
      <div
        className="relative w-full max-w-4xl rounded-2xl border shadow-2xl max-h-[92dvh] overflow-hidden"
        style={{
          borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--color-surface) 96%, black 4%)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}>
          <h3 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Design System Board</h3>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            Close
          </button>
        </div>

        <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[calc(92dvh-84px)]">
          {themes.map((theme) => {
            const selected = theme.name === activeThemeName;
            const isCustom = theme.name === CUSTOM_THEME_NAME;
            return (
              <div
                key={theme.name}
                onClick={() => handleSelectTheme(theme.name)}
                className="group relative rounded-2xl border p-1 transition-all cursor-pointer overflow-hidden"
                style={
                  selected
                    ? {
                        borderColor: "var(--color-accent)",
                        backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, var(--color-surface) 92%)",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.4), inset 0 0 0 1px var(--color-accent)",
                      }
                    : {
                        borderColor: "color-mix(in srgb, var(--color-text) 10%, transparent)",
                        backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, black 10%)",
                      }
                }
              >
                {/* Mockup Preview Area */}
                <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border mb-1" style={{ borderColor: "color-mix(in srgb, var(--color-text) 10%, transparent)" }}>
                  <div className="absolute inset-0 flex">
                    {/* Mini Sidebar */}
                    <div className="w-10 h-full flex flex-col items-center py-2 gap-2" style={{ backgroundColor: theme.surface }}>
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.primary }} />
                      <div className="w-6 h-6 rounded-lg opacity-40" style={{ backgroundColor: theme.neutral }} />
                      <div className="w-6 h-6 rounded-lg opacity-40" style={{ backgroundColor: theme.neutral }} />
                    </div>
                    {/* Mini Chat */}
                    <div className="flex-1 h-full relative p-2 flex flex-col justify-end gap-2" style={{ backgroundColor: theme.background }}>
                       <div className="w-3/4 h-3 rounded-md self-start" style={{ backgroundColor: theme.surface }} />
                       <div className="w-2/3 h-3 rounded-md self-end" style={{ backgroundColor: theme.accent }} />
                       <div className="w-1/2 h-3 rounded-md self-start" style={{ backgroundColor: theme.surface }} />
                    </div>
                  </div>
                  
                  {selected && (
                    <div className="absolute inset-0 bg-accent/10 flex items-center justify-center">
                       <div className="bg-accent text-white rounded-full p-1 shadow-lg">
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                         </svg>
                       </div>
                    </div>
                  )}
                </div>

                <div className="px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold tracking-tight" style={{ color: selected ? "var(--color-text)" : "var(--color-text-muted)" }}>{theme.name}</p>
                    <div className="flex gap-1 mt-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.background }} />
                    </div>
                  </div>

                  {isCustom && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleOpenCustomEditor(); }}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:scale-105 active:scale-95 transition-transform"
                      style={{
                        color: "var(--color-text)",
                        borderColor: "color-mix(in srgb, var(--color-text) 20%, transparent)",
                        backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
                      }}
                    >
                      Configure
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isCustomEditorOpen && customDraft ? (
          <CustomThemeEditorModal
            draft={customDraft}
            onChangeToken={handleCustomTokenChange}
            onReset={handleResetCustomDraft}
            onCancel={handleCancelCustomEditor}
            onSave={handleSaveCustomTheme}
          />
        ) : null}
      </div>
    </div>
  );
}

function CustomThemeEditorModal({ draft, onChangeToken, onReset, onCancel, onSave }) {
  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center p-2 sm:items-center sm:p-3" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/65" />
      <div
        className="relative w-full max-w-xl rounded-2xl border p-3 sm:p-4 shadow-2xl max-h-[90dvh] overflow-y-auto"
        style={{
          borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--color-surface) 96%, black 4%)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h4 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Customize Theme</h4>

        <div
          className="mt-3 rounded-xl border p-3"
          style={{ backgroundColor: draft.background }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: draft.primary, color: draft.text }}
            >
              Primary
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: draft.secondary, color: draft.text }}
            >
              Secondary
            </button>
          </div>
          <div
            className="mt-3 rounded-lg border p-3"
            style={{ backgroundColor: draft.surface, color: draft.text }}
          >
            <p className="text-sm font-medium">Surface Preview</p>
            <p className="mt-1 text-xs" style={{ color: draft.text }}>
              Live preview updates as you pick colors.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CUSTOM_EDITOR_TOKENS.map(([tokenKey, label]) => (
            <ColorField
              key={tokenKey}
              label={label}
              value={draft[tokenKey]}
              onChange={(value) => onChangeToken(tokenKey, value)}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border px-3 py-2 text-xs font-medium"
            style={{
              color: "var(--color-text)",
              borderColor: "color-mix(in srgb, var(--color-text) 20%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
            }}
          >
            Reset to Default
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-3 py-2 text-xs font-medium"
            style={{
              color: "var(--color-text)",
              borderColor: "color-mix(in srgb, var(--color-text) 20%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg border px-3 py-2 text-xs font-medium"
            style={{
              color: "var(--color-text)",
              borderColor: "color-mix(in srgb, var(--color-accent) 44%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--color-accent) 22%, var(--color-surface) 78%)",
            }}
          >
            Save Theme
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label
      className="rounded-lg border p-2"
      style={{
        borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
        backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
      }}
    >
      <span className="block text-[11px] mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</span>
      <div
        className="mb-2 w-full rounded-md border shadow-inner transition-colors duration-200"
        style={{
          backgroundColor: value,
          borderRadius: "6px",
          width: "100%",
          height: "40px",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      />
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-9 cursor-pointer rounded border bg-transparent p-0"
          style={{ borderColor: "color-mix(in srgb, var(--color-text) 20%, transparent)" }}
        />
        <span className="text-[11px] uppercase" style={{ color: "var(--color-text)" }}>{value}</span>
      </div>
    </label>
  );
}
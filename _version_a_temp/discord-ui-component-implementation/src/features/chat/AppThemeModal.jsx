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
                className="rounded-2xl border p-3 transition-all"
                style={
                  selected
                    ? {
                        borderColor: "color-mix(in srgb, var(--color-accent) 64%, transparent)",
                        backgroundColor: "color-mix(in srgb, var(--color-accent) 14%, var(--color-surface) 86%)",
                        boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-accent) 32%, transparent)",
                      }
                    : {
                        borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
                        backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
                      }
                }
              >
                <div className="mb-3 overflow-hidden rounded-lg border" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}>
                  <div className="grid grid-cols-4 h-12">
                    <span style={{ backgroundColor: theme.primary }} />
                    <span style={{ backgroundColor: theme.secondary }} />
                    <span style={{ backgroundColor: theme.tertiary }} />
                    <span style={{ backgroundColor: theme.neutral }} />
                  </div>
                </div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{theme.name}</p>
                  {isCustom ? (
                    <button
                      type="button"
                      onClick={handleOpenCustomEditor}
                      className="rounded-md border px-2 py-0.5 text-[11px]"
                      style={{
                        color: "var(--color-text-muted)",
                        borderColor: "color-mix(in srgb, var(--color-text) 20%, transparent)",
                        backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
                      }}
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectTheme(theme.name)}
                  className="w-full rounded-xl px-3 py-2 text-sm font-medium transition-colors border"
                  style={
                    selected
                      ? {
                          backgroundColor: "color-mix(in srgb, var(--color-accent) 22%, var(--color-surface) 78%)",
                          color: "var(--color-text)",
                          borderColor: "color-mix(in srgb, var(--color-accent) 48%, transparent)",
                        }
                      : {
                          backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
                          color: "var(--color-text-muted)",
                          borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
                        }
                  }
                >
                  {selected ? "Selected" : "Select"}
                </button>
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
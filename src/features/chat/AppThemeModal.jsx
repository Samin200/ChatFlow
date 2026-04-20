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

  // NOTE: We no longer apply theme immediately on draft changes
  // Theme is only applied when user clicks "Save Theme"
  // This allows testing colors before committing

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
    // Apply theme only when saving
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
        className="relative w-full max-w-4xl rounded-3xl border p-6 sm:p-8 shadow-2xl max-h-[90dvh] overflow-y-auto"
        style={{
          borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--color-surface) 96%, black 4%)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Customize Theme</h4>
          <button 
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-text) 10%, transparent)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--color-text)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Two Column Layout: Preview Left, Colors Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          
          {/* Left: Phone Preview */}
          <div className="flex items-center justify-center">
            <div 
              className="relative w-64 h-[480px] rounded-[2.5rem] border-8 p-3 shadow-2xl"
              style={{ 
                backgroundColor: draft.background,
                borderColor: "#1a1a1a",
                boxShadow: `0 25px 50px -12px ${draft.primary}30, 0 0 0 1px ${draft.surface}`
              }}
            >
              {/* Phone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-10" />
              
              {/* Screen Content */}
              <div className="w-full h-full rounded-[2rem] overflow-hidden flex flex-col" style={{ backgroundColor: draft.background }}>
                {/* Header */}
                <div className="px-4 pt-8 pb-3 flex items-center gap-3" style={{ backgroundColor: draft.surface }}>
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: draft.primary, color: draft.text }}
                  >
                    CF
                  </div>
                  <span className="text-sm font-semibold" style={{ color: draft.text }}>ChatFlow</span>
                </div>
                
                {/* Chat Preview */}
                <div className="flex-1 p-4 space-y-3">
                  {/* Their message */}
                  <div className="flex justify-start">
                    <div 
                      className="rounded-2xl rounded-tl-md px-3 py-2 max-w-[80%]"
                      style={{ backgroundColor: draft.surface, color: draft.text }}
                    >
                      <p className="text-xs">Hey! How are you?</p>
                    </div>
                  </div>
                  {/* My message */}
                  <div className="flex justify-end">
                    <div 
                      className="rounded-2xl rounded-tr-md px-3 py-2 max-w-[80%]"
                      style={{ backgroundColor: draft.primary, color: draft.text }}
                    >
                      <p className="text-xs">I'm great! Thanks 😊</p>
                    </div>
                  </div>
                  {/* Accent message */}
                  <div className="flex justify-end">
                    <div 
                      className="rounded-2xl rounded-tr-md px-3 py-2 max-w-[80%]"
                      style={{ backgroundColor: draft.accent, color: draft.background }}
                    >
                      <p className="text-xs font-medium">Check this out!</p>
                    </div>
                  </div>
                </div>
                
                {/* Input Bar */}
                <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: draft.surface }}>
                  <div className="flex-1 h-8 rounded-full" style={{ backgroundColor: draft.background }} />
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: draft.accent }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: draft.background }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Color Controls */}
          <div className="flex flex-col">
            <div className="space-y-1">
              {CUSTOM_EDITOR_TOKENS.map(([tokenKey, label]) => (
                <ColorRow
                  key={tokenKey}
                  label={label}
                  value={draft[tokenKey]}
                  onChange={(value) => onChangeToken(tokenKey, value)}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-4 border-t flex items-center justify-between gap-3" style={{ borderColor: "color-mix(in srgb, var(--color-text) 10%, transparent)" }}>
              <button
                type="button"
                onClick={onReset}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  color: "var(--color-text)",
                  backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
                }}
              >
                Reset
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
                  style={{
                    color: "var(--color-text-muted)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                  style={{
                    color: draft.background,
                    backgroundColor: draft.accent,
                    boxShadow: `0 4px 14px ${draft.accent}50`
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b" style={{ borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)" }}>
      {/* Color Swatch */}
      <div 
        className="w-10 h-10 rounded-full flex-shrink-0 shadow-lg"
        style={{ 
          backgroundColor: value,
          boxShadow: `0 4px 12px ${value}60`
        }}
      />
      
      {/* Label */}
      <span className="flex-1 text-sm font-medium" style={{ color: "var(--color-text)" }}>{label}</span>
      
      {/* Color Picker Button */}
      <label className="relative cursor-pointer group">
        <div 
          className="w-12 h-12 rounded-full border-2 transition-all duration-200 group-hover:scale-110 flex items-center justify-center"
          style={{ 
            backgroundColor: value,
            borderColor: "color-mix(in srgb, var(--color-text) 20%, transparent)",
            boxShadow: `0 0 0 4px ${value}20, inset 0 2px 4px rgba(255,255,255,0.2)`
          }}
        >
          <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: value === '#ffffff' ? '#000' : '#fff' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </div>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="sr-only"
        />
      </label>
      
      {/* Hex Value */}
      <span className="w-16 text-xs font-mono text-right uppercase" style={{ color: "var(--color-text-muted)" }}>
        {value.replace('#', '')}
      </span>
    </div>
  );
}
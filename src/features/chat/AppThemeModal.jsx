import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
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
  const [isSaving, setIsSaving] = useState(false);

  // Store original saved theme for cancel/restore functionality
  const originalThemeRef = useRef(null);
  const originalThemeNameRef = useRef(null);
  const originalThemesRef = useRef(null);

  // Initialize state when modal opens - store deep copy of original theme
  useEffect(() => {
    if (!open) return;
    const storedThemes = getAppThemes();
    const storedActiveThemeName = getActiveThemeName();
    const currentTheme = findTheme(storedThemes, storedActiveThemeName);

    // Store deep copies of original state for cancel functionality
    originalThemeRef.current = JSON.parse(JSON.stringify(currentTheme));
    originalThemeNameRef.current = storedActiveThemeName;
    originalThemesRef.current = JSON.parse(JSON.stringify(storedThemes));

    setThemes(storedThemes);
    setActiveThemeName(storedActiveThemeName);
    setIsCustomEditorOpen(false);
    setCustomDraft(null);
    setEditorSnapshot(null);
  }, [open]);

  // Compute hasChanges by comparing current selection to original saved theme
  const hasChanges = useMemo(() => {
    if (!originalThemeNameRef.current) return false;
    if (activeThemeName !== originalThemeNameRef.current) return true;

    const currentTheme = findTheme(themes, activeThemeName);
    const originalTheme = originalThemeRef.current;

    if (!currentTheme || !originalTheme) return false;

    // Deep comparison of theme properties
    const keysToCompare = ['primary', 'secondary', 'tertiary', 'neutral', 'background', 'surface', 'text', 'accent'];
    return keysToCompare.some(key => currentTheme[key] !== originalTheme[key]);
  }, [activeThemeName, themes]);


  const customTheme = useMemo(() => findTheme(themes, CUSTOM_THEME_NAME), [themes]);

  const handleSelectTheme = (name) => {
    const selectedTheme = findTheme(themes, name);
    setActiveThemeName(selectedTheme.name);

    // Apply preview to DOM immediately (but don't save)
    applyTheme(selectedTheme);
    onThemeApplied?.(selectedTheme);

    if (selectedTheme.name === CUSTOM_THEME_NAME) {
      openCustomThemeEditor(selectedTheme);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const selectedTheme = findTheme(themes, activeThemeName);

      // Save to localStorage (persist theme)
      saveActiveThemeName(activeThemeName);
      saveAppThemes(themes);
      applyTheme(selectedTheme);
      onThemeApplied?.(selectedTheme);

      // Update original refs to match new saved state
      originalThemeRef.current = JSON.parse(JSON.stringify(selectedTheme));
      originalThemeNameRef.current = activeThemeName;
      originalThemesRef.current = JSON.parse(JSON.stringify(themes));

      await Swal.fire({
        icon: "success",
        title: "Theme saved",
        timer: 1500,
        showConfirmButton: false,
      });

      onClose?.();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: err.message || "Failed to save theme",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle modal close/cancel - revert to original theme if unsaved changes
  const handleCancel = () => {
    if (hasChanges && originalThemeRef.current) {
      // Revert to original saved theme
      applyTheme(originalThemeRef.current);
      onThemeApplied?.(originalThemeRef.current);
    }
    onClose?.();
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
    }
    setIsCustomEditorOpen(false);
    setCustomDraft(null);
    setEditorSnapshot(null);
  };

  const handleSaveCustomTheme = async () => {
    if (!customDraft) return;
    setIsSaving(true);
    try {
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

      // Update original refs to match new saved state
      originalThemeRef.current = JSON.parse(JSON.stringify(nextCustomTheme));
      originalThemeNameRef.current = CUSTOM_THEME_NAME;
      originalThemesRef.current = JSON.parse(JSON.stringify(nextThemes));

      setIsCustomEditorOpen(false);
      setCustomDraft(null);
      setEditorSnapshot(null);

      await Swal.fire({
        icon: "success",
        title: "Theme saved",
        timer: 1500,
        showConfirmButton: false,
      });

      onClose?.();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: err.message || "Failed to save theme",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center p-2 sm:items-center sm:p-4" onClick={handleCancel}>
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
            onClick={handleCancel}
            className="rounded-lg px-3 py-1.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            Cancel
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

        {/* Save Changes Button - Bottom Right */}
        {!isCustomEditorOpen && (
          <div className="px-5 py-4 border-t flex justify-end" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={!hasChanges || isSaving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                color: "var(--color-background)",
                backgroundColor: hasChanges ? "var(--color-accent)" : "color-mix(in srgb, var(--color-text) 30%, transparent)",
                boxShadow: hasChanges ? "0 4px 14px color-mix(in srgb, var(--color-accent) 50%, transparent)" : "none",
              }}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        {isCustomEditorOpen && customDraft ? (
          <CustomThemeEditorModal
            draft={customDraft}
            onChangeToken={handleCustomTokenChange}
            onReset={handleResetCustomDraft}
            onCancel={handleCancelCustomEditor}
            onSave={handleSaveCustomTheme}
            hasChanges={hasChanges}
            isSaving={isSaving}
          />
        ) : null}
      </div>
    </div>
  );
}

function CustomThemeEditorModal({ draft, onChangeToken, onReset, onCancel, onSave, hasChanges, isSaving }) {
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

        {/* Two Column Layout: Previews Left, Colors Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          
          {/* Left: Two Phone Previews Side by Side */}
          <div className="flex items-center justify-center gap-4">
            
            {/* Preview 1: Chat Conversation */}
            <div 
              className="relative w-36 h-[280px] rounded-[1.5rem] border-4 p-2 shadow-xl"
              style={{ 
                backgroundColor: draft.background,
                borderColor: "#1a1a1a",
                boxShadow: `0 20px 40px -10px ${draft.primary}30`
              }}
            >
              {/* Phone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-4 bg-black rounded-b-xl z-10" />
              
              {/* Screen Content */}
              <div className="w-full h-full rounded-[1rem] overflow-hidden flex flex-col" style={{ backgroundColor: draft.background }}>
                {/* Chat Header */}
                <div className="px-2 pt-5 pb-2 flex items-center gap-2" style={{ backgroundColor: draft.surface }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: draft.text }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{ backgroundColor: draft.accent, color: draft.background }}
                  >
                    U
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] font-semibold" style={{ color: draft.text }}>newbie</p>
                    <p className="text-[6px] opacity-70" style={{ color: draft.text }}>last seen recently</p>
                  </div>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: draft.text }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: draft.text }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                
                {/* Date Label */}
                <div className="flex justify-center py-2">
                  <span className="text-[6px] px-2 py-0.5 rounded-full" style={{ backgroundColor: draft.surface, color: draft.text }}>
                    Today
                  </span>
                </div>
                
                {/* Chat Messages */}
                <div className="flex-1 px-2 space-y-1.5">
                  {/* My message */}
                  <div className="flex justify-end">
                    <div 
                      className="rounded-xl rounded-tr-sm px-2 py-1 max-w-[90%]"
                      style={{ backgroundColor: draft.primary, color: draft.background }}
                    >
                      <p className="text-[8px]">yoyoy</p>
                    </div>
                  </div>
                  {/* Call message */}
                  <div className="flex justify-end">
                    <div 
                      className="rounded-xl rounded-tr-sm px-2 py-1 max-w-[90%]"
                      style={{ backgroundColor: draft.primary, color: draft.background }}
                    >
                      <p className="text-[8px] flex items-center gap-1">
                        <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Voice call ended · 8
                      </p>
                    </div>
                  </div>
                  {/* Another my message */}
                  <div className="flex justify-end">
                    <div 
                      className="rounded-xl rounded-tr-sm px-2 py-1 max-w-[90%]"
                      style={{ backgroundColor: draft.primary, color: draft.background }}
                    >
                      <p className="text-[8px]">oi</p>
                    </div>
                  </div>
                  {/* Their message */}
                  <div className="flex justify-start items-end gap-1">
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[6px]"
                      style={{ backgroundColor: draft.accent, color: draft.background }}
                    >
                      U
                    </div>
                    <div 
                      className="rounded-xl rounded-tl-sm px-2 py-1 max-w-[85%]"
                      style={{ backgroundColor: draft.surface, color: draft.text }}
                    >
                      <p className="text-[8px]">Ki</p>
                    </div>
                  </div>
                </div>
                
                {/* Input Bar */}
                <div className="px-2 py-2 flex items-center gap-1.5" style={{ backgroundColor: draft.surface }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: draft.text }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: draft.text }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1 h-5 rounded-full text-[6px] flex items-center px-2" style={{ backgroundColor: draft.background, color: draft.textMuted || draft.text }}>
                    Type a message...
                  </div>
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: draft.primary }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: draft.background }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview 2: Sidebar */}
            <div 
              className="relative w-36 h-[280px] rounded-[1.5rem] border-4 p-2 shadow-xl"
              style={{ 
                backgroundColor: draft.background,
                borderColor: "#1a1a1a",
                boxShadow: `0 20px 40px -10px ${draft.primary}30`
              }}
            >
              {/* Phone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-4 bg-black rounded-b-xl z-10" />
              
              {/* Screen Content */}
              <div className="w-full h-full rounded-[1rem] overflow-hidden flex flex-col" style={{ backgroundColor: draft.background }}>
                {/* App Header */}
                <div className="px-3 pt-5 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: draft.primary }}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: draft.background }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: draft.text }}>ChatFlow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: draft.text }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: draft.text }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold"
                      style={{ backgroundColor: draft.accent, color: draft.background }}
                    >
                      S
                    </div>
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className="px-3 pb-3">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: draft.surface }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: draft.textMuted || draft.text }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-[7px]" style={{ color: draft.textMuted || draft.text }}>Search conversations...</span>
                  </div>
                </div>

                {/* Section Label */}
                <div className="px-3 pb-2">
                  <span className="text-[7px] font-bold tracking-wider uppercase" style={{ color: draft.textMuted || draft.text, opacity: 0.7 }}>
                    Messages
                  </span>
                </div>
                
                {/* Conversation List */}
                <div className="flex-1 px-2 space-y-1">
                  {/* Conversation Item */}
                  <div className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ backgroundColor: draft.surface }}>
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-bold"
                      style={{ backgroundColor: draft.accent, color: draft.background }}
                    >
                      U
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[8px] font-semibold truncate" style={{ color: draft.text }}>newbie</p>
                        <span className="text-[6px]" style={{ color: draft.textMuted || draft.text, opacity: 0.7 }}>02:15</span>
                      </div>
                      <p className="text-[7px] truncate" style={{ color: draft.textMuted || draft.text }}>Ki</p>
                    </div>
                    <div 
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: draft.primary }}
                    />
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
                  disabled={!hasChanges || isSaving}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    color: draft.background,
                    backgroundColor: hasChanges ? draft.accent : "color-mix(in srgb, var(--color-text) 30%, transparent)",
                    boxShadow: hasChanges ? `0 4px 14px ${draft.accent}50` : "none",
                  }}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
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
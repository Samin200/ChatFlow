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
  const [showLegacy, setShowLegacy] = useState(false);

  const originalThemeRef = useRef(null);
  const originalThemeNameRef = useRef(null);
  const originalThemesRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const storedThemes = getAppThemes();
    const storedActiveThemeName = getActiveThemeName();
    const currentTheme = findTheme(storedThemes, storedActiveThemeName);

    originalThemeRef.current = JSON.parse(JSON.stringify(currentTheme));
    originalThemeNameRef.current = storedActiveThemeName;
    originalThemesRef.current = JSON.parse(JSON.stringify(storedThemes));

    setThemes(storedThemes);
    setActiveThemeName(storedActiveThemeName);
    setIsCustomEditorOpen(false);
    setCustomDraft(null);
    setEditorSnapshot(null);
  }, [open]);

  const hasChanges = useMemo(() => {
    if (!originalThemeNameRef.current) return false;
    if (activeThemeName !== originalThemeNameRef.current) return true;
    const currentTheme = findTheme(themes, activeThemeName);
    const originalTheme = originalThemeRef.current;
    if (!currentTheme || !originalTheme) return false;
    const keysToCompare = ['primary', 'secondary', 'tertiary', 'neutral', 'background', 'surface', 'text', 'accent'];
    return keysToCompare.some(key => currentTheme[key] !== originalTheme[key]);
  }, [activeThemeName, themes]);

  const handleSelectTheme = (name) => {
    const selectedTheme = findTheme(themes, name);
    setActiveThemeName(selectedTheme.name);
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
      saveActiveThemeName(activeThemeName);
      saveAppThemes(themes);
      applyTheme(selectedTheme);
      onThemeApplied?.(selectedTheme);
      originalThemeRef.current = JSON.parse(JSON.stringify(selectedTheme));
      originalThemeNameRef.current = activeThemeName;
      originalThemesRef.current = JSON.parse(JSON.stringify(themes));
      await Swal.fire({ icon: "success", title: "Theme saved", timer: 1500, showConfirmButton: false });
      onClose?.();
    } catch (err) {
      await Swal.fire({ icon: "error", title: err.message || "Failed to save theme" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges && originalThemeRef.current) {
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
    const customTheme = findTheme(themes, CUSTOM_THEME_NAME);
    setActiveThemeName(CUSTOM_THEME_NAME);
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
      originalThemeRef.current = JSON.parse(JSON.stringify(nextCustomTheme));
      originalThemeNameRef.current = CUSTOM_THEME_NAME;
      originalThemesRef.current = JSON.parse(JSON.stringify(nextThemes));
      setIsCustomEditorOpen(false);
      setCustomDraft(null);
      setEditorSnapshot(null);
      await Swal.fire({ icon: "success", title: "Theme saved", timer: 1500, showConfirmButton: false });
      onClose?.();
    } catch (err) {
      await Swal.fire({ icon: "error", title: err.message || "Failed to save theme" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  const commonProps = {
    themes,
    activeThemeName,
    onSelect: handleSelectTheme,
    onSave: handleSaveChanges,
    onCancel: handleCancel,
    onOpenCustom: handleOpenCustomEditor,
    hasChanges,
    isSaving,
    isCustomEditorOpen,
    onToggleLegacy: () => setShowLegacy(!showLegacy),
    customDraft,
    onCustomTokenChange: handleCustomTokenChange,
    onCustomReset: handleResetCustomDraft,
    onCustomCancel: handleCancelCustomEditor,
    onCustomSave: handleSaveCustomTheme
  };

  return showLegacy ? (
    <LegacyAppThemeUI {...commonProps} />
  ) : (
    <ModernAppThemeUI {...commonProps} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODERN UI COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function ModernAppThemeUI(props) {
  const { themes, activeThemeName, onSelect, onSave, onCancel, onOpenCustom, hasChanges, isSaving, isCustomEditorOpen, onToggleLegacy, customDraft, onCustomTokenChange, onCustomReset, onCustomCancel, onCustomSave } = props;
  
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#000]/80 backdrop-blur-md" onClick={onCancel} />
      
      <div 
        className="relative w-full max-w-6xl h-[85dvh] rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col bg-[#080808]/90 backdrop-blur-2xl"
      >
        {/* Modern Header */}
        <div className="px-10 py-8 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter">APPEARANCE</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Premium Theme Engine</p>
            </div>
          </div>
          <button 
            onClick={onCancel} 
            className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 border border-white/5"
          >
            <svg className="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modern Grid */}
        <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {themes.map((theme) => (
               <ModernThemeCard 
                 key={theme.name} 
                 theme={theme} 
                 selected={theme.name === activeThemeName}
                 onSelect={() => onSelect(theme.name)}
                 onOpenCustom={onOpenCustom}
               />
             ))}
           </div>
        </div>

        {/* Modern Footer */}
        <div className="px-10 py-8 border-t border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between shrink-0">
           <button 
             onClick={onToggleLegacy}
             className="px-4 py-2 rounded-xl text-white/20 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-white/50 transition-colors border border-white/5"
           >
             Switch to Legacy
           </button>
           <div className="flex items-center gap-6">
             <button onClick={onCancel} className="text-white/40 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors">
               Discard
             </button>
             <button 
               onClick={onSave}
               disabled={!hasChanges || isSaving}
               className={`px-12 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-sm transition-all shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 disabled:opacity-20 disabled:scale-100 disabled:shadow-none ${hasChanges ? 'bg-white text-black' : 'bg-white/5 text-white/20'}`}
             >
               {isSaving ? "Synchronizing..." : "Apply Theme"}
             </button>
           </div>
        </div>

        {/* Floating Custom Editor Overlay */}
        {isCustomEditorOpen && customDraft && (
          <div className="absolute inset-0 z-50 bg-[#050505]/95 backdrop-blur-3xl animate-in fade-in duration-500">
             <CustomThemeEditorModal 
                draft={customDraft}
                onChangeToken={onCustomTokenChange}
                onReset={onCustomReset}
                onCancel={onCustomCancel}
                onSave={onCustomSave}
                hasChanges={hasChanges}
                isSaving={isSaving}
             />
          </div>
        )}
      </div>
    </div>
  );
}

function ModernThemeCard({ theme, selected, onSelect, onOpenCustom }) {
  const isCustom = theme.name === CUSTOM_THEME_NAME;
  
  return (
    <div 
      onClick={onSelect}
      className={`group relative h-80 rounded-[2.5rem] p-1.5 transition-all duration-700 cursor-pointer ${selected ? 'scale-[1.03]' : 'hover:scale-[1.02]'}`}
      style={{
        background: selected 
          ? `linear-gradient(135deg, ${theme.accent}, ${theme.primary}00, ${theme.accent})`
          : 'rgba(255,255,255,0.03)',
        boxShadow: selected ? `0 30px 60px -12px ${theme.accent}40` : 'none'
      }}
    >
      <div className="bg-[#0c0c0c] rounded-[2.3rem] overflow-hidden h-full flex flex-col relative border border-white/5">
        {/* Glow Effect Overlay */}
        {selected && (
          <div 
            className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-30 transition-all duration-1000"
            style={{ backgroundColor: theme.accent }}
          />
        )}

        {/* Mockup Preview */}
        <div className="relative flex-1 w-full overflow-hidden p-6">
           <div className="w-full h-full rounded-[1.5rem] border border-white/5 shadow-2xl flex flex-col overflow-hidden" style={{ backgroundColor: theme.background }}>
              {/* Mini Top Bar */}
              <div className="h-6 px-3 flex items-center justify-between shrink-0" style={{ backgroundColor: theme.surface }}>
                 <div className="w-8 h-1 rounded-full bg-white/10" />
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
              </div>
              {/* Content mock */}
              <div className="flex-1 p-3 flex flex-col gap-2 justify-end">
                 <div className="w-3/4 h-3 rounded-lg self-start" style={{ backgroundColor: theme.surface }} />
                 <div className="w-1/2 h-4 rounded-lg self-end" style={{ backgroundColor: theme.accent }} />
                 <div className="w-2/3 h-3 rounded-lg self-start opacity-50" style={{ backgroundColor: theme.surface }} />
              </div>
           </div>
           
           {selected && (
             <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] flex items-center justify-center transition-all">
                <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.4)] animate-in zoom-in-50 duration-500">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
             </div>
           )}
        </div>

        {/* Card Footer */}
        <div className="px-8 py-6 flex items-center justify-between bg-white/[0.02] border-t border-white/5">
           <div>
             <h4 className={`text-lg font-black tracking-tight transition-colors ${selected ? 'text-white' : 'text-white/40'}`}>{theme.name.toUpperCase()}</h4>
             <div className="flex gap-2 mt-2">
               {[theme.primary, theme.accent, theme.background].map((c, i) => (
                 <div key={i} className="w-2 h-2 rounded-full ring-1 ring-white/10" style={{ backgroundColor: c }} />
               ))}
             </div>
           </div>
           
           {isCustom && (
             <button 
               onClick={(e) => { e.stopPropagation(); onOpenCustom(); }}
               className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-90 border border-white/5"
             >
               <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
               </svg>
             </button>
           )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY UI COMPONENT (OLD CODE PRESERVED EXACTLY)
// ─────────────────────────────────────────────────────────────────────────────

function LegacyAppThemeUI(props) {
  const { themes, activeThemeName, onSelect, onSave, onCancel, onOpenCustom, hasChanges, isSaving, isCustomEditorOpen, onToggleLegacy, customDraft, onCustomTokenChange, onCustomReset, onCustomCancel, onCustomSave } = props;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center p-2 sm:items-center sm:p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/65" />
      <div
        className="relative w-full max-w-4xl rounded-2xl border shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden"
        style={{
          borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--color-surface) 96%, black 4%)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)" }}>
          <h3 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Design System Board</h3>
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

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {themes.map((theme) => {
            const selected = theme.name === activeThemeName;
            const isCustom = theme.name === CUSTOM_THEME_NAME;
            return (
              <div
                key={theme.name}
                onClick={() => onSelect(theme.name)}
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
                <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border mb-1" style={{ borderColor: "color-mix(in srgb, var(--color-text) 10%, transparent)" }}>
                   <div className="absolute inset-0 flex">
                     <div className="w-10 h-full flex flex-col items-center py-2 gap-2" style={{ backgroundColor: theme.surface }}>
                       <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.primary }} />
                       <div className="w-6 h-6 rounded-lg opacity-40" style={{ backgroundColor: theme.neutral }} />
                     </div>
                     <div className="flex-1 h-full relative p-2 flex flex-col justify-end gap-2" style={{ backgroundColor: theme.background }}>
                        <div className="w-3/4 h-3 rounded-md self-start" style={{ backgroundColor: theme.surface }} />
                        <div className="w-2/3 h-3 rounded-md self-end" style={{ backgroundColor: theme.accent }} />
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
                    </div>
                  </div>
                  {isCustom && <button onClick={(e) => { e.stopPropagation(); onOpenCustom(); }} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Configure</button>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t flex justify-between items-center shrink-0" style={{ borderColor: "color-mix(in srgb, var(--color-text) 20%, transparent)", backgroundColor: "var(--color-surface)" }}>
          <button onClick={onToggleLegacy} className="text-xs underline opacity-30 hover:opacity-100">Switch to Modern UI</button>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm border" style={{ color: "var(--color-text)", borderColor: "var(--color-text-muted)" }}>Cancel</button>
            <button onClick={onSave} disabled={!hasChanges} className="px-6 py-2 rounded-xl text-sm font-semibold bg-accent text-white disabled:opacity-50">Save Changes</button>
          </div>
        </div>

        {isCustomEditorOpen && customDraft && (
          <CustomThemeEditorModal 
            draft={customDraft}
            onChangeToken={onCustomTokenChange}
            onReset={onCustomReset}
            onCancel={onCustomCancel}
            onSave={onCustomSave}
            hasChanges={hasChanges}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CUSTOM EDITOR COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function CustomThemeEditorModal({ draft, onChangeToken, onReset, onCancel, onSave, hasChanges, isSaving }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-8" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      <div
        className="relative w-full max-w-5xl rounded-[3rem] border border-white/10 p-8 sm:p-12 shadow-[0_0_100px_rgba(0,0,0,0.8)] max-h-full overflow-y-auto bg-[#0a0a0a]/95 backdrop-blur-3xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-10">
          <h4 className="text-3xl font-black text-white tracking-tighter">CUSTOMIZE</h4>
          <button onClick={onCancel} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
             <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 flex-1">
          {/* Previews */}
          <div className="flex items-center justify-center gap-6">
            <PhonePreview draft={draft} type="chat" />
            <PhonePreview draft={draft} type="sidebar" />
          </div>

          {/* Color Controls */}
          <div className="flex flex-col">
            <div className="space-y-2">
              {CUSTOM_EDITOR_TOKENS.map(([tokenKey, label]) => (
                <ColorRow key={tokenKey} label={label} value={draft[tokenKey]} onChange={(value) => onChangeToken(tokenKey, value)} />
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between">
              <button onClick={onReset} className="text-white/30 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">Reset Defaults</button>
              <div className="flex gap-4">
                <button onClick={onCancel} className="text-white/40 font-bold uppercase tracking-widest text-xs px-4">Discard</button>
                <button 
                  onClick={onSave} 
                  disabled={!hasChanges || isSaving}
                  className="px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs bg-white text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-20"
                >
                  {isSaving ? "Saving..." : "Save Custom"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhonePreview({ draft, type }) {
  return (
    <div 
      className="relative w-44 h-80 rounded-[2.5rem] border-[6px] border-[#1a1a1a] shadow-2xl overflow-hidden shrink-0"
      style={{ backgroundColor: draft.background, boxShadow: `0 30px 60px -15px ${draft.accent}40` }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-4 bg-[#1a1a1a] rounded-b-xl z-20" />
      <div className="w-full h-full flex flex-col pt-6 pb-2">
         {type === 'chat' ? (
           <div className="flex-1 flex flex-col">
              <div className="h-8 px-3 flex items-center gap-2 shrink-0" style={{ backgroundColor: draft.surface }}>
                 <div className="w-4 h-4 rounded-full" style={{ backgroundColor: draft.accent }} />
                 <div className="flex-1 h-2 rounded-full bg-white/5" />
              </div>
              <div className="flex-1 p-3 flex flex-col gap-2 justify-end">
                 <div className="w-3/4 h-3 rounded-lg self-start" style={{ backgroundColor: draft.surface }} />
                 <div className="w-1/2 h-5 rounded-lg self-end" style={{ backgroundColor: draft.accent }} />
                 <div className="w-2/3 h-3 rounded-lg self-start" style={{ backgroundColor: draft.surface }} />
              </div>
           </div>
         ) : (
           <div className="flex-1 flex flex-col px-3">
              <div className="flex items-center gap-2 mb-4">
                 <div className="w-6 h-6 rounded-full" style={{ backgroundColor: draft.primary }} />
                 <div className="w-12 h-2 rounded-full bg-white/10" />
              </div>
              <div className="space-y-2">
                 <div className="w-full h-8 rounded-xl" style={{ backgroundColor: draft.surface }} />
                 <div className="w-full h-8 rounded-xl opacity-40" style={{ backgroundColor: draft.surface }} />
              </div>
           </div>
         )}
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-4 py-2 border-b border-white/5 group">
      <div className="w-8 h-8 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: value }} />
      <span className="flex-1 text-[10px] font-bold text-white/50 uppercase tracking-widest group-hover:text-white/80 transition-colors">{label}</span>
      <label className="relative cursor-pointer">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
           <div className="w-6 h-6 rounded-lg shadow-inner" style={{ backgroundColor: value }} />
        </div>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="sr-only" />
      </label>
    </div>
  );
}
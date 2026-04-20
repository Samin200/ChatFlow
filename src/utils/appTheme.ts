type AppTheme = {
  name: string;
  primary: string;
  secondary: string;
  tertiary: string;
  neutral: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
};

const THEME_KEYS = {
  THEMES: "appThemes",
  ACTIVE: "activeTheme",
} as const;

const MIDNIGHT_BLUE: AppTheme = {
  name: "Midnight Blue",
  primary: "#5882F6",
  secondary: "#80A5FA",
  tertiary: "#93C5FD",
  neutral: "#5F172A",
  background: "#020617",
  surface: "#0f172a",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  accent: "#14b8a6",
};

const DEEP_PURPLE: AppTheme = {
  name: "Deep Purple",
  primary: "#885CF6",
  secondary: "#A785FA",
  tertiary: "#C4B5FD",
  neutral: "#1E1848",
  background: "#120f26",
  surface: "#1b1638",
  text: "#ede9fe",
  textMuted: "#b7a7f6",
  accent: "#a78bfa",
};

const SUNSET_ORANGE: AppTheme = {
  name: "Sunset Orange",
  primary: "#F97235",
  secondary: "#FB923C",
  tertiary: "#7C2D12",
  neutral: "#121212",
  background: "#14110f",
  surface: "#221914",
  text: "#f8e3d7",
  textMuted: "#d4b39f",
  accent: "#fb923c",
};

const LIGHT: AppTheme = {
  name: "Light",
  primary: "#2563eb",
  secondary: "#60a5fa",
  tertiary: "#bfdbfe",
  neutral: "#e5e7eb",
  background: "#f3f4f6",
  surface: "#ffffff",
  text: "#0f172a",
  textMuted: "#475569",
  accent: "#0284c7",
};

const DARK_AMOLED: AppTheme = {
  name: "Dark AMOLED",
  primary: "#10b981",
  secondary: "#34d399",
  tertiary: "#6ee7b7",
  neutral: "#000000",
  background: "#000000",
  surface: "#050505",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  accent: "#14b8a6",
};

const CUSTOM_THEME: AppTheme = {
  ...MIDNIGHT_BLUE,
  name: "Custom",
};

export const BUILT_IN_THEMES: AppTheme[] = [
  MIDNIGHT_BLUE,
  DEEP_PURPLE,
  SUNSET_ORANGE,
  LIGHT,
  DARK_AMOLED,
  CUSTOM_THEME,
];

const TOKEN_KEYS: (keyof Omit<AppTheme, "name">)[] = [
  "primary",
  "secondary",
  "tertiary",
  "neutral",
  "background",
  "surface",
  "text",
  "textMuted",
  "accent",
];

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeTheme(input: unknown, fallback: AppTheme): AppTheme {
  const source = input && typeof input === "object" ? (input as Partial<AppTheme>) : {};
  const next: AppTheme = {
    ...fallback,
    name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : fallback.name,
  };

  for (const key of TOKEN_KEYS) {
    next[key] = isHex(source[key]) ? source[key] : fallback[key];
  }

  return next;
}

function parseStoredThemes(): AppTheme[] | null {
  try {
    const raw = localStorage.getItem(THEME_KEYS.THEMES);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppTheme[]) : null;
  } catch {
    return null;
  }
}

export function getAppThemes(): AppTheme[] {
  const stored = parseStoredThemes();
  if (!stored) {
    return BUILT_IN_THEMES.map((theme) => ({ ...theme }));
  }

  const byName = new Map(stored.map((theme) => [theme?.name, theme]));
  return BUILT_IN_THEMES.map((preset) => {
    // Built-in themes stay canonical. Only "Custom" can be user-overridden.
    if (preset.name !== "Custom") {
      return { ...preset };
    }
    return normalizeTheme(byName.get("Custom"), preset);
  });
}

export function saveAppThemes(themes: AppTheme[]) {
  if (!Array.isArray(themes)) return;
  localStorage.setItem(THEME_KEYS.THEMES, JSON.stringify(themes));
}

export function getActiveThemeName() {
  const saved = localStorage.getItem(THEME_KEYS.ACTIVE);
  const available = new Set(BUILT_IN_THEMES.map((theme) => theme.name));
  return available.has(saved ?? "") ? (saved as string) : MIDNIGHT_BLUE.name;
}

export function saveActiveThemeName(name: string) {
  localStorage.setItem(THEME_KEYS.ACTIVE, name);
}

export function findTheme(themes: AppTheme[], name: string) {
  return themes.find((theme) => theme.name === name) ?? themes[0] ?? { ...MIDNIGHT_BLUE };
}

export function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  const safeTheme = normalizeTheme(theme, MIDNIGHT_BLUE);
  root.style.setProperty("--color-primary", safeTheme.primary);
  root.style.setProperty("--color-secondary", safeTheme.secondary);
  root.style.setProperty("--color-tertiary", safeTheme.tertiary);
  root.style.setProperty("--color-neutral", safeTheme.neutral);
  root.style.setProperty("--color-background", safeTheme.background);
  root.style.setProperty("--color-surface", safeTheme.surface);
  root.style.setProperty("--color-text", safeTheme.text);
  root.style.setProperty("--color-text-muted", safeTheme.textMuted);
  root.style.setProperty("--color-accent", safeTheme.accent);
  root.setAttribute("data-theme", safeTheme.name.toLowerCase().replace(/\s+/g, "-"));
}

export function initializeAppTheme() {
  const themes = getAppThemes();
  const activeName = getActiveThemeName();
  const activeTheme = findTheme(themes, activeName);
  saveAppThemes(themes);
  saveActiveThemeName(activeTheme.name);
  applyTheme(activeTheme);
}

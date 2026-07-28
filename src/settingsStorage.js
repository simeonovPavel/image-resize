const SETTINGS_KEY = "resize-last-settings";
const HISTORY_KEY = "resize-settings-history";
const MAX_HISTORY = 8;

export const DEFAULT_SETTINGS = {
  width: 1980,
  height: 1320,
  fit: "cover",
  outputFormat: "original",
  compression: "web",
  renameBase: "",
  lockAspect: false,
  watermarkEnabled: false,
  watermarkType: "text",
  watermarkText: "",
  watermarkPosition: "southeast",
  watermarkOpacity: 0.4,
  watermarkScale: 0.2,
};

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  const next = { ...DEFAULT_SETTINGS, ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function settingsLabel(settings) {
  const w = Number(settings.width);
  const h = Number(settings.height);
  const size = Number.isFinite(w) && Number.isFinite(h) ? `${w}×${h}` : "—";
  const format = settings.outputFormat === "original" ? "orig" : settings.outputFormat;
  const compression = settings.compression || "web";
  const rename = String(settings.renameBase || "").trim();
  const parts = [size, format, compression];
  if (rename) parts.push(rename);
  if (settings.watermarkEnabled) parts.push("wm");
  return parts.join(" · ");
}

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => isPlainObject(item) && isPlainObject(item.settings))
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export function pushHistory(settings) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: settingsLabel(settings),
    savedAt: Date.now(),
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };

  const prev = loadHistory().filter(
    (item) => item.label !== entry.label
  );
  const next = [entry, ...prev].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

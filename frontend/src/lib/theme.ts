export type ThemePreference = "system" | "light" | "dark";
export const THEME_STORAGE_KEY = "tocpns-theme";
export const THEME_EVENT = "tocpns-theme-change";

// Runs in <head> before the first paint. No account or exam data is involved.
export const themeBootstrap = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var t=p==="light"||p==="dark"?p:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){var t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}})();`;

let memoryPreference: ThemePreference | null = null;
export function readThemePreference(): ThemePreference {
  if (memoryPreference) return memoryPreference;
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(preference: ThemePreference) {
  const resolved =
    preference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function setThemePreference(preference: ThemePreference) {
  memoryPreference = preference;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* Tab-local choice still works. */
  }
  applyTheme(preference);
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function themeSnapshot() {
  return `${readThemePreference()}:${document.documentElement.dataset.theme || "light"}`;
}

export function subscribeTheme(notify: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const refresh = () => {
    applyTheme(readThemePreference());
    notify();
  };
  const storage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      memoryPreference = null;
      refresh();
    }
  };
  refresh();
  media.addEventListener("change", refresh);
  window.addEventListener("storage", storage);
  window.addEventListener(THEME_EVENT, refresh);
  return () => {
    media.removeEventListener("change", refresh);
    window.removeEventListener("storage", storage);
    window.removeEventListener(THEME_EVENT, refresh);
  };
}

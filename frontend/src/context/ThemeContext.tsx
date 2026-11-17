"use client";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  ReactNode,
} from "react";
import {
  ThemePreference,
  setThemePreference,
  subscribeTheme,
  themeSnapshot,
} from "@/lib/theme";

const ThemeContext = createContext<{
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
  setPreference: typeof setThemePreference;
} | null>(null);
const serverSnapshot = () => "system:light";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeTheme,
    themeSnapshot,
    serverSnapshot,
  );
  const value = useMemo(() => {
    const [preference, resolvedTheme] = snapshot.split(":");
    return {
      preference: preference as ThemePreference,
      resolvedTheme: resolvedTheme as "light" | "dark",
      setPreference: setThemePreference,
    };
  }, [snapshot]);
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider diperlukan.");
  return context;
}

"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle() {
  const { resolvedTheme, setPreference } = useTheme();
  const dark = resolvedTheme === "dark";
  const label = dark ? "Gunakan tema terang" : "Gunakan tema gelap";
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => setPreference(dark ? "light" : "dark")}
    >
      {dark ? (
        <Sun size={19} aria-hidden="true" />
      ) : (
        <Moon size={19} aria-hidden="true" />
      )}
    </button>
  );
}

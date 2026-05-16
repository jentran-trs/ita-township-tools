"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

// Floating light/dark theme toggle. Adds/removes the `dark` class on <html>;
// pages and components that use `dark:` Tailwind variants react automatically.
// The preference is read by an inline script in app/layout.tsx before React
// hydrates so users with a saved preference don't see a flash of the wrong
// theme on first paint.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // After mount, sync state with whatever the inline script applied.
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    try {
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("tt_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("tt_theme", "light");
      }
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white text-gray-800 border-2 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 rounded-full shadow-lg px-4 py-2.5 text-sm font-semibold hover:shadow-xl transition-all"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      <span className="hidden sm:inline">{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

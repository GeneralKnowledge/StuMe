"use client";

import { useEffect, useState } from "react";

export type StuMeTheme = "linen" | "night";

const STORAGE_KEY = "stume-theme";

function applyTheme(theme: StuMeTheme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "linen" ? "#e6e0d4" : "#1a1612");
  }
}

export function readStoredTheme(): StuMeTheme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "night" || value === "linen") return value;
  } catch {
    /* ignore */
  }
  return "linen";
}

/** Light (linen) ↔ dark mode toggle. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<StuMeTheme>("linen");

  useEffect(() => {
    const current = readStoredTheme();
    setTheme(current);
    applyTheme(current);
  }, []);

  function toggle() {
    const next: StuMeTheme = theme === "linen" ? "night" : "linen";
    setTheme(next);
    applyTheme(next);
  }

  const goingDark = theme === "linen";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={goingDark ? "Switch to dark mode" : "Switch to light mode"}
      title={goingDark ? "Dark" : "Light"}
    >
      {goingDark ? "Dark" : "Light"}
    </button>
  );
}

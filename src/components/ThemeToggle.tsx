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
    meta.setAttribute("content", theme === "linen" ? "#e6e0d4" : "#10231f");
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

/** Small control so linen vs night can be compared in-product. */
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

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === "linen" ? "Switch to night colours" : "Switch to linen colours"}
      title={theme === "linen" ? "Night" : "Linen"}
    >
      {theme === "linen" ? "Night" : "Linen"}
    </button>
  );
}

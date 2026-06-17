"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function getInitial(): Theme {
  if (typeof document === "undefined") return "dark";
  return (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  // Sync with whatever the no-flash script already set on <html>.
  useEffect(() => setTheme(getInitial()), []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage may be unavailable; ignore */
    }
  }

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle color theme">
      <span aria-hidden>{theme === "dark" ? "🌙" : "☀️"}</span>
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}

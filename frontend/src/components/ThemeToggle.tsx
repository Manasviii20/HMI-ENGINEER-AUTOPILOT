import type { Theme } from "../hooks/useTheme";

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const isDark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label="Toggle color theme"
      className="relative w-14 h-7 rounded-full border transition-colors duration-300 shrink-0"
      style={{
        background: isDark ? "var(--panel-2)" : "#dcebfa",
        borderColor: "var(--border)",
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow transition-transform duration-300 ease-out"
        style={{
          transform: isDark ? "translateX(0)" : "translateX(28px)",
          background: isDark ? "#0f1620" : "#ffd166",
        }}
      >
        {isDark ? "🌙" : "☀"}
      </span>
    </button>
  );
}

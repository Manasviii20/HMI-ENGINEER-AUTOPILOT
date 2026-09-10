import { useEffect, useState } from "react";
import { dismissToast, subscribeToasts, type Toast } from "../services/toast";

const KIND_STYLE: Record<Toast["kind"], string> = {
  error: "bg-red-500/15 border-red-500/50 text-red-300",
  success: "bg-emerald-500/15 border-emerald-500/50 text-emerald-300",
  info: "bg-[var(--accent)]/15 border-[var(--accent)]/50 text-[var(--accent)]",
};

const KIND_ICON: Record<Toast["kind"], string> = {
  error: "✕",
  success: "✓",
  info: "i",
};

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`anim-toast-in border rounded px-3 py-2 text-sm shadow-lg flex items-start gap-2.5 backdrop-blur-sm ${KIND_STYLE[t.kind]}`}
        >
          <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] shrink-0 mt-0.5">
            {KIND_ICON[t.kind]}
          </span>
          <span className="break-words flex-1">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="opacity-60 hover:opacity-100 shrink-0 transition-opacity"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

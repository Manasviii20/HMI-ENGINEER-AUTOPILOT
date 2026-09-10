import { useEffect, useState } from "react";
import { dismissToast, subscribeToasts, type Toast } from "../services/toast";

const KIND_STYLE: Record<Toast["kind"], string> = {
  error: "bg-red-500/15 border-red-500/50 text-red-300",
  success: "bg-emerald-500/15 border-emerald-500/50 text-emerald-300",
  info: "bg-[var(--accent)]/15 border-[var(--accent)]/50 text-[var(--accent)]",
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
          className={`border rounded px-3 py-2 text-sm shadow-lg flex items-start justify-between gap-3 ${KIND_STYLE[t.kind]}`}
        >
          <span className="break-words">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="opacity-60 hover:opacity-100 shrink-0"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

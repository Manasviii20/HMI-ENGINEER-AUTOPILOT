import { useState } from "react";
import { Panel } from "../components/Panel";
import { api } from "../services/api";

interface Message {
  role: "user" | "mentor";
  text: string;
}

const SUGGESTIONS = [
  "What does a missing binding mean?",
  "How do alarms work?",
  "Why does a screen need navigation?",
  "How does self-correction work?",
  "What happens when I approve a project?",
];

export function Mentor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "mentor",
      text:
        "Ask me anything about this project's engineering -- bindings, alarms, navigation, validation, " +
        "self-correction, scripts, or migration. Every answer is grounded in this project's actual current state.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [mockMode, setMockMode] = useState<boolean | null>(null);

  async function send(q: string) {
    const trimmed = q.trim();
    if (!trimmed || asking) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setQuestion("");
    setAsking(true);
    try {
      const res = await api.askMentor(trimmed);
      setMockMode(res.mock_mode);
      setMessages((m) => [...m, { role: "mentor", text: res.answer }]);
    } catch {
      setMessages((m) => [...m, { role: "mentor", text: "Sorry, I couldn't reach the backend for that." }]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Engineering Mentor"
        right={
          mockMode !== null ? (
            <span className="text-xs text-[var(--text-dim)]">
              {mockMode ? "Grounded FAQ + live project status (no LLM key configured)" : "LLM-backed"}
            </span>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`anim-rise-in max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "self-end bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--text)]"
                  : "self-start bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text)]"
              }`}
              style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start" }}
            >
              {m.text}
            </div>
          ))}
          {asking && (
            <div className="self-start flex gap-1 px-3 py-2">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)] anim-pulse"
                  style={{ animationDelay: `${d * 150}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4 mb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={asking}
              className="text-xs px-2 py-1 rounded-full border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent)]/40 transition-colors-smooth disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(question)}
            placeholder="Ask about bindings, alarms, navigation, validation..."
            className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={() => send(question)}
            disabled={asking || !question.trim()}
            className="px-4 py-2 rounded bg-[var(--accent)] text-[#03121c] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </Panel>
    </div>
  );
}

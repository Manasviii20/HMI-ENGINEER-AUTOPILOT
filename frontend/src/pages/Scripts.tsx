import { useEffect, useState } from "react";
import { Panel } from "../components/Panel";
import { api, type ScriptTargets, type ScriptTargetOption } from "../services/api";

export function Scripts() {
  const [targets, setTargets] = useState<ScriptTargets | null>(null);
  const [selected, setSelected] = useState<ScriptTargetOption | null>(null);
  const [result, setResult] = useState<{ language: string; code: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .scriptTargets()
      .then((t) => {
        setTargets(t);
        setSelected(t.screens[0] ?? t.objects[0] ?? t.alarms[0] ?? null);
      })
      .catch(() => {});
  }, []);

  async function handleGenerate() {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.generateScript(selected.target_type, selected.target_id);
      setResult(res);
    } catch {
      /* toasted globally */
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard?.writeText(result.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const allOptions: ScriptTargetOption[] = targets
    ? [...targets.screens, ...targets.alarms, ...targets.objects]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Script Generator">
        <div className="text-sm bg-amber-500/10 border border-amber-500/30 rounded p-3 text-amber-400 mb-4">
          Generates readable pseudocode in the{" "}
          <span className="font-semibold">IEC 61131-3 Structured-Text style</span> -- a real, public,
          vendor-neutral automation standard -- grounded only in tags/objects/alarms that actually exist in
          this project. It is <span className="font-semibold">not verified against Schneider EOTE's
          proprietary scripting runtime</span>, since that spec/SDK wasn't available to this project.
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-dim)]">Target (screen / alarm / object)</label>
            <select
              className="bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-sm min-w-[280px]"
              value={selected ? `${selected.target_type}:${selected.target_id}` : ""}
              onChange={(e) => {
                const [type, id] = e.target.value.split(":");
                setSelected(allOptions.find((o) => o.target_type === type && o.target_id === id) ?? null);
              }}
            >
              {targets?.screens.length ? (
                <optgroup label="Screens">
                  {targets.screens.map((o) => (
                    <option key={o.target_id} value={`${o.target_type}:${o.target_id}`}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {targets?.alarms.length ? (
                <optgroup label="Alarms">
                  {targets.alarms.map((o) => (
                    <option key={o.target_id} value={`${o.target_type}:${o.target_id}`}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {targets?.objects.length ? (
                <optgroup label="Objects">
                  {targets.objects.map((o) => (
                    <option key={o.target_id} value={`${o.target_type}:${o.target_id}`}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={!selected || loading}
            className="px-4 py-2 rounded bg-[var(--accent)] text-[#03121c] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Script"}
          </button>
        </div>
      </Panel>

      {result && (
        <Panel
          title="Generated Script"
          className="anim-rise-in"
          right={
            <button
              onClick={handleCopy}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors-smooth"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          }
        >
          <div className="text-xs text-[var(--text-dim)] mb-2">{result.language}</div>
          <pre className="mono text-xs bg-[var(--panel-2)] border border-[var(--border)] rounded p-4 overflow-auto whitespace-pre-wrap">
            {result.code}
          </pre>
        </Panel>
      )}
    </div>
  );
}

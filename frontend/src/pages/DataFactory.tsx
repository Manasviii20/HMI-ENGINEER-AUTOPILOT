import { useState } from "react";
import { Panel } from "../components/Panel";
import { StatusPill } from "../components/StatusPill";
import { api, type FactoryResult } from "../services/api";
import { useCountUp } from "../hooks/useCountUp";

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const animated = useCountUp(value);
  return (
    <div className="card p-4 flex flex-col gap-1 anim-rise-in">
      <span className="text-xs uppercase tracking-wider text-[var(--text-dim)]">{label}</span>
      <span className="text-2xl font-semibold mono" style={{ color }}>
        {animated}
      </span>
    </div>
  );
}

const MACHINE_LABELS: Record<string, string> = {
  conveyor_line: "Conveyor Line",
  packaging_machine: "Packaging Machine",
  pump_station: "Pump Station",
  tank_system: "Tank System",
  filling_machine: "Filling Machine",
};

export function DataFactory() {
  const [count, setCount] = useState(100);
  const [seed, setSeed] = useState(42);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<FactoryResult | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function handleRun() {
    setRunning(true);
    setResult(null);
    try {
      const res = await api.runFactory(count, seed, 2);
      setResult(res);
    } catch {
      /* toasted globally */
    } finally {
      setRunning(false);
    }
  }

  const defectiveList = result?.variants.filter((v) => v.defects_injected.length > 0) ?? [];
  const shown = showAll ? defectiveList : defectiveList.slice(0, 12);

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Synthetic Engineering Data Factory">
        <p className="text-xs text-[var(--text-dim)] mb-4">
          Generates many structurally-real HMI engineering project variants across 5 machine templates
          (conveyor, packaging, pump station, tank, filling), injects seeded structural defects, and runs
          them through the <span className="font-semibold">same</span> real structural validator and
          self-correction engine used everywhere else in this app. Every number below is directly counted
          from those real runs -- not a trained model, and not fabricated. Behavioral/simulation validation
          is intentionally not run here since it's hardcoded to the bundled demo machine's tag names (see
          README limitations); this evaluates structural integrity and self-correction convergence.
        </p>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-dim)]">Variant count</label>
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
              className="bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-sm w-28"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-dim)]">Seed (for reproducibility)</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || 0)}
              className="bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-sm w-28"
            />
          </div>
          <button
            onClick={handleRun}
            disabled={running}
            className="relative overflow-hidden px-4 py-2 rounded bg-[var(--accent)] text-[#03121c] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            {running ? "Generating + Validating..." : `Generate ${count} Variants`}
            {running && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/50 anim-progress-bar w-1/3" />}
          </button>
        </div>
      </Panel>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Generated" value={result.generated} color="#2fb3ff" />
            <Stat label="Defects Injected" value={result.total_defects_injected} color="#ff7043" />
            <Stat label="Auto-Corrected" value={result.auto_corrected} color="#35c76a" />
            <Stat label="Needs Review" value={result.needs_review} color="#f5a623" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Defect Types Detected">
              <div className="flex flex-col gap-2">
                {Object.entries(result.defect_type_counts).map(([type, n]) => {
                  const max = Math.max(1, ...Object.values(result.defect_type_counts));
                  return (
                    <div key={type} className="flex items-center gap-2 text-xs">
                      <span className="w-40 mono text-[var(--text-dim)] truncate">{type}</span>
                      <div className="flex-1 h-3 bg-[var(--panel-2)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(n / max) * 100}%`, background: "#ff7043" }}
                        />
                      </div>
                      <span className="w-6 text-right mono">{n}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Machine Type Mix">
              <div className="flex flex-col gap-2">
                {Object.entries(result.machine_type_counts).map(([type, n]) => {
                  const max = Math.max(1, ...Object.values(result.machine_type_counts));
                  return (
                    <div key={type} className="flex items-center gap-2 text-xs">
                      <span className="w-40 text-[var(--text-dim)] truncate">{MACHINE_LABELS[type] ?? type}</span>
                      <div className="flex-1 h-3 bg-[var(--panel-2)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(n / max) * 100}%`, background: "#2fb3ff" }}
                        />
                      </div>
                      <span className="w-6 text-right mono">{n}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>

          <Panel
            title="Defective Variants"
            right={
              <span className="text-xs text-[var(--text-dim)]">
                {result.defective_variants} of {result.generated} generated with defects
              </span>
            }
          >
            <div className="flex flex-col gap-2">
              {shown.map((v, i) => (
                <div
                  key={v.id}
                  className="flex flex-col gap-1 text-xs bg-[var(--panel-2)] rounded px-3 py-2 border border-[var(--border)] anim-rise-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{v.project_name}</span>
                    <StatusPill status={v.final_status} />
                  </div>
                  <div className="text-[var(--text-dim)] mono">
                    {v.defects_injected.map((d) => d.type).join(", ")} -- {v.issues_before} issue(s) →{" "}
                    {v.issues_after} remaining
                  </div>
                </div>
              ))}
            </div>
            {defectiveList.length > 12 && (
              <button
                onClick={() => setShowAll((s) => !s)}
                className="mt-3 text-xs text-[var(--accent)] hover:underline"
              >
                {showAll ? "Show fewer" : `Show all ${defectiveList.length}`}
              </button>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

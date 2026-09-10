import { useEffect, useState } from "react";
import { Panel } from "../components/Panel";
import { api, type LogAnalysis } from "../services/api";

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString();
}

export function Logs() {
  const [analysis, setAnalysis] = useState<LogAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function load() {
    try {
      const res = await api.analyzeLogs();
      setAnalysis(res);
    } catch {
      /* toasted globally */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const maxCount = analysis ? Math.max(1, ...Object.values(analysis.field_counts)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="System Log Analyzer"
        right={
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-dim)] cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            auto-refresh
          </label>
        }
      >
        <div className="text-xs text-[var(--text-dim)] mb-3">
          Analyzes the <span className="font-semibold">real event log</span> recorded live by this app's own
          running simulator (state transitions + scenario changes) -- not a fabricated log file. It cannot
          analyze a real PLC/machine fault log or Modbus register data, since no real machine or protocol
          sample was available to this project.
        </div>

        {loading && !analysis && <div className="text-sm text-[var(--text-dim)]">Loading...</div>}

        {analysis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="card p-3">
              <div className="text-xs text-[var(--text-dim)]">Total events</div>
              <div className="text-xl font-semibold mono">{analysis.total_events}</div>
            </div>
            <div className="card p-3">
              <div className="text-xs text-[var(--text-dim)]">Scenario changes</div>
              <div className="text-xl font-semibold mono">{analysis.scenario_change_count}</div>
            </div>
            <div className="card p-3">
              <div className="text-xs text-[var(--text-dim)]">Fault events</div>
              <div className={`text-xl font-semibold mono ${analysis.fault_event_count > 0 ? "text-red-400" : ""}`}>
                {analysis.fault_event_count}
              </div>
            </div>
            <div className="card p-3">
              <div className="text-xs text-[var(--text-dim)]">Tracked fields</div>
              <div className="text-xl font-semibold mono">{Object.keys(analysis.field_counts).length}</div>
            </div>
          </div>
        )}
      </Panel>

      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Event Frequency by Field">
            {Object.keys(analysis.field_counts).length === 0 ? (
              <div className="text-sm text-[var(--text-dim)]">
                No events yet -- open the Virtual HMI page and try a scenario.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.entries(analysis.field_counts).map(([field, count]) => (
                  <div key={field} className="flex items-center gap-2 text-xs">
                    <span className="w-32 mono text-[var(--text-dim)] truncate">{field}</span>
                    <div className="flex-1 h-3 bg-[var(--panel-2)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxCount) * 100}%`, background: "var(--accent)" }}
                      />
                    </div>
                    <span className="w-6 text-right mono">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Recent Fault Events">
            {analysis.fault_events.length === 0 ? (
              <div className="text-sm text-emerald-400">No faults recorded</div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-64 overflow-auto">
                {[...analysis.fault_events].reverse().map((e, i) => (
                  <div
                    key={i}
                    className="text-xs mono flex justify-between bg-red-500/10 border border-red-500/30 rounded px-2 py-1.5"
                  >
                    <span>
                      {e.field} → {String(e.to)}
                    </span>
                    <span className="text-[var(--text-dim)]">{formatTime(e.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {analysis && (
        <Panel title="Recent Event Log">
          <div className="flex flex-col gap-1 max-h-72 overflow-auto text-xs mono">
            {[...analysis.recent_events].reverse().map((e, i) => (
              <div
                key={i}
                className="flex justify-between px-2 py-1 rounded border-b border-[var(--border)] last:border-b-0"
              >
                <span className="text-[var(--text-dim)]">{formatTime(e.timestamp)}</span>
                <span>{e.field}</span>
                <span>
                  {String(e.from)} → {String(e.to)}
                </span>
                <span className="text-[var(--text-dim)]">{e.scenario}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

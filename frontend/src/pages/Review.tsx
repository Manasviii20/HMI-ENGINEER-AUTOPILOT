import { useState } from "react";
import { Panel } from "../components/Panel";
import { StatusPill } from "../components/StatusPill";
import { api } from "../services/api";
import { useProject } from "../services/ProjectContext";

export function Review() {
  const { summary, validation, approved, setApproved } = useProject();
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<{ files: string[]; zip: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleApprove() {
    setApproving(true);
    setApproveError(null);
    try {
      await api.approve();
      setApproved(true);
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : String(e));
    } finally {
      setApproving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.exportProject();
      setExportResult({ files: res.files, zip: res.zip });
    } catch {
      /* toasted globally by api.ts */
    } finally {
      setExporting(false);
    }
  }

  if (!summary || !validation) return <div className="text-[var(--text-dim)]">Loading...</div>;

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Final Project Summary" right={<StatusPill status={approved ? "APPROVED" : validation.status} />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-[var(--text-dim)] text-xs">Project</div>
            <div className="font-medium">{summary.project_name}</div>
          </div>
          <div>
            <div className="text-[var(--text-dim)] text-xs">Screens</div>
            <div className="font-medium mono">{summary.screen_count}</div>
          </div>
          <div>
            <div className="text-[var(--text-dim)] text-xs">Tags</div>
            <div className="font-medium mono">{summary.tag_count}</div>
          </div>
          <div>
            <div className="text-[var(--text-dim)] text-xs">Alarms</div>
            <div className="font-medium mono">{summary.alarm_count}</div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Validation Report">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Status</span>
              <StatusPill status={validation.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Structural issues</span>
              <span>{validation.summary.structural_issue_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Scenario tests</span>
              <span>
                {validation.summary.scenarios_passed}/{validation.summary.scenarios_total} passed
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Engineer Approval">
          <p className="text-sm text-[var(--text-dim)] mb-3">
            Approval requires validation status PASS. This finalizes the generated engineering
            project for export.
          </p>
          {approveError && (
            <div className="text-sm text-red-400 mb-2">{approveError}</div>
          )}
          <button
            onClick={handleApprove}
            disabled={approving || validation.status !== "PASS" || approved}
            className="px-4 py-2 rounded bg-emerald-500/90 text-[#03120b] font-semibold text-sm hover:opacity-90 disabled:opacity-40"
          >
            {approved ? "Approved" : approving ? "Approving..." : "Approve Project"}
          </button>
        </Panel>
      </div>

      <Panel title="Export">
        <p className="text-sm text-[var(--text-dim)] mb-3">
          Exports a <span className="font-semibold">Generated HMI Engineering Project Package</span> —
          a vendor-neutral structured representation, not a native Schneider EOTE project file. A
          native EOTE adapter is a planned future capability (see README).
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 rounded bg-[var(--accent)] text-[#03121c] font-semibold text-sm hover:opacity-90 disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Export Project Package"}
        </button>
        {exportResult && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="text-xs text-[var(--text-dim)]">Generated files:</div>
            <div className="flex flex-wrap gap-2">
              {exportResult.files.map((f) => (
                <span key={f} className="text-xs mono px-2 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)]">
                  {f}
                </span>
              ))}
            </div>
            <a
              href={api.downloadUrl()}
              download={exportResult.zip}
              className="mt-2 inline-block w-fit px-4 py-2 rounded border border-[var(--accent)] text-[var(--accent)] text-sm font-semibold hover:bg-[var(--accent)]/10"
            >
              Download {exportResult.zip}
            </a>
          </div>
        )}
      </Panel>
    </div>
  );
}

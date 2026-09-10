import { useState } from "react";
import { Panel } from "../components/Panel";
import { api } from "../services/api";
import { useProject } from "../services/ProjectContext";

export function Migration() {
  const { refreshProject } = useProject();
  const [csv, setCsv] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importFormat, setImportFormat] = useState<"csv" | "json">("csv");
  const [importText, setImportText] = useState(
    "name,data_type,unit,description\nInlet_Pressure,REAL,bar,Inlet line pressure\n"
  );
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    added: string[];
    skipped: { row: number; name?: string; reason: string }[];
  } | null>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const text = await api.exportTagsCsv();
      setCsv(text);
    } catch {
      /* toasted globally */
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await api.importTags(importText, importFormat);
      setImportResult({ added: res.added, skipped: res.skipped });
      await refreshProject();
    } catch {
      /* toasted globally */
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Migration Assistant">
        <div className="text-sm bg-amber-500/10 border border-amber-500/30 rounded p-3 text-amber-400">
          Migrates a <span className="font-semibold">generic CSV/JSON tag list</span> in or out of this
          project's neutral representation. It does <span className="font-semibold">not</span> read or
          write a native Schneider EOTE project file -- that proprietary export/import format spec, SDK,
          or a sample project file to reverse-engineer wasn't available to this project. See the README
          for the full list of what would be needed to close that gap.
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Export Tags" right={<span className="text-xs text-[var(--text-dim)]">current project → CSV</span>}>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 rounded bg-[var(--accent)] text-[#03121c] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export Tag List (CSV)"}
          </button>
          {csv && (
            <div className="mt-3 flex flex-col gap-2 anim-rise-in">
              <textarea
                readOnly
                value={csv}
                className="w-full h-40 bg-[var(--panel-2)] border border-[var(--border)] rounded p-2 text-xs mono resize-none"
              />
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
                download="tags_export.csv"
                className="w-fit px-3 py-1.5 rounded border border-[var(--accent)] text-[var(--accent)] text-xs font-semibold hover:bg-[var(--accent)]/10 active:scale-95 transition-all duration-150"
              >
                ⬇ Download tags_export.csv
              </a>
            </div>
          )}
        </Panel>

        <Panel title="Import Tags" right={<span className="text-xs text-[var(--text-dim)]">CSV/JSON → current project</span>}>
          <div className="flex gap-2 mb-2">
            {(["csv", "json"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setImportFormat(f)}
                className={`px-3 py-1 rounded text-xs font-semibold border transition-colors-smooth ${
                  importFormat === f
                    ? "bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-dim)]"
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="w-full h-32 bg-[var(--panel-2)] border border-[var(--border)] rounded p-2 text-xs mono resize-none focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={handleImport}
            disabled={importing || !importText.trim()}
            className="mt-2 px-4 py-2 rounded bg-emerald-500/90 text-[#03120b] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import Tags"}
          </button>

          {importResult && (
            <div className="mt-3 flex flex-col gap-2 text-xs anim-rise-in">
              {importResult.added.length > 0 && (
                <div className="text-emerald-400">
                  Added: {importResult.added.join(", ")}
                </div>
              )}
              {importResult.skipped.length > 0 && (
                <div className="text-amber-400">
                  Skipped {importResult.skipped.length} row(s):{" "}
                  {importResult.skipped.map((s) => `#${s.row} (${s.reason})`).join(", ")}
                </div>
              )}
              {importResult.added.length === 0 && importResult.skipped.length === 0 && (
                <div className="text-[var(--text-dim)]">No rows found.</div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

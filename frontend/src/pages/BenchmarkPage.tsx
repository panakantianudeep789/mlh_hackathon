import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Play,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  FileText,
  FileSpreadsheet,
  Info,
} from "lucide-react";
import { BenchmarkSummaryResponse } from "../types";
import { api } from "../services/api";

interface BenchmarkPageProps {
  repositoryId: string | null;
}

export const BenchmarkPage: React.FC<BenchmarkPageProps> = ({ repositoryId }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkSummaryResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [allowHostExecution, setAllowHostExecution] = useState(false);

  // Fetch previous run on mount
  useEffect(() => {
    api.getBenchmarkResults()
      .then((data) => {
        if (data && data.results) setBenchmarkData(data);
      })
      .catch((err) => console.error("Error fetching benchmark results:", err));
  }, []);

  const handleRunBenchmark = async () => {
    if (!repositoryId || isRunning) return;
    setIsRunning(true);
    setErrorMsg(null);

    try {
      const summary = await api.runBenchmark(repositoryId, allowHostExecution);
      setBenchmarkData(summary);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute evaluation benchmark.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleExport = (format: "json" | "csv") => {
    if (!benchmarkData) return;
    const url = api.getBenchmarkExportUrl(format);
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold text-slate-100">
              14-Step Reproducible Evaluation Benchmark
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              10 Ground-Truth Cases
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Rigorous evaluation measuring baseline test execution, retrieval, AST localization, diagnosis, regression reproduction, patch application, patch verification, and regression prevention.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {benchmarkData && (
            <>
              <button
                onClick={() => handleExport("json")}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 text-xs transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 text-xs transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>
            </>
          )}

          <button
            onClick={handleRunBenchmark}
            disabled={isRunning || !repositoryId}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isRunning ? "Evaluating 14 Steps..." : "Run Benchmark"}</span>
          </button>
        </div>
      </div>

      {/* Execution Environment Setting */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300 hover:text-white transition">
          <input
            type="checkbox"
            checked={allowHostExecution}
            onChange={(e) => setAllowHostExecution(e.target.checked)}
            className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-[#0a0e17]"
          />
          <span className="font-semibold">
            Allow Restricted Host Execution for Benchmark (if Docker unavailable)
          </span>
        </label>
        <span className="text-[11px] text-slate-400">
          When unchecked and Docker is missing, dynamic test execution steps are blocked to preserve host security.
        </span>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Summary Score Cards */}
      {benchmarkData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
            <span className="text-xs text-slate-400 font-medium">Total Cases</span>
            <div className="text-2xl font-bold text-slate-100 mt-1">
              {benchmarkData.total_cases}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Ground-truth scenarios</div>
          </div>

          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
            <span className="text-xs text-slate-400 font-medium">Fully Verified Passes</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {benchmarkData.passed} / {benchmarkData.total_cases}
            </div>
            <div className="text-[11px] text-emerald-500/80 mt-0.5">
              {Math.round((benchmarkData.passed / benchmarkData.total_cases) * 100)}% Pass Rate
            </div>
          </div>

          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
            <span className="text-xs text-slate-400 font-medium">Failed / Blocked</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              {benchmarkData.failed}
            </div>
            <div className="text-[11px] text-rose-500/80 mt-0.5">Incomplete or failing</div>
          </div>

          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
            <span className="text-xs text-slate-400 font-medium">Evaluation Duration</span>
            <div className="text-2xl font-bold text-blue-400 font-mono mt-1">
              {benchmarkData.duration_ms} ms
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Full multi-step timing</div>
          </div>
        </div>
      )}

      {/* Benchmark Results Table */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Independent 14-Step Benchmark Metrics
          </span>
          <span className="text-[11px] text-slate-500">
            Target: {repositoryId || "none"}
          </span>
        </div>

        {!benchmarkData ? (
          <div className="p-12 text-center text-xs text-slate-400 font-mono">
            Click &quot;Run Benchmark&quot; to execute all 10 benchmark test cases against the active repository.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a0e17] text-slate-400 uppercase text-[10px] font-bold border-b border-[#1e293b]">
                <tr>
                  <th className="px-3 py-3">Case ID</th>
                  <th className="px-3 py-3">Scenario</th>
                  <th className="px-2 py-3 text-center" title="Step 3-4: Repository Search">Retrieval</th>
                  <th className="px-2 py-3 text-center" title="Step 4: AST Symbol Localization">Loc</th>
                  <th className="px-2 py-3 text-center" title="Step 5-6: Bug Diagnosis Correctness">Diagnosis</th>
                  <th className="px-2 py-3 text-center" title="Step 8: Regression Test Fails on Buggy Baseline">Repro</th>
                  <th className="px-2 py-3 text-center" title="Step 10: Patch Applied to Clean Working Copy">Patch App</th>
                  <th className="px-2 py-3 text-center" title="Step 11: Regression Test Passes on Patched Code">Patch Ver</th>
                  <th className="px-2 py-3 text-center" title="Step 12: Existing Tests Continue Passing">Existing Pass</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60 font-sans">
                {benchmarkData.results.map((r) => (
                  <tr key={r.case_id} className="hover:bg-[#0f172a]/60 transition">
                    <td className="px-3 py-3 font-mono font-bold text-blue-400 text-xs">
                      {r.case_id}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-200 max-w-xs">
                      <div className="truncate">{r.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{r.relevant_file}</div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      {r.retrieval_success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {r.location_success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {r.diagnosis_correctness ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {r.regression_reproduced ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                          REPRODUCED
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 font-mono">
                          NO
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {r.patch_applied ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <span className="text-[9px] text-slate-500 font-mono">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {r.patch_verified ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                          VERIFIED
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 font-mono">
                          NO
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {r.existing_tests_passing ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <span className="text-[9px] text-slate-500 font-mono">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          r.status === "passed"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : r.status === "environment_unavailable"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : r.status === "failed"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                        }`}
                      >
                        {r.status === "environment_unavailable" ? "ENV BLOCKED" : r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-400 text-[11px]">
                      {r.duration_ms} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Methodology & Limitations Notice */}
      <div className="bg-[#0a0e17] border border-[#1e293b] rounded-xl p-4 text-xs text-slate-400 space-y-1.5 leading-relaxed">
        <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Evaluation Integrity Policy:</span>
        </div>
        <p>
          Benchmark metrics record independent results for each stage of the 14-step evaluation pipeline. Retrieval success is never equated with diagnosis success, nor is test execution equated with bug reproduction. A patch is recorded as verified only after being applied to a clean working copy and passing the regression test.
        </p>
      </div>
    </div>
  );
};

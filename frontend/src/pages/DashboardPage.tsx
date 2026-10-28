import React from "react";
import {
  FolderGit2,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  PlayCircle,
  SearchCode,
  Sparkles,
  ArrowRight,
  Clock,
  Terminal,
  FileCode,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  RepositorySummary,
  ModelStatusResponse,
  PageId,
} from "../types";

interface DashboardPageProps {
  repositories: RepositorySummary[];
  selectedRepoId: string | null;
  modelStatus: ModelStatusResponse | null;
  dockerAvailable: boolean;
  onNavigate: (page: PageId) => void;
  onLoadDemo: () => void;
  isLoadingDemo: boolean;
  recentBugs: any[];
  recentTests: any[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  repositories,
  selectedRepoId,
  modelStatus,
  dockerAvailable,
  onNavigate,
  onLoadDemo,
  isLoadingDemo,
  recentBugs,
  recentTests,
}) => {
  const activeRepo = repositories.find((r) => r.id === selectedRepoId);
  const isModelOnline = modelStatus?.running && !modelStatus?.error;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0c1427] via-[#0f172a] to-[#0a0e17] border border-[#1e293b] p-6 lg:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open-Source AI Verification Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Understand Any Codebase. Fix Bugs With Evidence. Verify Every Change.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            RepoPilot AI combines Python AST symbol extraction, bounded open-weight LLM reasoning,
            and isolated regression test execution. Ground suggestions in real source code and test outcomes.
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("bugs")}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-lg shadow-blue-600/20 transition cursor-pointer"
            >
              <SearchCode className="w-4 h-4" />
              <span>Launch Bug Detective</span>
            </button>
            <button
              onClick={onLoadDemo}
              disabled={isLoadingDemo}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-200 font-medium text-xs border border-[#334155] transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>{isLoadingDemo ? "Loading Demo..." : "Try Demo Repository"}</span>
            </button>
            <button
              onClick={() => onNavigate("repositories")}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              <span>Manage Repositories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Subtle Decorative Grid Pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />
      </div>

      {/* Real System State Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Repository Card */}
        <div
          onClick={() => onNavigate("repositories")}
          className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 hover:border-blue-500/30 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Loaded Repository</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-slate-100 truncate">
              {activeRepo ? activeRepo.name : "None Loaded"}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {activeRepo ? `${activeRepo.file_count} indexed files` : "Load demo or upload ZIP"}
            </p>
          </div>
        </div>

        {/* Model Runtime Card */}
        <div
          onClick={() => onNavigate("settings")}
          className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 hover:border-blue-500/30 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Ollama Inference</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isModelOnline
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-rose-500/10 text-rose-400"
              }`}
            >
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-slate-100 font-mono truncate">
              {modelStatus?.model || "qwen2.5-coder:7b"}
            </div>
            <p className="text-xs mt-1 flex items-center space-x-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isModelOnline ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span className={isModelOnline ? "text-emerald-400" : "text-rose-400"}>
                {isModelOnline ? "Connected & Ready" : "Offline (Click Setup)"}
              </span>
            </p>
          </div>
        </div>

        {/* Sandbox Execution Isolation Card */}
        <div
          onClick={() => onNavigate("tests")}
          className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 hover:border-blue-500/30 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Test Isolation</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                dockerAvailable
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}
            >
              {dockerAvailable ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-slate-100">
              {dockerAvailable ? "Docker Sandbox" : "Restricted Host"}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {dockerAvailable ? "Container network isolation" : "Process timeout limits"}
            </p>
          </div>
        </div>

        {/* Benchmark Evaluation Card */}
        <div
          onClick={() => onNavigate("benchmark")}
          className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 hover:border-blue-500/30 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Benchmark Cases</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-slate-100">10 Scenarios</div>
            <p className="text-xs text-slate-400 mt-1">Reproducible Python bugs</p>
          </div>
        </div>
      </div>

      {/* Core AI Workflow Timeline */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Autonomous Verification Pipeline
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          {[
            { step: "1", title: "Ingest", desc: "Safe ZIP / Pathlib", page: "repositories" as PageId },
            { step: "2", title: "Index", desc: "Python AST Symbols", page: "explorer" as PageId },
            { step: "3", title: "Search", desc: "Keyword / Line No", page: "explorer" as PageId },
            { step: "4", title: "Diagnose", desc: "Evidence Citations", page: "bugs" as PageId },
            { step: "5", title: "Patch", desc: "Unified Diff Review", page: "patches" as PageId },
            { step: "6", title: "Test", desc: "Isolated Sandbox", page: "tests" as PageId },
            { step: "7", title: "Report", desc: "Actual Verification", page: "benchmark" as PageId },
          ].map((item, idx) => (
            <button
              key={item.step}
              onClick={() => onNavigate(item.page)}
              className="bg-[#0a0e17] border border-[#1e293b] p-3 rounded-lg hover:border-blue-500/40 hover:bg-[#0e1626] transition text-left sm:text-center group cursor-pointer"
            >
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                Step {item.step}
              </div>
              <div className="font-semibold text-slate-200 mt-1">{item.title}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Investigations & Test Executions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bug Investigations */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <div className="flex items-center space-x-2">
                <SearchCode className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">
                  Recent Bug Investigations
                </h2>
              </div>
              <button
                onClick={() => onNavigate("bugs")}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Open Detective →
              </button>
            </div>

            <div className="divide-y divide-[#1e293b]/50 mt-2">
              {recentBugs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No previous bug investigations recorded. Click &quot;Launch Bug Detective&quot; to inspect code.
                </div>
              ) : (
                recentBugs.slice(0, 4).map((b) => (
                  <div key={b.id} className="py-2.5 flex items-start justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-200">{b.bug_title}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {b.id} • {b.created_at.split("T")[0]}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                      Investigated
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Test Executions */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-slate-200">
                  Recent Test Executions
                </h2>
              </div>
              <button
                onClick={() => onNavigate("tests")}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Open Test Lab →
              </button>
            </div>

            <div className="divide-y divide-[#1e293b]/50 mt-2">
              {recentTests.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No tests run yet. The Test Lab verifies every suggested patch before code changes.
                </div>
              ) : (
                recentTests.slice(0, 4).map((t) => (
                  <div key={t.id} className="py-2.5 flex items-start justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-200 font-mono">
                        {t.id} ({t.test_type})
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Duration: {t.duration_ms} ms • Exit Code: {t.exit_code}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        t.status === "passed"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

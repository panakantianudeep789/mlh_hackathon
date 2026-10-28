import React, { useState } from "react";
import {
  Menu,
  FolderGit2,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { RepositorySummary, ModelStatusResponse } from "../types";

interface HeaderProps {
  onOpenMobileNav: () => void;
  repositories: RepositorySummary[];
  selectedRepoId: string | null;
  onSelectRepo: (repoId: string) => void;
  modelStatus: ModelStatusResponse | null;
  dockerAvailable: boolean;
  onLoadDemo: () => void;
  isLoadingDemo: boolean;
  onRefreshStatus: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileNav,
  repositories,
  selectedRepoId,
  onSelectRepo,
  modelStatus,
  dockerAvailable,
  onLoadDemo,
  isLoadingDemo,
  onRefreshStatus,
}) => {
  const [showModelModal, setShowModelModal] = useState(false);

  const activeRepo = repositories.find((r) => r.id === selectedRepoId);
  const isModelReady = modelStatus?.running && !modelStatus?.error;

  return (
    <>
      <header className="h-16 bg-[#0a0e17] border-b border-[#1e293b] px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Left Section: Mobile toggle and Repository picker */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenMobileNav}
            className="lg:hidden text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-[#111827]"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Repository Selector */}
          <div className="relative flex items-center">
            <div className="flex items-center space-x-2 bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-slate-300">
              <FolderGit2 className="w-4 h-4 text-blue-400 shrink-0" />
              <select
                value={selectedRepoId || ""}
                onChange={(e) => onSelectRepo(e.target.value)}
                className="bg-transparent text-slate-200 font-medium focus:outline-hidden cursor-pointer pr-2 truncate max-w-[160px] sm:max-w-[220px]"
              >
                {repositories.length === 0 ? (
                  <option value="" disabled>
                    No repository loaded
                  </option>
                ) : (
                  repositories.map((repo) => (
                    <option key={repo.id} value={repo.id} className="bg-[#111827]">
                      {repo.name} ({repo.file_count} files)
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Right Section: Status Pills and Actions */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* Quick Load Demo Button */}
          {(!activeRepo || repositories.length === 0) && (
            <button
              onClick={onLoadDemo}
              disabled={isLoadingDemo}
              className="hidden sm:flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-xs shadow-blue-500/20 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoadingDemo ? "Loading Demo..." : "Load Demo Project"}</span>
            </button>
          )}

          {/* Docker Sandbox Status Pill */}
          <div
            className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              dockerAvailable
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-300 border-amber-500/20"
            }`}
            title={
              dockerAvailable
                ? "Docker container isolation is active"
                : "Docker is unavailable. Running under restricted host execution."
            }
          >
            {dockerAvailable ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{dockerAvailable ? "Docker Sandbox" : "Restricted Host"}</span>
          </div>

          {/* Ollama Model Status Pill */}
          <button
            onClick={() => setShowModelModal(true)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
              isModelReady
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                : "bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ollama:</span>
            <span>{isModelReady ? "Online" : "Offline / Setup"}</span>
          </button>
        </div>
      </header>

      {/* Model Setup / Diagnostics Modal */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl max-w-lg w-full p-5 shadow-2xl text-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-base text-slate-100">
                  Ollama Model Runtime Status
                </h3>
              </div>
              <button
                onClick={() => setShowModelModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="flex items-center justify-between bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
                <span className="text-slate-400">Endpoint:</span>
                <span className="font-mono text-slate-200">{modelStatus?.base_url || "http://localhost:11434"}</span>
              </div>

              <div className="flex items-center justify-between bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
                <span className="text-slate-400">Configured Model:</span>
                <span className="font-mono text-blue-400 font-semibold">
                  {modelStatus?.model || "qwen2.5-coder:7b"}
                </span>
              </div>

              <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-[#0c121e] border border-[#1e293b]">
                {isModelReady ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-medium text-slate-200">
                    {isModelReady ? "Model is Loaded & Active" : "Action Required for Live AI"}
                  </div>
                  <p className="text-slate-400 mt-1 leading-relaxed">
                    {modelStatus?.setup_instructions ||
                      "Ollama is responding. Ready to perform real-time evidence-grounded inference."}
                  </p>
                </div>
              </div>

              {modelStatus?.available_models && modelStatus.available_models.length > 0 && (
                <div>
                  <span className="text-slate-400 font-medium block mb-1">
                    Locally Available Models on Host:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {modelStatus.available_models.map((m) => (
                      <span
                        key={m}
                        className="font-mono px-2 py-0.5 rounded bg-[#1e293b] text-slate-300 text-[11px]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#1e293b]/50 p-3 rounded-lg border border-[#334155] text-slate-300 text-[11px] leading-relaxed">
                <span className="font-semibold text-slate-100 block mb-1">Terminal Setup Command:</span>
                <code className="font-mono bg-black/40 px-2 py-1 rounded block text-emerald-300">
                  ollama run {modelStatus?.model || "qwen2.5-coder:7b"}
                </code>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1e293b] flex items-center justify-between">
              <button
                onClick={() => {
                  onRefreshStatus();
                }}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-[#1e293b] hover:bg-[#1e293b]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-check Server</span>
              </button>
              <button
                onClick={() => setShowModelModal(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-1.5 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

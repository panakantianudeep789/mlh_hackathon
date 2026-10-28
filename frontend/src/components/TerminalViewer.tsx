import React, { useState } from "react";
import { Terminal, Copy, Check, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import { TestRunResponse } from "../types";

interface TerminalViewerProps {
  runResult: TestRunResponse | null;
  isRunning?: boolean;
}

export const TerminalViewer: React.FC<TerminalViewerProps> = ({ runResult, isRunning }) => {
  const [activeTab, setActiveTab] = useState<"stdout" | "stderr" | "all">("all");
  const [copied, setCopied] = useState(false);

  const getFullOutput = () => {
    if (!runResult) return "";
    let out = "";
    if (runResult.stdout) out += `=== STDOUT ===\n${runResult.stdout}\n`;
    if (runResult.stderr) out += `=== STDERR ===\n${runResult.stderr}\n`;
    return out;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFullOutput());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#090d16] rounded-xl border border-[#1e293b] overflow-hidden flex flex-col font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#0f172a] border-b border-[#1e293b] gap-2">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200 text-xs">Test Execution Console</span>
          {runResult && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                runResult.status === "passed"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : runResult.status === "timed_out"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}
            >
              {runResult.status} (Exit {runResult.exit_code})
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          {runResult && (
            <div className="flex items-center space-x-1 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{runResult.duration_ms} ms</span>
            </div>
          )}

          {runResult && (
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-2 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-slate-300 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Log"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Warning Banner if Restricted Host */}
      {runResult?.warning && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center space-x-2 text-[11px] text-amber-300">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{runResult.warning}</span>
        </div>
      )}

      {/* Output Console Window */}
      <div className="p-4 overflow-y-auto max-h-[420px] min-h-[160px] text-slate-300 leading-relaxed space-y-3">
        {isRunning ? (
          <div className="flex items-center space-x-2 text-blue-400 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
            <span>Executing pytest in sandbox subprocess...</span>
          </div>
        ) : !runResult ? (
          <div className="text-slate-400 text-center py-8">
            Click &quot;Run Verification Test&quot; to execute pytest in the isolated sandbox.
          </div>
        ) : (
          <>
            {runResult.stdout && (
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">
                  Stdout:
                </div>
                <pre className="text-emerald-400/90 whitespace-pre-wrap break-all bg-black/40 p-3 rounded-lg border border-[#1e293b]">
                  {runResult.stdout}
                </pre>
              </div>
            )}
            {runResult.stderr && (
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">
                  Stderr:
                </div>
                <pre className="text-rose-400/90 whitespace-pre-wrap break-all bg-black/40 p-3 rounded-lg border border-[#1e293b]">
                  {runResult.stderr}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

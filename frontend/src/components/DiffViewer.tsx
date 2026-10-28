import React, { useState } from "react";
import { Copy, Check, Download } from "lucide-react";

interface DiffViewerProps {
  unifiedDiff: string;
  filePath: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ unifiedDiff, filePath }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(unifiedDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([unifiedDiff], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filePath.replace(/\//g, "_")}.patch`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!unifiedDiff || !unifiedDiff.trim()) {
    return (
      <div className="p-8 text-center bg-[#0a0e17] rounded-lg border border-[#1e293b] text-slate-400 text-xs font-mono">
        No unified diff changes available.
      </div>
    );
  }

  const lines = unifiedDiff.split("\n");

  return (
    <div className="bg-[#0a0e17] rounded-xl border border-[#1e293b] overflow-hidden text-xs font-mono">
      {/* Diff Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f172a] border-b border-[#1e293b]">
        <div className="flex items-center space-x-2 text-slate-300">
          <span className="text-slate-400">File:</span>
          <span className="font-semibold text-blue-400">{filePath}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-slate-300 transition text-[11px]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy Diff"}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-slate-300 transition text-[11px]"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Download .patch</span>
          </button>
        </div>
      </div>

      {/* Diff Line-by-Line Viewer */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto divide-y divide-[#1e293b]/30">
        {lines.map((line, idx) => {
          let lineStyle = "text-slate-300 bg-transparent";
          let symbol = " ";

          if (line.startsWith("+++") || line.startsWith("---")) {
            lineStyle = "bg-[#111827] text-slate-400 font-bold";
          } else if (line.startsWith("@@")) {
            lineStyle = "bg-blue-950/30 text-indigo-300 font-semibold";
          } else if (line.startsWith("+")) {
            lineStyle = "bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500";
            symbol = "+";
          } else if (line.startsWith("-")) {
            lineStyle = "bg-rose-950/40 text-rose-300 border-l-2 border-rose-500";
            symbol = "-";
          }

          return (
            <div key={idx} className={`flex items-start px-3 py-0.5 hover:bg-slate-800/30 ${lineStyle}`}>
              <span className="w-10 shrink-0 text-slate-400 select-none text-right pr-3 text-[11px]">
                {idx + 1}
              </span>
              <pre className="flex-1 whitespace-pre-wrap break-all font-mono text-[12px] leading-relaxed">
                {line}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
};

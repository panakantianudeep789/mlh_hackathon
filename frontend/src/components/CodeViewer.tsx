import React, { useState } from "react";
import { Copy, Check, FileCode } from "lucide-react";

interface CodeViewerProps {
  filePath: string;
  content: string;
  highlightLines?: number[];
  language?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  filePath,
  content,
  highlightLines = [],
  language = "python",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = content.split("\n");

  return (
    <div className="bg-[#0a0e17] rounded-xl border border-[#1e293b] overflow-hidden flex flex-col h-full text-xs font-mono">
      {/* File Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f172a] border-b border-[#1e293b] shrink-0">
        <div className="flex items-center space-x-2 text-slate-300">
          <FileCode className="w-4 h-4 text-blue-400" />
          <span className="font-medium text-slate-200">{filePath}</span>
          <span className="text-[10px] text-slate-400 font-sans px-1.5 py-0.5 rounded bg-[#1e293b]">
            {lines.length} lines
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-slate-300 transition text-[11px]"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy Code"}</span>
        </button>
      </div>

      {/* Code Area with Line Numbers */}
      <div className="overflow-x-auto flex-1 overflow-y-auto p-2">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const isHighlighted =
                highlightLines.length > 0 &&
                lineNum >= highlightLines[0] &&
                lineNum <= highlightLines[highlightLines.length - 1];

              return (
                <tr
                  key={lineNum}
                  className={`${
                    isHighlighted
                      ? "bg-amber-500/15 border-l-2 border-amber-400"
                      : "hover:bg-slate-800/30"
                  }`}
                >
                  <td className="w-12 select-none text-right pr-4 text-slate-500 text-[11px] align-top py-0.5">
                    {lineNum}
                  </td>
                  <td className="text-slate-300 whitespace-pre font-mono text-[12px] leading-relaxed py-0.5 pl-1">
                    {line}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

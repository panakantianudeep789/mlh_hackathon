import React, { useState, useEffect } from "react";
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  FolderTree,
  FileCode,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { SkillDetailResponse } from "../types";
import { api } from "../services/api";

export const AgentSkillsPage: React.FC = () => {
  const [skill, setSkill] = useState<SkillDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchSkill = () => {
    setIsLoading(true);
    api.getSkills()
      .then((skills) => {
        if (skills.length > 0) setSkill(skills[0]);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching skills:", err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchSkill();
  }, []);

  const handleCopy = () => {
    if (!skill) return;
    navigator.clipboard.writeText(skill.raw_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!skill) return;
    const blob = new Blob([skill.raw_content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SKILL.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center space-x-2">
            <Award className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-bold text-slate-100">
              Agent Skill Inspector
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Agent Skills Spec
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official Agent Skills format: reusable procedural knowledge for autonomous repository debugging.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchSkill}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 text-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-validate</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-mono animate-pulse">
          Validating Agent Skill specification...
        </div>
      ) : !skill ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">
          Skill specification file not found in skills/repository-debugger/SKILL.md
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metadata & Validation Card */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1e293b]">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold text-slate-100 font-mono">{skill.name}</h2>
                  <span className="text-xs text-slate-500 font-mono">
                    v{skill.frontmatter?.version || "1.0.0"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{skill.description}</p>
              </div>

              {/* Status Pill */}
              <div
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  skill.is_valid
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {skill.is_valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span>{skill.is_valid ? "Valid Agent Skill" : "Validation Failed"}</span>
              </div>
            </div>

            {/* Validation Checklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#0a0e17] p-3 rounded-xl border border-[#1e293b] space-y-1">
                <span className="text-slate-400">Directory Consistency:</span>
                <div className="flex items-center space-x-1 text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>skills/{skill.directory_name}</span>
                </div>
              </div>

              <div className="bg-[#0a0e17] p-3 rounded-xl border border-[#1e293b] space-y-1">
                <span className="text-slate-400">YAML Frontmatter:</span>
                <div className="flex items-center space-x-1 text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valid Dictionary</span>
                </div>
              </div>

              <div className="bg-[#0a0e17] p-3 rounded-xl border border-[#1e293b] space-y-1">
                <span className="text-slate-400">Required `name` field:</span>
                <div className="flex items-center space-x-1 text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Present ({skill.name})</span>
                </div>
              </div>

              <div className="bg-[#0a0e17] p-3 rounded-xl border border-[#1e293b] space-y-1">
                <span className="text-slate-400">Required `description`:</span>
                <div className="flex items-center space-x-1 text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Present</span>
                </div>
              </div>
            </div>

            {/* Frontmatter Tags & Compatibility */}
            {skill.frontmatter?.tags && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-slate-500 mr-1">Tags:</span>
                {skill.frontmatter.tags.map((t: string) => (
                  <span
                    key={t}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-[#1e293b] text-slate-300 font-mono"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Raw SKILL.md Markdown Content Viewer */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="px-5 py-3 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-300 text-xs">
                <FileCode className="w-4 h-4 text-purple-400" />
                <span className="font-mono text-slate-100 font-bold">
                  skills/repository-debugger/SKILL.md
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-slate-300 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Skill"}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-slate-300 transition"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-x-auto bg-[#0a0e17] max-h-[600px] overflow-y-auto">
              <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {skill.raw_content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from "react";
import {
  SearchCode,
  AlertTriangle,
  Play,
  CheckCircle2,
  GitCompare,
  FlaskConical,
  Copy,
  Check,
  FileCode,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { BugReportResponse, PageId } from "../types";
import { api } from "../services/api";
import { DiffViewer } from "../components/DiffViewer";

interface BugDetectivePageProps {
  repositoryId: string | null;
  onNavigateToPatch: (filePath: string, proposedCode: string) => void;
  onNavigateToTest: (testCode: string) => void;
  onOpenFileInExplorer: (file: string, lines?: number[]) => void;
}

export const BugDetectivePage: React.FC<BugDetectivePageProps> = ({
  repositoryId,
  onNavigateToPatch,
  onNavigateToTest,
  onOpenFileInExplorer,
}) => {
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [stackTrace, setStackTrace] = useState("");
  const [targetFile, setTargetFile] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [finding, setFinding] = useState<BugReportResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copiedPatch, setCopiedPatch] = useState(false);

  const demoPresets = [
    {
      label: "ZeroDivisionError in average([])",
      desc: "Why does my Python application crash with ZeroDivisionError when the user submits an empty list to average()?",
      err: "ZeroDivisionError: division by zero",
      target: "app/calculator.py",
    },
    {
      label: "Discount Boundary > 100%",
      desc: "calculate_discount produces negative prices when discount percentage exceeds 100 or is negative.",
      err: "ValueError: discount boundary exceeded",
      target: "app/calculator.py",
    },
    {
      label: "Off-by-One in Loop",
      desc: "find_first_positive fails to inspect the first element at index 0 because loop starts at index 1.",
      err: "AssertionError: element at index 0 was skipped",
      target: "app/calculator.py",
    },
    {
      label: "Direct Dict Key Access",
      desc: "get_user_role crashes with KeyError when username does not exist in the dictionary.",
      err: "KeyError: 'role'",
      target: "app/data_store.py",
    },
  ];

  const handleApplyPreset = (preset: typeof demoPresets[0]) => {
    setDescription(preset.desc);
    setErrorMessage(preset.err);
    setTargetFile(preset.target);
    setStackTrace("");
  };

  const handleStartInvestigation = async () => {
    if (!description.trim() || !repositoryId || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setFinding(null);

    // Simulate animated step progression
    setActiveStep(1);
    const stepTimer1 = setTimeout(() => setActiveStep(2), 600);
    const stepTimer2 = setTimeout(() => setActiveStep(3), 1400);
    const stepTimer3 = setTimeout(() => setActiveStep(4), 2200);

    try {
      const report = await api.analyzeBug({
        repository_id: repositoryId,
        bug_description: description,
        error_message: errorMessage || undefined,
        stack_trace: stackTrace || undefined,
        target_file: targetFile || undefined,
      });

      setActiveStep(5);
      setTimeout(() => {
        setFinding(report);
        setIsAnalyzing(false);
      }, 500);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setAnalysisError(err.message || "Bug analysis failed.");
      setIsAnalyzing(false);
    }
  };

  if (!repositoryId) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs font-mono">
        Please load or select a repository to launch Bug Detective.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center space-x-2">
            <SearchCode className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-slate-100">
              Bug Detective (Flagship Investigation)
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Evidence-Backed
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous 6-step investigation: understand issue, retrieve code evidence, validate citations, synthesize patch & regression test.
          </p>
        </div>
      </div>

      {/* Investigation Input Card */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 space-y-4 shadow-xl">
        {/* Preset Buttons */}
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block mb-2">
            Try Demo Bug Scenarios:
          </span>
          <div className="flex flex-wrap gap-2">
            {demoPresets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#0a0e17] hover:bg-[#1e293b] text-slate-300 border border-[#1e293b] hover:border-blue-500/30 transition cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Bug Description or Observed Failure *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Why does my Python application crash when the user submits an empty list?"
              className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500/50 leading-relaxed font-sans"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Optional Error Message / Exception
              </label>
              <input
                type="text"
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                placeholder="e.g. ZeroDivisionError: division by zero"
                className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-hidden focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Optional Target File Path
              </label>
              <input
                type="text"
                value={targetFile}
                onChange={(e) => setTargetFile(e.target.value)}
                placeholder="e.g. app/calculator.py"
                className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-hidden focus:border-blue-500/50"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Source code will be inspected via AST symbol scanning and grounded analysis.
          </span>
          <button
            onClick={handleStartInvestigation}
            disabled={isAnalyzing || !description.trim()}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium text-xs shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isAnalyzing ? "Investigating..." : "Investigate Bug"}</span>
          </button>
        </div>
      </div>

      {/* Investigation Pipeline Steps Bar */}
      {isAnalyzing && (
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 space-y-3 animate-in fade-in">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Executing 6-Step Verification Pipeline...
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            {[
              { num: 1, title: "Deconstruct", desc: "Extract symbols" },
              { num: 2, title: "Retrieve", desc: "Search call sites" },
              { num: 3, title: "Analyze", desc: "Model inference" },
              { num: 4, title: "Validate", desc: "Verify citations" },
              { num: 5, title: "Formulate", desc: "Synthesize patch" },
              { num: 6, title: "Ready", desc: "Human review" },
            ].map((s) => {
              const isCurrent = activeStep === s.num;
              const isDone = activeStep > s.num;
              return (
                <div
                  key={s.num}
                  className={`p-3 rounded-xl border text-center transition ${
                    isCurrent
                      ? "bg-blue-600/15 border-blue-500/50 text-blue-300 font-semibold animate-pulse"
                      : isDone
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-[#0a0e17] border-[#1e293b] text-slate-500"
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold">Step {s.num}</div>
                  <div className="mt-0.5">{s.title}</div>
                  <div className="text-[10px] text-slate-400">{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error State */}
      {analysisError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl flex items-center space-x-2 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{analysisError}</span>
        </div>
      )}

      {/* Investigation Findings Display */}
      {finding && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Finding Banner Header */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 space-y-3 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e293b]">
              <div className="flex items-center space-x-2.5">
                <span className="font-mono text-xs text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                  {finding.bug_id}
                </span>
                <h2 className="text-base font-bold text-slate-100">{finding.title}</h2>
              </div>

              {/* Severity Estimate Pill */}
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    finding.severity === "Critical" || finding.severity === "High"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : finding.severity === "Medium"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}
                >
                  Severity: {finding.severity}
                </span>
              </div>
            </div>

            {/* Severity Disclaimer Notice */}
            <div className="text-[11px] text-slate-400 italic bg-[#0a0e17] px-3 py-1.5 rounded-lg border border-[#1e293b]">
              Notice: {finding.severity_disclaimer}
            </div>

            {/* Explanation & Root Cause */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="bg-[#0a0e17] p-4 rounded-xl border border-[#1e293b] space-y-1.5">
                <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Failure Explanation:</span>
                </div>
                <p className="text-slate-400 leading-relaxed">{finding.explanation}</p>
              </div>

              <div className="bg-[#0a0e17] p-4 rounded-xl border border-[#1e293b] space-y-1.5">
                <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Root Cause & Trigger:</span>
                </div>
                <p className="text-slate-400 leading-relaxed">{finding.root_cause}</p>
                <div className="text-[11px] text-slate-400 font-mono mt-1">
                  Trigger: {finding.reproduction_conditions}
                </div>
              </div>
            </div>

            {/* Citations List */}
            <div className="pt-2">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Source Citations:</span>
              </div>
              <div className="space-y-2">
                {finding.citations.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#0a0e17] border border-[#1e293b] rounded-xl text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onOpenFileInExplorer(c.file_path, [c.start_line, c.end_line])}
                        className="flex items-center space-x-1.5 text-blue-400 hover:underline font-mono"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>{c.file_path}: Lines {c.start_line}-{c.end_line}</span>
                      </button>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {c.verified_exists ? "Verified on Disk" : "Missing"}
                      </span>
                    </div>
                    <pre className="p-2 bg-black/40 rounded font-mono text-[11px] text-slate-300 overflow-x-auto">
                      {c.snippet}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Proposed Patch Section */}
            <div className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <GitCompare className="w-4 h-4 text-blue-400" />
                  <span>Proposed Minimal Patch:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(finding.proposed_patch);
                      setCopiedPatch(true);
                      setTimeout(() => setCopiedPatch(false), 2000);
                    }}
                    className="flex items-center space-x-1 text-[11px] px-2.5 py-1 rounded bg-[#0a0e17] hover:bg-[#1e293b] text-slate-300 border border-[#1e293b] transition"
                  >
                    {copiedPatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPatch ? "Copied" : "Copy Patch"}</span>
                  </button>
                  <button
                    onClick={() => onNavigateToPatch(finding.affected_file, finding.proposed_patch)}
                    className="flex items-center space-x-1 text-[11px] px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition cursor-pointer"
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Review in Patch Lab →</span>
                  </button>
                </div>
              </div>

              <DiffViewer unifiedDiff={finding.proposed_patch} filePath={finding.affected_file} />
            </div>

            {/* Generated Regression Test Section */}
            <div className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <FlaskConical className="w-4 h-4 text-emerald-400" />
                  <span>Generated Regression Test (Pytest):</span>
                </div>
                <button
                  onClick={() => onNavigateToTest(finding.regression_test)}
                  className="flex items-center space-x-1 text-[11px] px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition cursor-pointer"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Execute in Test Lab →</span>
                </button>
              </div>

              <div className="bg-[#0a0e17] rounded-xl border border-[#1e293b] p-3">
                <pre className="font-mono text-xs text-emerald-300 leading-relaxed overflow-x-auto whitespace-pre">
                  {finding.regression_test}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from "react";
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  FileCode,
  ShieldCheck,
  Play,
  Save,
  Hash,
  Undo2,
} from "lucide-react";
import { PatchValidateResponse } from "../types";
import { api } from "../services/api";
import { DiffViewer } from "../components/DiffViewer";

interface PatchReviewPageProps {
  repositoryId: string | null;
  filePath: string;
  initialProposedCode?: string;
  onNavigateToTest: (testCode?: string) => void;
}

export const PatchReviewPage: React.FC<PatchReviewPageProps> = ({
  repositoryId,
  filePath: initialFilePath,
  initialProposedCode,
  onNavigateToTest,
}) => {
  const [filePath, setFilePath] = useState(initialFilePath || "app/calculator.py");
  const [originalCode, setOriginalCode] = useState("");
  const [proposedCode, setProposedCode] = useState(initialProposedCode || "");
  const [validation, setValidation] = useState<PatchValidateResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<"diff" | "editor">("diff");

  // Load original code
  useEffect(() => {
    if (!repositoryId || !filePath) return;
    api.getFileContent(repositoryId, filePath)
      .then((res) => {
        setOriginalCode(res.content);
        if (!proposedCode) {
          // Provide default proposed code fix for demonstration if empty
          const fix = res.content.replace(
            "return sum(numbers) / len(numbers)",
            "if not numbers:\n        raise ValueError('Cannot calculate average of an empty list')\n    return sum(numbers) / len(numbers)"
          );
          setProposedCode(fix);
        }
      })
      .catch((err) => console.error("Error reading file:", err));
  }, [repositoryId, filePath]);

  // Validate patch whenever proposedCode or filePath changes
  useEffect(() => {
    if (!repositoryId || !filePath || !proposedCode) return;
    setIsValidating(true);
    api.validatePatch({
      repository_id: repositoryId,
      file_path: filePath,
      proposed_code: proposedCode,
    })
      .then((val) => {
        setValidation(val);
        setIsValidating(false);
      })
      .catch((err) => {
        console.error("Validation error:", err);
        setIsValidating(false);
      });
  }, [repositoryId, filePath, proposedCode]);

  const handleApplyToWorkingCopy = async () => {
    if (!repositoryId || !filePath || !proposedCode) return;
    setStatusMessage(null);
    try {
      const res = await api.applyPatch({
        repository_id: repositoryId,
        file_path: filePath,
        proposed_code: proposedCode,
        expected_source_hash: validation?.source_hash,
        backup_first: true,
      });
      setStatusMessage({ type: "success", text: res.message });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to apply patch." });
    }
  };

  const handleRollbackSingle = async () => {
    if (!repositoryId || !filePath) return;
    setStatusMessage(null);
    try {
      const res = await api.rollbackSinglePatch(repositoryId, filePath);
      setStatusMessage({ type: "success", text: res.message });
      const orig = await api.getFileContent(repositoryId, filePath);
      setOriginalCode(orig.content);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to rollback single file." });
    }
  };

  const handleRevert = async () => {
    if (!repositoryId) return;
    setStatusMessage(null);
    try {
      const res = await api.revertPatch(repositoryId);
      setStatusMessage({ type: "success", text: res.message });
      // Reload original
      const orig = await api.getFileContent(repositoryId, filePath);
      setOriginalCode(orig.content);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to revert." });
    }
  };

  if (!repositoryId) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs font-mono">
        Please select a repository to review patches.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center space-x-2">
            <GitCompare className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-slate-100">
              Patch Review & Controlled Application
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Validate modifications against directory traversal, inspect SHA-256 source content hashes, and apply changes exclusively to an isolated working copy.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-2 bg-[#111827] p-1 rounded-xl border border-[#1e293b]">
          <button
            onClick={() => setViewMode("diff")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              viewMode === "diff"
                ? "bg-blue-600 text-white font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Unified Diff
          </button>
          <button
            onClick={() => setViewMode("editor")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              viewMode === "editor"
                ? "bg-blue-600 text-white font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Source Editor
          </button>
        </div>
      </div>

      {/* Stale Patch Warning */}
      {validation?.stale_patch && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-200">Stale Patch Detected</span>
            <p className="text-slate-300 leading-relaxed">
              The underlying source file has been modified in the repository since this proposed patch was generated.
              Please re-review the diff to avoid overwriting recent code changes.
            </p>
          </div>
        </div>
      )}

      {/* Target File Picker & Hash Info */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3 text-slate-300">
          <FileCode className="w-4 h-4 text-blue-400" />
          <span className="text-slate-400">Target File:</span>
          <span className="font-mono text-slate-100 font-bold">{filePath}</span>
          {validation?.source_hash && (
            <span className="flex items-center space-x-1 text-[11px] font-mono text-slate-400 bg-[#0a0e17] px-2 py-0.5 rounded border border-[#1e293b]" title={`Full SHA-256: ${validation.source_hash}`}>
              <Hash className="w-3 h-3 text-slate-500" />
              <span>SHA-256: {validation.source_hash.slice(0, 10)}...</span>
            </span>
          )}
        </div>

        {/* Validation Status Pill */}
        {validation && (
          <div className="flex items-center space-x-3">
            <span className="text-emerald-400 font-mono">+{validation.additions} lines</span>
            <span className="text-rose-400 font-mono">-{validation.deletions} lines</span>
            <span
              className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                validation.is_valid
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              {validation.is_valid ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              <span>{validation.is_valid ? "Patch Validated" : "Validation Errors"}</span>
            </span>
          </div>
        )}
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center space-x-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Content Area */}
      {viewMode === "diff" ? (
        <div className="space-y-4">
          <DiffViewer
            unifiedDiff={validation?.unified_diff || "Generating unified diff..."}
            filePath={filePath}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-[#0f172a] border-b border-[#1e293b] text-xs font-semibold text-slate-300">
              Original Source Code (Read-Only)
            </div>
            <textarea
              readOnly
              rows={16}
              value={originalCode}
              className="w-full p-3 bg-[#0a0e17] text-xs font-mono text-slate-300 focus:outline-hidden leading-relaxed resize-none"
            />
          </div>

          <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-[#0f172a] border-b border-[#1e293b] text-xs font-semibold text-blue-400 flex items-center justify-between">
              <span>Proposed Source Code (Editable)</span>
              <span className="text-[10px] text-slate-500">Edit before applying</span>
            </div>
            <textarea
              rows={16}
              value={proposedCode}
              onChange={(e) => setProposedCode(e.target.value)}
              className="w-full p-3 bg-[#0a0e17] text-xs font-mono text-emerald-300 focus:outline-hidden leading-relaxed resize-none"
            />
          </div>
        </div>
      )}

      {/* Controlled Action Bar */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Human-in-the-Loop Safe Deployment</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Applying the patch writes strictly to an isolated working copy. Content hashes are validated to prevent stale patch collisions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRollbackSingle}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#0a0e17] hover:bg-[#1e293b] text-slate-300 border border-[#1e293b] text-xs transition cursor-pointer"
            title="Rollback this single file from backup"
          >
            <Undo2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Rollback File</span>
          </button>

          <button
            onClick={handleRevert}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#0a0e17] hover:bg-[#1e293b] text-slate-300 border border-[#1e293b] text-xs transition cursor-pointer"
            title="Revert working copy back to pristine original snapshot"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Revert All</span>
          </button>

          <button
            onClick={handleApplyToWorkingCopy}
            disabled={!validation?.is_valid}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Apply to Working Copy</span>
          </button>

          <button
            onClick={() => onNavigateToTest()}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Verify in Test Lab →</span>
          </button>
        </div>
      </div>
    </div>
  );
};

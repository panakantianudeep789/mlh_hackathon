import React, { useState, useRef } from "react";
import {
  Upload,
  FolderGit2,
  Trash2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Clock,
  Layers,
} from "lucide-react";
import { RepositorySummary } from "../types";
import { api } from "../services/api";

interface RepositoriesPageProps {
  repositories: RepositorySummary[];
  selectedRepoId: string | null;
  onSelectRepo: (id: string) => void;
  onRefreshRepos: () => void;
  onLoadDemo: () => void;
  isLoadingDemo: boolean;
}

export const RepositoriesPage: React.FC<RepositoriesPageProps> = ({
  repositories,
  selectedRepoId,
  onSelectRepo,
  onRefreshRepos,
  onLoadDemo,
  isLoadingDemo,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setUploadError("Security Error: Only .zip repository archives are supported.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setSuccessMsg(null);

    try {
      const newRepo = await api.uploadRepositoryZip(file);
      setSuccessMsg(`Repository "${newRepo.name}" ingested and indexed (${newRepo.file_count} files).`);
      onRefreshRepos();
      onSelectRepo(newRepo.id);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload repository archive.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (repoId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove repository "${name}"?`)) return;
    try {
      await api.deleteRepository(repoId);
      onRefreshRepos();
    } catch (err: any) {
      alert(`Failed to delete repository: ${err.message}`);
    }
  };

  const handleReindex = async (repoId: string) => {
    try {
      await api.getRepositories();
      onRefreshRepos();
      setSuccessMsg("Repository re-indexed successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Re-indexing failed: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <FolderGit2 className="w-5 h-5 text-blue-400" />
            <span>Repository Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ingest local repositories via ZIP archives or inspect the bundled demonstration codebase.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onLoadDemo}
            disabled={isLoadingDemo}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoadingDemo ? "Loading Demo..." : "Load Demo Repository"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {uploadError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-xl flex items-center space-x-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{uploadError}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3.5 rounded-xl flex items-center space-x-2 text-xs">
          <FileCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ZIP Upload Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-[#1e293b] hover:border-blue-500/50 bg-[#0f172a]/50 hover:bg-[#111827] rounded-2xl p-8 text-center cursor-pointer transition group"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 transition">
          <Upload className="w-6 h-6" />
        </div>
        <div className="text-sm font-semibold text-slate-200">
          {isUploading ? "Extracting & Indexing Archive..." : "Upload Repository ZIP Archive"}
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
          Drag and drop a <code>.zip</code> file here or click to browse. Max size: 50MB.
          Protections against Zip Slip, traversal, and secret files are automatically enforced.
        </p>
      </div>

      {/* Security Safeguards Callout */}
      <div className="bg-[#0a0e17] border border-[#1e293b] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center space-x-2 text-emerald-400 font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>Strict Ingestion Safeguards Active:</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
            <span>Zip Slip Rejection</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
            <span>Symlink Block</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
            <span>Secret Masking (.env, keys)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
            <span>No Auto-Execution</span>
          </span>
        </div>
      </div>

      {/* Repositories List Table */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e293b] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Repositories ({repositories.length})
          </span>
          <button
            onClick={onRefreshRepos}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {repositories.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No repositories currently indexed. Upload a ZIP file or load the demo project above.
          </div>
        ) : (
          <div className="divide-y divide-[#1e293b]">
            {repositories.map((repo) => {
              const isSelected = repo.id === selectedRepoId;
              return (
                <div
                  key={repo.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    isSelected ? "bg-blue-600/5 border-l-4 border-blue-500" : "hover:bg-[#0f172a]"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-200 text-sm">{repo.name}</span>
                      {isSelected && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono truncate max-w-lg">
                      {repo.path}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400">
                        {repo.file_count} files
                      </span>
                      <span className="text-slate-600">•</span>
                      {Object.entries(repo.languages).map(([ext, count]) => (
                        <span
                          key={ext}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e293b] text-slate-300 font-mono"
                        >
                          {ext} ({count})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {!isSelected && (
                      <button
                        onClick={() => onSelectRepo(repo.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#1e293b] hover:bg-blue-600 hover:text-white text-slate-200 text-xs font-medium transition cursor-pointer"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => handleReindex(repo.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] rounded-lg transition"
                      title="Re-index"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(repo.id, repo.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Remove Repository"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

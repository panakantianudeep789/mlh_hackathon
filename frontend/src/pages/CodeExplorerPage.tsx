import React, { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  FileCode,
  File,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  BotMessageSquare,
  Sparkles,
  AlertTriangle,
  Lock,
} from "lucide-react";
import {
  FileNode,
  FileContentResponse,
  AstSymbol,
  PageId,
} from "../types";
import { api } from "../services/api";
import { CodeViewer } from "../components/CodeViewer";

interface CodeExplorerPageProps {
  repositoryId: string | null;
  onNavigateToChat: (file: string, lines?: number[]) => void;
}

export const CodeExplorerPage: React.FC<CodeExplorerPageProps> = ({
  repositoryId,
  onNavigateToChat,
}) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContentResponse | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightLines, setHighlightLines] = useState<number[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["app", "tests"]));

  // Load file tree when repositoryId changes
  useEffect(() => {
    if (!repositoryId) return;
    api.getRepositoryFiles(repositoryId)
      .then((tree) => {
        setFileTree(tree);
        // Find default file to open (e.g. app/calculator.py)
        const findDefault = (nodes: FileNode[]): string | null => {
          for (const n of nodes) {
            if (n.type === "file" && n.path.endsWith(".py")) return n.path;
            if (n.children) {
              const res = findDefault(n.children);
              if (res) return res;
            }
          }
          return null;
        };
        const def = findDefault(tree);
        if (def) setSelectedPath(def);
      })
      .catch((err) => console.error("Error fetching files:", err));
  }, [repositoryId]);

  // Load content of selectedPath
  useEffect(() => {
    if (!repositoryId || !selectedPath) return;
    setIsLoadingFile(true);
    api.getFileContent(repositoryId, selectedPath)
      .then((data) => {
        setFileContent(data);
        setIsLoadingFile(false);
      })
      .catch((err) => {
        console.error("Error loading file content:", err);
        setIsLoadingFile(false);
      });
  }, [repositoryId, selectedPath]);

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  };

  const renderTreeNode = (node: FileNode) => {
    if (node.type === "directory") {
      const isExpanded = expandedDirs.has(node.path);
      return (
        <div key={node.path} className="select-none">
          <div
            onClick={() => toggleDir(node.path)}
            className="flex items-center space-x-1.5 px-2 py-1.5 rounded hover:bg-[#111827] cursor-pointer text-slate-300 text-xs transition"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div className="pl-4 border-l border-[#1e293b]/60 ml-3">
              {node.children.map(renderTreeNode)}
            </div>
          )}
        </div>
      );
    }

    const isSelected = selectedPath === node.path;
    return (
      <div
        key={node.path}
        onClick={() => {
          setSelectedPath(node.path);
          setHighlightLines([]);
        }}
        className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer text-xs transition ${
          isSelected
            ? "bg-blue-600/15 text-blue-400 font-medium border-l-2 border-blue-500"
            : "text-slate-400 hover:text-slate-200 hover:bg-[#111827]"
        }`}
      >
        <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-blue-400" : "text-slate-500"}`} />
        <span className="truncate">{node.name}</span>
      </div>
    );
  };

  if (!repositoryId) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        No repository selected. Please load or select a repository from the header dropdown.
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-[#090d16]">
      {/* LEFT PANEL: File Tree (w-64) */}
      <div className="w-full lg:w-72 bg-[#0a0e17] border-b lg:border-b-0 lg:border-r border-[#1e293b] flex flex-col shrink-0">
        <div className="p-3 border-b border-[#1e293b] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Repository Tree
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {fileTree.length} roots
            </span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#111827] border border-[#1e293b] text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-blue-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {fileTree.map(renderTreeNode)}
        </div>
      </div>

      {/* CENTER PANEL: Source Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden p-3 lg:p-4 min-w-0">
        {isLoadingFile ? (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500 animate-pulse font-mono">
            Loading file contents...
          </div>
        ) : fileContent?.is_secret ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#111827] rounded-xl border border-rose-500/20">
            <Lock className="w-8 h-8 text-rose-400 mb-2" />
            <h3 className="font-semibold text-slate-200 text-sm">Protected Credential File</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              This file matches sensitive credential patterns (.env, keys) and has been redacted by RepoPilot AI security policy.
            </p>
          </div>
        ) : fileContent ? (
          <CodeViewer
            filePath={fileContent.path}
            content={fileContent.content}
            highlightLines={highlightLines}
            language={fileContent.extension.replace(".", "")}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500 font-mono">
            Select a file from the tree to inspect code.
          </div>
        )}
      </div>

      {/* RIGHT PANEL: AST Symbols & AI Insights (w-80) */}
      <div className="w-full lg:w-80 bg-[#0a0e17] border-t lg:border-t-0 lg:border-l border-[#1e293b] flex flex-col shrink-0">
        <div className="p-3 border-b border-[#1e293b] flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Code Symbols (AST)
          </span>
          <span className="text-[10px] text-blue-400 font-mono font-medium">
            {fileContent?.symbols.length || 0} parsed
          </span>
        </div>

        {/* Syntax Warning */}
        {fileContent?.syntax_error && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-[11px] flex items-start space-x-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>{fileContent.syntax_error}</span>
          </div>
        )}

        {/* Extracted Symbols List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!fileContent || fileContent.symbols.length === 0 ? (
            <div className="text-slate-500 text-xs text-center py-8">
              No top-level functions or classes detected in this file.
            </div>
          ) : (
            fileContent.symbols.map((sym, idx) => (
              <div
                key={idx}
                onClick={() => setHighlightLines([sym.start_line, sym.end_line])}
                className="p-2.5 rounded-lg bg-[#111827] border border-[#1e293b] hover:border-blue-500/40 cursor-pointer transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-mono text-xs">
                    <span
                      className={`text-[10px] px-1 py-0.2 rounded font-bold uppercase ${
                        sym.type === "function"
                          ? "bg-purple-500/10 text-purple-400"
                          : sym.type === "class"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-slate-500/10 text-slate-400"
                      }`}
                    >
                      {sym.type}
                    </span>
                    <span className="text-slate-200 group-hover:text-blue-400 transition truncate max-w-[150px]">
                      {sym.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    L{sym.start_line}-{sym.end_line}
                  </span>
                </div>

                {sym.docstring && (
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 italic">
                    &quot;{sym.docstring}&quot;
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Quick Action: Ask AI */}
        {selectedPath && (
          <div className="p-3 border-t border-[#1e293b] bg-[#0c121e]">
            <button
              onClick={() => onNavigateToChat(selectedPath, highlightLines)}
              className="w-full flex items-center justify-center space-x-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-xs cursor-pointer"
            >
              <BotMessageSquare className="w-4 h-4" />
              <span>Ask AI About This File</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

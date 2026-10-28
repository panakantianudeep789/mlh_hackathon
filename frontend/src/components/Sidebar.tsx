import React from "react";
import {
  LayoutDashboard,
  FolderGit2,
  Code2,
  BotMessageSquare,
  SearchCode,
  GitCompare,
  FlaskConical,
  Award,
  Sparkles,
  Settings as SettingsIcon,
  X,
  ExternalLink,
} from "lucide-react";
import { PageId } from "../types";

interface SidebarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "repositories", label: "Repositories", icon: FolderGit2 },
  { id: "explorer", label: "Code Explorer", icon: Code2 },
  { id: "chat", label: "AI Assistant", icon: BotMessageSquare },
  { id: "bugs", label: "Bug Detective", icon: SearchCode, badge: "Flagship" },
  { id: "patches", label: "Patch Review", icon: GitCompare },
  { id: "tests", label: "Test Lab", icon: FlaskConical },
  { id: "skills", label: "Agent Skills", icon: Award },
  { id: "benchmark", label: "Evaluation", icon: Sparkles },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  mobileOpen,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a0e17] border-r border-[#1e293b] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#1e293b] bg-[#0c121e]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold">
              RP
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-slate-100 tracking-tight text-base">
                  RepoPilot
                </span>
                <span className="text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                Verify Every Change
              </p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectPage(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#111827]"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-blue-400" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-3 border-t border-[#1e293b] bg-[#0c121e]">
          <div className="bg-[#111827] rounded-lg p-2.5 border border-[#1e293b]">
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <span>Local Open-Weight</span>
              <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                <span>Active</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono truncate">
              qwen2.5-coder:7b
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

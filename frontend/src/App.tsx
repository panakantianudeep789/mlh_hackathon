import React, { useState, useEffect } from "react";
import { PageId, RepositorySummary, ModelStatusResponse } from "./types";
import { api } from "./services/api";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";

// Pages
import { DashboardPage } from "./pages/DashboardPage";
import { RepositoriesPage } from "./pages/RepositoriesPage";
import { CodeExplorerPage } from "./pages/CodeExplorerPage";
import { AIAssistantPage } from "./pages/AIAssistantPage";
import { BugDetectivePage } from "./pages/BugDetectivePage";
import { PatchReviewPage } from "./pages/PatchReviewPage";
import { TestLabPage } from "./pages/TestLabPage";
import { AgentSkillsPage } from "./pages/AgentSkillsPage";
import { BenchmarkPage } from "./pages/BenchmarkPage";
import { SettingsPage } from "./pages/SettingsPage";

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Core Global State
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [dockerAvailable, setDockerAvailable] = useState<boolean>(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  // History State
  const [recentBugs, setRecentBugs] = useState<any[]>([]);
  const [recentTests, setRecentTests] = useState<any[]>([]);

  // Cross-Page Navigation Context
  const [chatSelectedFile, setChatSelectedFile] = useState<string | null>(null);
  const [chatSelectedLines, setChatSelectedLines] = useState<number[] | undefined>(undefined);

  const [patchTargetFile, setPatchTargetFile] = useState<string>("app/calculator.py");
  const [patchProposedCode, setPatchProposedCode] = useState<string | undefined>(undefined);

  const [testTargetCode, setTestTargetCode] = useState<string | undefined>(undefined);

  // Fetch Initial Data
  const loadInitialData = async () => {
    try {
      const [health, model, repos, bugs, tests] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getModelStatus().catch(() => null),
        api.getRepositories().catch(() => []),
        api.getRecentBugs().catch(() => []),
        api.getRecentTestRuns().catch(() => []),
      ]);

      if (health) setDockerAvailable(health.docker_available);
      if (model) setModelStatus(model);
      if (repos) {
        setRepositories(repos);
        if (repos.length > 0 && !selectedRepoId) {
          setSelectedRepoId(repos[0].id);
        }
      }
      if (bugs) setRecentBugs(bugs);
      if (tests) setRecentTests(tests);
    } catch (err) {
      console.error("Initialization error:", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      const demo = await api.loadDemoRepository();
      setRepositories((prev) => {
        const filtered = prev.filter((r) => r.id !== demo.id);
        return [demo, ...filtered];
      });
      setSelectedRepoId(demo.id);
    } catch (err: any) {
      alert(`Failed to load demo repository: ${err.message}`);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  // Cross-page navigation handlers
  const handleNavigateToChat = (file: string, lines?: number[]) => {
    setChatSelectedFile(file);
    setChatSelectedLines(lines);
    setActivePage("chat");
  };

  const handleNavigateToPatch = (file: string, proposedCode: string) => {
    setPatchTargetFile(file);
    setPatchProposedCode(proposedCode);
    setActivePage("patches");
  };

  const handleNavigateToTest = (testCode?: string) => {
    if (testCode) setTestTargetCode(testCode);
    setActivePage("tests");
  };

  const handleOpenFileInExplorer = (file: string, lines?: number[]) => {
    setActivePage("explorer");
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100 flex flex-col font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        onSelectPage={(page) => setActivePage(page)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        <Header
          onOpenMobileNav={() => setMobileNavOpen(true)}
          repositories={repositories}
          selectedRepoId={selectedRepoId}
          onSelectRepo={(id) => setSelectedRepoId(id)}
          modelStatus={modelStatus}
          dockerAvailable={dockerAvailable}
          onLoadDemo={handleLoadDemo}
          isLoadingDemo={isLoadingDemo}
          onRefreshStatus={loadInitialData}
        />

        <main className="flex-1 overflow-y-auto">
          {activePage === "overview" && (
            <DashboardPage
              repositories={repositories}
              selectedRepoId={selectedRepoId}
              modelStatus={modelStatus}
              dockerAvailable={dockerAvailable}
              onNavigate={(page) => setActivePage(page)}
              onLoadDemo={handleLoadDemo}
              isLoadingDemo={isLoadingDemo}
              recentBugs={recentBugs}
              recentTests={recentTests}
            />
          )}

          {activePage === "repositories" && (
            <RepositoriesPage
              repositories={repositories}
              selectedRepoId={selectedRepoId}
              onSelectRepo={(id) => setSelectedRepoId(id)}
              onRefreshRepos={loadInitialData}
              onLoadDemo={handleLoadDemo}
              isLoadingDemo={isLoadingDemo}
            />
          )}

          {activePage === "explorer" && (
            <CodeExplorerPage
              repositoryId={selectedRepoId}
              onNavigateToChat={handleNavigateToChat}
            />
          )}

          {activePage === "chat" && (
            <AIAssistantPage
              repositoryId={selectedRepoId}
              selectedFile={chatSelectedFile}
              selectedLines={chatSelectedLines}
              onOpenFileInExplorer={handleOpenFileInExplorer}
            />
          )}

          {activePage === "bugs" && (
            <BugDetectivePage
              repositoryId={selectedRepoId}
              onNavigateToPatch={handleNavigateToPatch}
              onNavigateToTest={handleNavigateToTest}
              onOpenFileInExplorer={handleOpenFileInExplorer}
            />
          )}

          {activePage === "patches" && (
            <PatchReviewPage
              repositoryId={selectedRepoId}
              filePath={patchTargetFile}
              initialProposedCode={patchProposedCode}
              onNavigateToTest={handleNavigateToTest}
            />
          )}

          {activePage === "tests" && (
            <TestLabPage
              repositoryId={selectedRepoId}
              initialTestCode={testTargetCode}
              dockerAvailable={dockerAvailable}
              onNavigateToPatch={() => setActivePage("patches")}
            />
          )}

          {activePage === "skills" && <AgentSkillsPage />}

          {activePage === "benchmark" && (
            <BenchmarkPage repositoryId={selectedRepoId} />
          )}

          {activePage === "settings" && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};

export default App;

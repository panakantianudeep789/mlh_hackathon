import React, { useState } from "react";
import {
  FlaskConical,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  GitCompare,
  Info,
} from "lucide-react";
import { TestRunResponse, PageId } from "../types";
import { api } from "../services/api";
import { TerminalViewer } from "../components/TerminalViewer";

interface TestLabPageProps {
  repositoryId: string | null;
  initialTestCode?: string;
  dockerAvailable: boolean;
  onNavigateToPatch: () => void;
}

export const TestLabPage: React.FC<TestLabPageProps> = ({
  repositoryId,
  initialTestCode,
  dockerAvailable,
  onNavigateToPatch,
}) => {
  const [testCode, setTestCode] = useState(
    initialTestCode ||
      "import pytest\nfrom app.calculator import average\n\ndef test_average_empty_list_regression():\n    with pytest.raises(ValueError, match='Cannot calculate average of an empty list'):\n        average([])\n"
  );
  const [timeoutSeconds, setTimeoutSeconds] = useState(30);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<TestRunResponse | null>(null);
  const [allowHostExecution, setAllowHostExecution] = useState(false);

  const testPresets = [
    {
      label: "Verify Empty List average() Fix",
      code: "import pytest\nfrom app.calculator import average\n\ndef test_average_empty_list():\n    with pytest.raises(ValueError):\n        average([])\n",
    },
    {
      label: "Verify Discount Boundary Check",
      code: "import pytest\nfrom app.calculator import calculate_discount\n\ndef test_discount_invalid_percent():\n    with pytest.raises(ValueError):\n        calculate_discount(100.0, 150.0)\n",
    },
    {
      label: "Verify Off-by-One Loop Index",
      code: "from app.calculator import find_first_positive\n\ndef test_find_first_positive_index_zero():\n    assert find_first_positive([10, -5, 2]) == 10\n",
    },
    {
      label: "Run Full Existing Pytest Suite",
      code: "", // Run default tests in repository
    },
  ];

  const handleRunTest = async () => {
    if (!repositoryId || isRunning) return;

    setIsRunning(true);
    setRunResult(null);

    try {
      const res = await api.runTests({
        repository_id: repositoryId,
        test_code: testCode.trim() ? testCode : undefined,
        timeout_seconds: timeoutSeconds,
        use_working_copy: true,
        allow_host_execution: allowHostExecution,
      });
      setRunResult(res);
    } catch (err: any) {
      setRunResult({
        execution_id: "ERR",
        repository_id: repositoryId,
        status: "error",
        exit_code: 1,
        stdout: "",
        stderr: err.message || "Failed to execute pytest.",
        duration_ms: 0,
        isolation_mode: dockerAvailable ? "docker_container" : "unavailable",
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (!repositoryId) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs font-mono">
        Please select a repository to access the Test Lab.
      </div>
    );
  }

  const canRun = dockerAvailable || allowHostExecution;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold text-slate-100">
              Test Lab (Isolated Verification)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            &quot;AI suggestions are hypotheses until checked against real test results.&quot;
          </p>
        </div>

        {/* Isolation Mode Badge */}
        <div
          className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center space-x-2 ${
            dockerAvailable
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : allowHostExecution
              ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
              : "bg-rose-500/10 text-rose-300 border-rose-500/20"
          }`}
        >
          {dockerAvailable ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : allowHostExecution ? (
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>
            {dockerAvailable
              ? "Docker Container Isolation (Secure)"
              : allowHostExecution
              ? "Restricted Host Subprocess (Insecure Opt-In)"
              : "Environment Unavailable (Docker Missing)"}
          </span>
        </div>
      </div>

      {/* Security Warning Notice if Docker is Missing */}
      {!dockerAvailable && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-amber-300">
                Docker Container Isolation Not Detected
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                By default, RepoPilot AI strictly refuses to execute untrusted repository tests directly on the host machine.
                To execute tests safely with resource limits and no network access, please install and launch Docker Desktop.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="flex items-center space-x-2 cursor-pointer text-xs text-amber-200 hover:text-white transition">
              <input
                type="checkbox"
                checked={allowHostExecution}
                onChange={(e) => setAllowHostExecution(e.target.checked)}
                className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 bg-[#0a0e17]"
              />
              <span className="font-semibold">
                Allow Restricted Host Execution (Insecure — Development Only)
              </span>
            </label>
            <span className="text-[11px] text-slate-400">
              Never enable for untrusted third-party archives
            </span>
          </div>
        </div>
      )}

      {/* Preset Quick Actions */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
        <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block mb-2">
          Load Verification Presets:
        </span>
        <div className="flex flex-wrap gap-2">
          {testPresets.map((tp, idx) => (
            <button
              key={idx}
              onClick={() => setTestCode(tp.code)}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#0a0e17] hover:bg-[#1e293b] text-slate-300 border border-[#1e293b] hover:border-emerald-500/30 transition cursor-pointer"
            >
              {tp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Test Code Editor and Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Test Code Editor */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col shadow-xl">
          <div className="px-4 py-2.5 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              Regression Test Code (Pytest)
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              timeout: {timeoutSeconds}s
            </span>
          </div>

          <textarea
            rows={14}
            value={testCode}
            onChange={(e) => setTestCode(e.target.value)}
            placeholder="# Write pytest code here, or leave blank to run the repository's existing tests/ suite."
            className="w-full flex-1 p-4 bg-[#0a0e17] text-xs font-mono text-emerald-300 focus:outline-hidden leading-relaxed resize-none"
          />

          <div className="p-3 bg-[#0f172a] border-t border-[#1e293b] flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              Target: Isolated Working Copy
            </div>
            <button
              onClick={handleRunTest}
              disabled={isRunning || !canRun}
              className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-white font-medium text-xs shadow-lg transition cursor-pointer ${
                !canRun
                  ? "bg-slate-700 opacity-60 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isRunning
                  ? "Running Pytest..."
                  : !canRun
                  ? "Execution Blocked (Opt-In Required)"
                  : "Run Test"}
              </span>
            </button>
          </div>
        </div>

        {/* Right: Terminal Output */}
        <div className="flex flex-col space-y-4">
          <TerminalViewer runResult={runResult} isRunning={isRunning} />

          {/* Test Outcome Summary Card */}
          {runResult && (
            <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Execution Outcome:</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">
                  {runResult.status === "passed"
                    ? "✓ Test Passed: Hypothesis Verified"
                    : runResult.status === "environment_unavailable"
                    ? "⚠ Environment Unavailable: Test Execution Blocked"
                    : "✗ Test Failed: Bug Reproduces / Regression Detected"}
                </div>
                {runResult.setup_guidance && (
                  <p className="text-xs text-amber-300 mt-1 font-mono">
                    {runResult.setup_guidance}
                  </p>
                )}
              </div>

              <button
                onClick={onNavigateToPatch}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/30 text-xs font-medium transition cursor-pointer"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Adjust Patch →</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
} from "lucide-react";
import { SettingsResponse } from "../types";
import { api } from "../services/api";

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("qwen2.5-coder:7b");
  const [testTimeout, setTestTimeout] = useState(30);
  const [maxUploadMb, setMaxUploadMb] = useState(50);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<{ success: boolean; msg: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ success: boolean; msg: string } | null>(null);

  useEffect(() => {
    api.getSettings()
      .then((data) => {
        setSettings(data);
        setOllamaUrl(data.ollama_base_url);
        setOllamaModel(data.ollama_model);
        setTestTimeout(data.test_timeout_seconds);
        setMaxUploadMb(data.max_upload_mb);
      })
      .catch((err) => console.error("Error fetching settings:", err));
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestMessage(null);
    try {
      const res = await api.testModelConnection(ollamaUrl, ollamaModel);
      setTestMessage({ success: res.success, msg: res.message });
    } catch (err: any) {
      setTestMessage({ success: false, msg: err.message || "Connection failed." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await api.updateSettings({
        ollama_base_url: ollamaUrl,
        ollama_model: ollamaModel,
        test_timeout_seconds: Number(testTimeout),
        max_upload_mb: Number(maxUploadMb),
      });
      setSaveMessage({ success: true, msg: "Settings saved successfully." });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage({ success: false, msg: err.message || "Failed to update settings." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title Bar */}
      <div className="pb-4 border-b border-[#1e293b]">
        <div className="flex items-center space-x-2">
          <SettingsIcon className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold text-slate-100">
            Platform Settings & Security Configuration
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Configure local inference, execution timeouts, and inspect security rules.
        </p>
      </div>

      {saveMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 ${
            saveMessage.success
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
          }`}
        >
          {saveMessage.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{saveMessage.msg}</span>
        </div>
      )}

      {/* Ollama Model Configuration Card */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center space-x-2 pb-3 border-b border-[#1e293b]">
          <Cpu className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Local Ollama Model Runtime
          </h2>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Ollama Server Base URL (Restricted to localhost/127.0.0.1 for SSRF protection)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="flex-1 bg-[#0a0e17] border border-[#1e293b] rounded-xl px-3.5 py-2 text-slate-200 font-mono focus:outline-hidden focus:border-blue-500/50"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-200 font-medium transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isTesting ? "Testing..." : "Test Connection"}
              </button>
            </div>
          </div>

          {testMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start space-x-2 ${
                testMessage.success
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
              }`}
            >
              {testMessage.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{testMessage.msg}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Active Open-Weight Model Name
            </label>
            <input
              type="text"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              placeholder="qwen2.5-coder:7b"
              className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-xl px-3.5 py-2 text-slate-200 font-mono focus:outline-hidden focus:border-blue-500/50"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Recommended: <code>qwen2.5-coder:7b</code>, <code>llama3.1:8b</code>, or <code>deepseek-coder:6.7b</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Execution Limits & Timeouts Card */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center space-x-2 pb-3 border-b border-[#1e293b]">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Execution Limits & Ingestion Thresholds
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Test Timeout (seconds)
            </label>
            <input
              type="number"
              min={5}
              max={180}
              value={testTimeout}
              onChange={(e) => setTestTimeout(Number(e.target.value))}
              className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-xl px-3.5 py-2 text-slate-200 font-mono focus:outline-hidden focus:border-blue-500/50"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Enforced per pytest execution to prevent runaway loops.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Maximum Upload Archive Size (MB)
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={maxUploadMb}
              onChange={(e) => setMaxUploadMb(Number(e.target.value))}
              className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-xl px-3.5 py-2 text-slate-200 font-mono focus:outline-hidden focus:border-blue-500/50"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Total uncompressed size limit for uploaded repository archives.
            </p>
          </div>
        </div>
      </div>

      {/* Security Policies Inspector */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 space-y-4 shadow-xl text-xs">
        <div className="flex items-center space-x-2 pb-3 border-b border-[#1e293b]">
          <Lock className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Protected Secret Patterns (Redacted by Policy)
          </h2>
        </div>

        <p className="text-slate-400 leading-relaxed">
          Files matching these patterns are blocked from AI prompts and API viewers to prevent accidental credential leakage:
        </p>

        <div className="flex flex-wrap gap-2">
          {settings?.secret_patterns.map((pat) => (
            <span
              key={pat}
              className="px-2.5 py-1 rounded-lg bg-[#0a0e17] text-amber-300 border border-[#1e293b] font-mono text-[11px]"
            >
              {pat}
            </span>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-blue-600/20 transition cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Saving..." : "Save Settings"}</span>
        </button>
      </div>
    </div>
  );
};

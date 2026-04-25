"use client";

import { useState, useEffect } from "react";
import { saveAISettings, getAISettings } from "@/app/actions/ai";
import { Brain, Key, Cpu, Globe, Save, CheckCircle, AlertCircle } from "lucide-react";

const PROVIDERS = [
  { id: "OPENAI", label: "OpenAI", defaultUrl: "https://api.openai.com/v1" },
  { id: "GEMINI", label: "Google Gemini", defaultUrl: "" },
  { id: "CLAUDE", label: "Anthropic Claude", defaultUrl: "" },
  { id: "OPENROUTER", label: "OpenRouter", defaultUrl: "https://openrouter.ai/api/v1" },
  { id: "NVIDIA", label: "NVIDIA Build", defaultUrl: "https://integrate.api.nvidia.com/v1" },
];

export default function AISettingsManager() {
  const [provider, setProvider] = useState("OPENAI");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("gpt-4o");
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    async function load() {
      const settings = await getAISettings();
      if (settings) {
        setProvider(settings.provider);
        setApiKey(settings.apiKey || "");
        setModelName(settings.modelName || "");
        setBaseUrl(settings.baseUrl || "");
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus("idle");
    const res = await saveAISettings({ provider, apiKey, modelName, baseUrl });
    setSaving(false);
    if (res.success) {
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      setStatus("error");
    }
  };

  if (loading) return <div className="animate-pulse h-40 bg-stone-100 rounded-2xl" />;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-stone-900">AI Intelligence Settings</h3>
          <p className="text-xs text-stone-400">Configure which AI brain powers your tasks</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Provider */}
        <div>
          <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block">Provider</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setProvider(p.id);
                  if (p.defaultUrl) setBaseUrl(p.defaultUrl);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  provider === p.id
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-white hover:border-purple-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div>
          <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
            <Key className="w-3 h-3" /> API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`Enter your ${provider} API key`}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* Model Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
              <Cpu className="w-3 h-3" /> Model Name
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. gpt-4o or llama-3-70b"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> Base URL (Optional)
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="Custom API endpoint"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === "success" && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Saved successfully
              </span>
            )}
            {status === "error" && (
              <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Error saving
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-lg shadow-purple-100 transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : <><Save className="w-4 h-4" /> Save AI Config</>}
          </button>
        </div>
      </div>
    </div>
  );
}

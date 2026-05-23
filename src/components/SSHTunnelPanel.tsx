"use client";

import { useState, useEffect } from "react";
import { Server, Key, Lock, Trash2, ShieldAlert, CheckCircle2, Terminal, FolderOpen, Plus, X } from "lucide-react";
import { saveSSHCredential, getSSHCredential, disconnectSSH, saveProjectPaths } from "@/app/actions/ssh";
import { toast } from "sonner";

export default function SSHTunnelPanel() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("");
  const [authMethod, setAuthMethod] = useState<"PASSWORD" | "KEY">("PASSWORD");
  const [secret, setSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [savedCredential, setSavedCredential] = useState<any>(null);

  // Project paths
  const [paths, setPaths] = useState<string[]>([]);
  const [newPath, setNewPath] = useState("");
  const [pathsLoading, setPathsLoading] = useState(false);

  useEffect(() => {
    fetchCredential();
  }, []);

  async function fetchCredential() {
    setLoading(true);
    const res = await getSSHCredential();
    setLoading(false);
    if (res.success && res.credential) {
      setSavedCredential(res.credential);
      setHost(res.credential.host);
      setPort(res.credential.port);
      setUsername(res.credential.username);
      setAuthMethod(res.credential.authMethod as "PASSWORD" | "KEY");
      // Load project paths
      const raw = res.credential.projectPaths || "";
      setPaths(raw ? raw.split(";").filter(Boolean) : []);
    } else {
      setSavedCredential(null);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!host || !username || !secret) {
      toast.error("Please fill in all required SSH fields.");
      return;
    }

    setActionLoading(true);
    const res = await saveSSHCredential({
      host,
      port,
      username,
      authMethod,
      secret,
      passphrase: authMethod === "KEY" && passphrase ? passphrase : undefined,
    });
    setActionLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("SSH Credentials securely saved!");
      setSecret("");
      setPassphrase("");
      fetchCredential();
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to disconnect this SSH Tunnel?")) return;
    setActionLoading(true);
    const res = await disconnectSSH();
    setActionLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("SSH connection removed.");
      setHost("");
      setPort(22);
      setUsername("");
      setAuthMethod("PASSWORD");
      setSecret("");
      setPassphrase("");
      setPaths([]);
      setSavedCredential(null);
    }
  }

  async function handleAddPath() {
    const trimmed = newPath.trim();
    if (!trimmed) return;
    if (paths.includes(trimmed)) {
      toast.error("This path is already in your list.");
      return;
    }
    const updated = [...paths, trimmed];
    setPaths(updated);
    setNewPath("");
    await persistPaths(updated);
  }

  async function handleRemovePath(path: string) {
    const updated = paths.filter((p) => p !== path);
    setPaths(updated);
    await persistPaths(updated);
  }

  async function persistPaths(updatedPaths: string[]) {
    setPathsLoading(true);
    const res = await saveProjectPaths(updatedPaths.join(";"));
    setPathsLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Project paths updated!");
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-white border border-stone-200 rounded-3xl animate-pulse space-y-4">
        <div className="h-5 bg-stone-100 rounded w-1/3"></div>
        <div className="h-10 bg-stone-50 rounded"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-stone-200 rounded-3xl shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
        <Terminal className="w-5 h-5 text-orange-500" />
        <div>
          <h3 className="text-base font-bold text-stone-900">SSH Agent CLI Tunnel</h3>
          <p className="text-xs text-stone-400">Connect to your local laptop to execute Antigravity commands remotely</p>
        </div>
      </div>

      {savedCredential ? (
        <div className="space-y-5">
          {/* Tunnel Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-orange-50/50 border border-orange-100 rounded-2xl">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200 text-orange-600">
                <CheckCircle2 className="w-5.5 h-5.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-900 leading-tight">
                  SSH Tunnel Configured
                </p>
                <p className="text-xs font-semibold text-orange-600 mt-0.5">
                  {savedCredential.username}@{savedCredential.host}:{savedCredential.port} ({savedCredential.authMethod})
                </p>
              </div>
            </div>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="w-full sm:w-auto justify-center text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3.5 py-2.5 rounded-xl transition-colors border border-red-100 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Disconnect SSH
            </button>
          </div>

          {/* Project Workspaces */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-stone-800">Project Workspaces</h4>
                <p className="text-[11px] text-stone-400">Add your local repo folder paths. Select one in the Agent Hub to auto-CD and launch <code className="bg-stone-100 px-1 rounded text-[10px]">agy</code>.</p>
              </div>
            </div>

            {/* Existing paths */}
            <div className="space-y-2">
              {paths.length === 0 ? (
                <div className="text-center py-4 px-3 bg-stone-50 border border-dashed border-stone-200 rounded-xl">
                  <p className="text-[11px] text-stone-400 font-medium">No project paths yet. Add one below.</p>
                </div>
              ) : (
                paths.map((path) => (
                  <div key={path} className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 group">
                    <FolderOpen className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="flex-1 text-xs font-mono text-stone-700 truncate min-w-0">{path}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePath(path)}
                      disabled={pathsLoading}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add new path */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPath()}
                placeholder="e.g. F:\Coding\my-project"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 bg-stone-50/50 min-w-0"
              />
              <button
                type="button"
                onClick={handleAddPath}
                disabled={!newPath.trim() || pathsLoading}
                className="px-3.5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm shadow-orange-200 transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Info card */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex items-start gap-3">
            <Server className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
            <div className="text-xs text-stone-600 space-y-1">
              <p className="font-bold text-stone-800">Tunnel Status: Ready</p>
              <p>Select a project workspace in the Agent Hub tab to launch <code className="bg-stone-100 px-1 rounded">agy</code> directly in that repository.</p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Host Address</label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.50 or laptop.local"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-stone-50/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Port</label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value) || 22)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-stone-50/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">SSH Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Administrator"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-stone-50/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Authentication Mode</label>
              <div className="flex gap-2 p-0.5 bg-stone-100 rounded-xl h-[42px] items-center">
                <button
                  type="button"
                  onClick={() => setAuthMethod("PASSWORD")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all h-[36px] flex items-center justify-center gap-1 cursor-pointer ${
                    authMethod === "PASSWORD" ? "bg-white text-stone-850 shadow-sm" : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" /> Password
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod("KEY")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all h-[36px] flex items-center justify-center gap-1 cursor-pointer ${
                    authMethod === "KEY" ? "bg-white text-stone-850 shadow-sm" : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  <Key className="w-3.5 h-3.5" /> Private Key
                </button>
              </div>
            </div>
          </div>

          {authMethod === "PASSWORD" ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">SSH Account Password</label>
              <input
                type="password"
                required
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-stone-50/50"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">SSH Private Key (PEM format)</label>
                <textarea
                  required
                  rows={5}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 bg-stone-50/50 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Key Passphrase (Optional)</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Leave blank if private key has no passphrase"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-stone-50/50"
                />
              </div>
            </div>
          )}

          <div className="p-3 bg-stone-50 border border-stone-150 rounded-2xl flex items-start gap-2.5 text-[11px] text-stone-500 leading-normal">
            <ShieldAlert className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
            <p>
              Your credentials are never exposed. They are encrypted using symmetric <span className="font-bold">AES-256-GCM</span> keys on the server-side before saving to the secure database model.
            </p>
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-md shadow-orange-200 transition-all disabled:opacity-50 cursor-pointer"
          >
            {actionLoading ? "Saving credentials securely..." : "Connect SSH Agent Tunnel"}
          </button>
        </form>
      )}
    </div>
  );
}

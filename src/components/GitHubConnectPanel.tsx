"use client";

import { useState, useEffect } from "react";
import {
  connectGitHub,
  disconnectGitHub,
  getGitHubStatus,
  listRepos,
  updateSelectedRepos,
  getGitHubAuditLogs,
} from "@/app/actions/github";
import {
  Key,
  ShieldAlert,
  ShieldCheck,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  Database,
  Calendar,
  AlertCircle,
  FileCode2,
} from "lucide-react";
import { toast } from "sonner";

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export default function GitHubConnectPanel() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [allRepos, setAllRepos] = useState<any[]>([]);
  const [repoSearch, setRepoSearch] = useState("");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"repos" | "audit">("repos");

  // Load status and selected repos
  const loadStatus = async () => {
    try {
      const res = await getGitHubStatus();
      setStatus(res);
      if (res.connected && !res.expired) {
        const repoRes = await listRepos();
        if (repoRes.success && repoRes.repos) {
          setAllRepos(repoRes.repos);
        } else if (repoRes.error) {
          toast.error(repoRes.error);
        }
        const logs = await getGitHubAuditLogs();
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error("Please enter a Personal Access Token.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await connectGitHub(token);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("GitHub account connected successfully!");
        setToken("");
        await loadStatus();
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your GitHub account? This will remove all token records.")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await disconnectGitHub();
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Disconnected from GitHub.");
        setStatus({ connected: false });
        setAllRepos([]);
        setAuditLogs([]);
      }
    } catch (err) {
      toast.error("Failed to disconnect.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleRepoSelection = async (repoFullName: string) => {
    if (!status) return;
    const isSelected = status.selectedRepos?.includes(repoFullName);
    const updatedRepos = isSelected
      ? status.selectedRepos.filter((r: string) => r !== repoFullName)
      : [...(status.selectedRepos || []), repoFullName];

    try {
      const res = await updateSelectedRepos(updatedRepos);
      if (res.success) {
        setStatus((prev: any) => ({ ...prev, selectedRepos: updatedRepos }));
        toast.success(isSelected ? "Removed repository" : "Added repository");
      } else {
        toast.error(res.error || "Failed to update selection");
      }
    } catch (err) {
      toast.error("Failed to update selection");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
    toast.success("GitHub state refreshed.");
  };

  const filteredRepos = allRepos.filter((r) =>
    r.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  );

  // Helper to render scope checklist items with beautiful descriptions
  const renderScopes = () => {
    if (!status || !status.scopes) return null;
    const active = status.scopes;

    const keyScopes = [
      { name: "repo", desc: "Access to private & public repositories (required to write issues)", req: true },
      { name: "read:org", desc: "Read organization memberships (optional)", req: false },
      { name: "user", desc: "Read profile information (required to fetch username)", req: true },
    ];

    return (
      <div className="space-y-3 bg-stone-50 border border-stone-200 rounded-xl p-4 mt-4">
        <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" /> Active Token Scopes
        </h4>
        <p className="text-[11px] text-stone-400 leading-normal">
          Here are the verified capabilities found on your Personal Access Token:
        </p>
        <div className="space-y-2 mt-2">
          {keyScopes.map((scope) => {
            const isGranted = active.some((s: string) => s === scope.name || s.startsWith(scope.name + ":"));
            return (
              <div key={scope.name} className="flex items-start gap-2.5">
                {isGranted ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-700 font-mono bg-stone-200 px-1 py-0.5 rounded leading-none">
                      {scope.name}
                    </span>
                    {scope.req && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wide text-orange-600 bg-orange-50 px-1 py-0.5 rounded leading-none border border-orange-100">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-stone-400 mt-0.5">{scope.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="animate-pulse h-60 bg-stone-100 rounded-2xl" />;
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
            <Github className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">GitHub Developer Hub Integration</h3>
            <p className="text-xs text-stone-400">Connect repositories, monitor issues, and issue voice bug-reports</p>
          </div>
        </div>

        {status.connected && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-9 h-9 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors"
            title="Refresh GitHub status"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {!status.connected || status.expired ? (
        <form onSubmit={handleConnect} className="space-y-4">
          {status.expired && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-700">Token Expired or Revoked</p>
                <p className="text-[10px] text-red-500 mt-0.5">
                  Your previously stored GitHub Personal Access Token returned a 401 Unauthorized error. Please reconnect a new token.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Personal Access Token (PAT)
            </label>
            <p className="text-[10px] text-stone-400 leading-normal mb-2">
              Generate a classic token on GitHub with <span className="font-bold text-stone-600">repo</span> and <span className="font-bold text-stone-600">user</span> scopes. 
              The token is encrypted with AES-256-GCM at rest and processed server-side.
            </p>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_..."
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-md shadow-orange-200 transition-all disabled:opacity-50"
          >
            {actionLoading ? "Connecting secure integration..." : "Connect GitHub Securely"}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          {/* User Info Block */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-orange-50/50 border border-orange-100 rounded-2xl">
            <div className="flex items-center gap-3.5 min-w-0">
              {status.avatarUrl ? (
                <img
                  src={status.avatarUrl}
                  alt={status.username}
                  className="w-12 h-12 rounded-2xl border-2 border-orange-200 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200">
                  <span className="text-xl font-bold text-orange-700">{status.username?.[0] || "G"}</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-900 leading-tight">
                  Connected to GitHub
                </p>
                <p className="text-xs font-semibold text-orange-600 mt-0.5">@{status.username}</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={actionLoading}
              className="w-full sm:w-auto justify-center text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3.5 py-2.5 rounded-xl transition-colors border border-red-100 flex items-center gap-1.5 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" /> Disconnect
            </button>
          </div>

          {/* Scopes checklist */}
          {renderScopes()}

          {/* Sub tabs: Active Repositories and Audit logs */}
          <div className="border-t border-stone-100 pt-6">
            <div className="flex flex-col sm:flex-row gap-1.5 mb-4 p-1 bg-stone-100 rounded-2xl w-full sm:max-w-md">
              <button
                onClick={() => setActiveSubTab("repos")}
                className={`w-full sm:flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeSubTab === "repos"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 shrink-0" /> Active Repositories ({status.selectedRepos?.length || 0})
              </button>
              <button
                onClick={() => setActiveSubTab("audit")}
                className={`w-full sm:flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeSubTab === "audit"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <Database className="w-3.5 h-3.5 shrink-0" /> Security Audit Log ({auditLogs.length})
              </button>
            </div>

            {activeSubTab === "repos" ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Search your repositories..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto border border-stone-200 rounded-xl divide-y divide-stone-100 bg-white">
                  {filteredRepos.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-400">
                      No repositories found.
                    </div>
                  ) : (
                    filteredRepos.map((repo) => {
                      const isSelected = status.selectedRepos?.includes(repo.fullName);
                      return (
                        <div key={repo.id} className="flex items-center justify-between p-3 gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-stone-800 truncate flex items-center gap-1.5">
                              {repo.fullName}
                              {repo.private && (
                                <span className="text-[9px] font-extrabold uppercase tracking-wide bg-stone-100 text-stone-400 px-1 py-0.5 rounded leading-none border border-stone-200">
                                  Private
                                </span>
                              )}
                            </p>
                            {repo.description && (
                              <p className="text-[10px] text-stone-400 truncate mt-0.5">{repo.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => toggleRepoSelection(repo.fullName)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${
                              isSelected
                                ? "bg-orange-500 text-white shadow-sm"
                                : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100"
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3 h-3" /> Selected
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" /> Select
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[10px] text-stone-400">
                    Transparent history of all API calls executed by this platform using your encrypted token:
                  </p>
                </div>

                <div className="max-h-60 overflow-y-auto border border-stone-200 rounded-xl divide-y divide-stone-100 bg-stone-50 font-mono text-[10px]">
                  {auditLogs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-400 font-sans">
                      No logs available yet.
                    </div>
                  ) : (
                    auditLogs.map((log) => {
                      const isSuccess = log.status >= 200 && log.status < 300;
                      return (
                        <div key={log.id} className="p-2.5 flex items-center justify-between gap-3 bg-white">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1 py-0.5 rounded text-[8px] font-extrabold tracking-wider ${
                                log.actionType === "POST" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-stone-100 text-stone-600"
                              }`}>
                                {log.actionType}
                              </span>
                              <span className="text-stone-700 truncate font-semibold">{log.endpoint}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[9px] text-stone-400 font-sans">
                              <span className="flex items-center gap-0.5">
                                <Calendar className="w-3 h-3 text-stone-300" />
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            isSuccess ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

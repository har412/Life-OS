"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import LandingPage from "@/components/LandingPage";
import {
  getGitHubStatus,
  listIssues,
  createIssue,
} from "@/app/actions/github";
import {
  Terminal,
  FolderGit2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  CheckCircle,
  MessageSquare,
  Clock,
  ExternalLink,
  Mic,
  Square,
  Sparkles,
  ChevronRight,
  Send,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import GitHubConnectPanel from "@/components/GitHubConnectPanel";

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

function getLabelStyle(colorHex: string) {
  const hex = colorHex.toLowerCase().replace("#", "");
  
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  }
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return {
      backgroundColor: "#f5f5f4",
      color: "#44403c",
      borderColor: "#e7e5e4",
    };
  }

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  
  if (yiq > 220) {
    return {
      backgroundColor: "#f5f5f4",
      color: "#1c1917",
      borderColor: "#d6d3d1",
    };
  }
  
  return {
    backgroundColor: `#${hex}15`,
    color: `#${hex}`,
    borderColor: `#${hex}35`,
  };
}

function SearchableRepoSelector({
  options,
  value,
  onChange,
  placeholder = "Select repository...",
  label,
}: {
  options: string[];
  value: string | null;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block px-1">
          {label}
        </label>
      )}
      <div className="relative">
        <FolderGit2 className="w-4 h-4 text-orange-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setSearch("");
          }}
          className="w-full text-left pl-10 pr-10 py-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100/50 text-xs font-extrabold text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all flex items-center justify-between"
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform duration-200 shrink-0 ${isOpen ? "transform rotate-90" : ""}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-stone-200 rounded-2xl shadow-xl z-[999] p-2 animate-in fade-in slide-in-from-top-1 duration-150 flex flex-col gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search active repositories..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-stone-100 bg-stone-50 text-[11px] font-bold text-stone-700 focus:outline-none focus:border-orange-300 focus:bg-white transition-all"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5 pr-1">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-[10px] text-stone-400 font-bold">
                No matching repositories
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt;
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-orange-500 text-white"
                        : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 shrink-0 text-white ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type Issue = {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  labels: { name: string; color: string }[];
  user: {
    login: string;
    avatarUrl: string;
  };
};

export default function DeveloperHubPage() {
  const { status: authStatus } = useSession();
  const [gitStatus, setGitStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeRepo, setActiveRepo] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesFilter, setIssuesFilter] = useState<"open" | "closed" | "all">("open");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Issue Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueBody, setNewIssueBody] = useState("");
  const [newIssueLabels, setNewIssueLabels] = useState<string[]>([]);
  const [newIssueRepo, setNewIssueRepo] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);

  // Voice State
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Developer Hub Integration Status
  const loadIntegration = async () => {
    try {
      const res = await getGitHubStatus();
      setGitStatus(res);
      if (res.connected && !res.expired && res.selectedRepos && res.selectedRepos.length > 0) {
        // Set first repository as active by default
        setActiveRepo(res.selectedRepos[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegration();
  }, []);

  // Fetch issues for the active repository
  const loadIssues = async (repo: string, state: "open" | "closed" | "all") => {
    setIssuesLoading(true);
    try {
      const res = await listIssues(repo, state);
      if (res.success && res.issues) {
        setIssues(res.issues);
      } else {
        toast.error(res.error || "Failed to load issues");
      }
    } catch (err) {
      toast.error("Failed to load issues");
    } finally {
      setIssuesLoading(false);
    }
  };

  useEffect(() => {
    if (activeRepo) {
      loadIssues(activeRepo, issuesFilter);
    }
  }, [activeRepo, issuesFilter]);

  // Handle active timer for recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setAiError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        processAudio(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      toast.error("Microphone access denied. Please allow audio recording permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob);
      const response = await fetch("/api/ai/process-github", { method: "POST", body: formData });
      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || "Failed to process voice bug report.");
      }

      const resData = await response.json();
      setTranscript(resData.transcript);
      
      if (resData.draft) {
        const draft = resData.draft;
        setNewIssueTitle(draft.title || "");
        setNewIssueBody(draft.body || "");
        setNewIssueLabels(draft.labels || []);
        
        // Match targeted repository dynamically
        if (draft.targetRepo && gitStatus?.selectedRepos?.includes(draft.targetRepo)) {
          setNewIssueRepo(draft.targetRepo);
        } else if (activeRepo) {
          setNewIssueRepo(activeRepo);
        } else if (gitStatus?.selectedRepos?.length > 0) {
          setNewIssueRepo(gitStatus.selectedRepos[0]);
        }

        setShowVoiceModal(false);
        setShowCreateModal(true);
        toast.success("AI dynamically generated your GitHub issue draft!");
      }
    } catch (err: any) {
      setAiError(err.message || "Speech synthesis analysis failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueRepo) {
      toast.error("Please select a target repository.");
      return;
    }
    if (!newIssueTitle.trim()) {
      toast.error("Please enter a title.");
      return;
    }

    setSubmittingIssue(true);
    try {
      const res = await createIssue(newIssueRepo, newIssueTitle, newIssueBody, newIssueLabels);
      if (res.success) {
        toast.success(`Issue #${res.issueNumber} successfully created on GitHub!`);
        setShowCreateModal(false);
        setNewIssueTitle("");
        setNewIssueBody("");
        setNewIssueLabels([]);
        
        if (newIssueRepo === activeRepo) {
          loadIssues(activeRepo, issuesFilter);
        } else {
          setActiveRepo(newIssueRepo);
        }
      } else {
        toast.error(res.error || "Failed to create issue");
      }
    } catch (err) {
      toast.error("Failed to submit issue");
    } finally {
      setSubmittingIssue(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const filteredIssues = issues.filter(
    (issue) =>
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.number.toString().includes(searchQuery)
  );

  if (authStatus === "unauthenticated") return <LandingPage />;
  if (loading) return <div className="p-8 text-center text-stone-500">Loading Developer Hub...</div>;

  return (
    <div className="bg-[#fffcf9] min-h-screen flex flex-col">
      {/* Dynamic SEO Tags */}
      <title>Developer Hub — Life OS</title>
      <meta name="description" content="Securely inspect scopes, view issues, and issue voice bug-reports on GitHub." />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 lg:px-8 py-6 flex flex-col gap-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
              <Terminal className="w-6 h-6 text-orange-500" /> Developer Hub
            </h1>
            <p className="text-sm text-stone-500">
              Direct GitHub integration to track development updates, review code issues, and submit logs.
            </p>
          </div>

          {gitStatus?.connected && !gitStatus?.expired && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setNewIssueTitle("");
                  setNewIssueBody("");
                  setNewIssueLabels([]);
                  setNewIssueRepo(activeRepo || gitStatus.selectedRepos?.[0] || "");
                  setShowCreateModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-100 flex items-center gap-1.5 transition-all"
                id="btn-new-issue"
              >
                <Plus className="w-4 h-4" /> New Issue
              </button>

              <button
                onClick={() => setShowVoiceModal(true)}
                className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                id="btn-voice-issue"
              >
                <Mic className="w-4 h-4" /> Voice Report
              </button>
            </div>
          )}
        </div>

        {/* Content Pane */}
        {!gitStatus?.connected || gitStatus?.expired ? (
          <div className="max-w-2xl mx-auto w-full mt-4">
            <GitHubConnectPanel />
          </div>
        ) : gitStatus.selectedRepos?.length === 0 ? (
          <div className="border border-stone-200 bg-white rounded-2xl p-12 text-center max-w-xl mx-auto mt-8 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center text-orange-500 mx-auto mb-6">
              <FolderGit2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">No Repositories Selected</h3>
            <p className="text-sm text-stone-500 mt-2 mb-6">
              Your account is successfully connected, but you haven't enabled any repositories yet in your settings.
            </p>
            <a
              href="/settings"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-100 transition-colors"
            >
              Select Repositories in Settings <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[500px]">
            {/* Left Repository Sidebar - Desktop Only */}
            <div className="hidden lg:flex lg:w-72 shrink-0 flex-col gap-4">
              <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">
                  Active Repositories
                </h3>
                <div className="flex flex-col gap-1">
                  {gitStatus.selectedRepos.map((repo: string) => {
                    const isActive = activeRepo === repo;
                    return (
                      <button
                        key={repo}
                        onClick={() => setActiveRepo(repo)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                          isActive
                            ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                            : "text-stone-700 hover:bg-stone-50"
                        }`}
                      >
                        <span className="truncate">{repo}</span>
                        {isActive && <CheckCircle className="w-4 h-4 shrink-0 text-white ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile Repository Selector - Hidden on Desktop */}
            <div className="lg:hidden w-full shrink-0">
              <SearchableRepoSelector
                options={gitStatus.selectedRepos}
                value={activeRepo}
                onChange={(val) => setActiveRepo(val)}
                label="Select Repository"
              />
            </div>

            {/* Right Issues List explorer */}
            <div className="flex-1 bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {/* Filter and search bar */}
              <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center gap-3 bg-stone-50/50">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search issues by title or number..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <Filter className="w-3.5 h-3.5 text-stone-400" />
                  <div className="flex p-0.5 bg-white border border-stone-200 rounded-lg flex-1 sm:flex-none">
                    {(["open", "closed", "all"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setIssuesFilter(opt)}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all capitalize ${
                          issuesFilter === opt
                            ? "bg-orange-500 text-white shadow-sm"
                            : "text-stone-500 hover:text-stone-800"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto min-h-[300px]">
                {issuesLoading ? (
                  <div className="p-12 text-center text-xs text-stone-400 flex flex-col items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    Loading issues from GitHub...
                  </div>
                ) : filteredIssues.length === 0 ? (
                  <div className="p-12 text-center text-xs text-stone-400 flex flex-col items-center justify-center gap-2">
                    <MessageSquare className="w-8 h-8 text-stone-300" />
                    No issues found matching your filters.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {filteredIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="p-4 hover:bg-stone-50/50 transition-colors flex items-start gap-3"
                      >
                        {/* Reporter Avatar */}
                        {issue.user.avatarUrl ? (
                          <img
                            src={issue.user.avatarUrl}
                            alt={issue.user.login}
                            className="w-8 h-8 rounded-lg border border-stone-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-stone-600">
                              {issue.user.login[0].toUpperCase()}
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <h4 className="text-xs font-bold text-stone-800 hover:text-orange-600 transition-colors truncate">
                              <a href={issue.htmlUrl} target="_blank" rel="noopener noreferrer">
                                {issue.title}
                              </a>
                            </h4>
                            <span className="text-[10px] text-stone-400 shrink-0">#{issue.number}</span>
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-400">
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3 text-stone-300" />
                              {new Date(issue.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span>·</span>
                            <span className="font-semibold text-stone-500">@{issue.user.login}</span>

                            {issue.labels?.length > 0 && (
                              <>
                                <span>·</span>
                                <div className="flex gap-1">
                                  {issue.labels.map((l) => {
                                    const style = getLabelStyle(l.color);
                                    return (
                                      <span
                                        key={l.name}
                                        className="px-1.5 py-0.5 rounded text-[8px] font-bold border"
                                        style={style}
                                      >
                                        {l.name}
                                      </span>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <a
                          href={issue.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-stone-300 hover:text-stone-600 hover:bg-stone-100 shrink-0 transition-all ml-2"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Voice bug reporter Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowVoiceModal(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-stone-100 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-100">
                  <Mic className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-stone-900 tracking-tight">AI Voice Reporter</h2>
              </div>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col items-center justify-center py-10 px-8 text-center min-h-[300px]">
                {isProcessing ? (
                  <div className="flex flex-col items-center animate-in fade-in duration-500">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 border-4 border-orange-50 rounded-full" />
                      <div className="absolute inset-0 w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto w-7 h-7 text-orange-500 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-stone-900">AI is Drafting Issue...</h3>
                    <p className="text-xs text-stone-400 mt-2">Transcribing and designing templates dynamically</p>
                  </div>
                ) : (
                  <>
                    <div
                      className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 mb-6 ${
                        isRecording ? "bg-orange-500 scale-105 shadow-xl shadow-orange-100" : "bg-orange-50"
                      }`}
                    >
                      {isRecording ? <Square className="w-8 h-8 text-white" /> : <Mic className="w-9 h-9 text-orange-500" />}
                    </div>

                    <h3 className="text-xl font-bold text-stone-900 tracking-tight">
                      {isRecording ? "Listening..." : "Report GitHub Issue"}
                    </h3>
                    <p className="mt-2 text-xs text-stone-500 max-w-[280px] mx-auto leading-relaxed">
                      {isRecording
                        ? "State your bug details or enhancement request. Mention the repository name so AI can map it."
                        : "Speak out your issue naturally (e.g. 'Create an issue in Life OS...'). The AI will draft the rest."}
                    </p>

                    {aiError && (
                      <div className="mt-6 p-3 rounded-xl bg-red-50 border border-red-100 text-[11px] text-red-600 font-medium animate-in fade-in zoom-in-95 duration-300">
                        <p className="flex items-center justify-center gap-1.5">
                          <span className="text-base">⚠️</span> {aiError}
                        </p>
                      </div>
                    )}

                    {isRecording && (
                      <div className="mt-6 font-mono text-2xl font-bold text-stone-900">
                        {formatTime(recordingTime)}
                      </div>
                    )}

                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`mt-10 px-10 py-3 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-95 ${
                        isRecording ? "bg-stone-900 text-white shadow-stone-200" : "bg-orange-500 text-white shadow-orange-100"
                      }`}
                    >
                      {isRecording ? "Stop Recording" : "Start Recording"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Structured Create Issue Modal / Review Overlays */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white border border-stone-200 rounded-3xl shadow-2xl w-full max-w-xl p-6 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" /> Review GitHub Issue Draft
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <SearchableRepoSelector
                  options={gitStatus.selectedRepos}
                  value={newIssueRepo}
                  onChange={(val) => setNewIssueRepo(val)}
                  label="Target Repository"
                  placeholder="Select target repository..."
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 block px-1">
                  Issue Title
                </label>
                <input
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  placeholder="Issue title..."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 block px-1">
                  Issue Body (Markdown)
                </label>
                <textarea
                  value={newIssueBody}
                  onChange={(e) => setNewIssueBody(e.target.value)}
                  placeholder="Detailed description..."
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-xs font-medium text-stone-900 placeholder-stone-300 focus:outline-none focus:bg-white transition-all font-mono resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 block px-1">
                  Suggested Labels
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {["bug", "enhancement", "documentation", "question"].map((lbl) => {
                    const isSelected = newIssueLabels.includes(lbl);
                    return (
                      <button
                        type="button"
                        key={lbl}
                        onClick={() => {
                          setNewIssueLabels((prev) =>
                            isSelected ? prev.filter((x) => x !== lbl) : [...prev, lbl]
                          );
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                          isSelected
                            ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                            : "bg-white text-stone-500 border-stone-200 hover:border-orange-200"
                        }`}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full sm:flex-1 py-3 rounded-xl border border-stone-200 text-xs font-bold text-stone-500 hover:bg-stone-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIssue}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white shadow-lg shadow-orange-100 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  {submittingIssue ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating issue...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Submit Issue to GitHub
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

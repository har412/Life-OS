"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import LandingPage from "@/components/LandingPage";
import {
  getGitHubStatus,
  listIssues,
  createIssue,
} from "@/app/actions/github";
import { getSSHCredential, readWorkspaceFile, listWorkspaceArtifacts } from "@/app/actions/ssh";
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
  Loader2,
  Play,
  Trash2,
  Power,
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

function cleanAndFormatText(text: string) {
  if (!text) return "";

  // 1. Process character-by-character terminal emulation for absolute cursor mapping,
  // carriage returns, backspaces, screen clearing, and cursor movements.
  let lines: string[] = [""];
  let cursorX = 0;
  let cursorY = 0;

  let i = 0;
  while (i < text.length) {
    const char = text[i];

    if (char === "\n") {
      cursorY++;
      if (cursorY >= lines.length) {
        lines.push("");
      }
      cursorX = 0; // Standard terminal behavior: LF should be accompanied by CR, or move straight down
      i++;
    } else if (char === "\r") {
      cursorX = 0;
      i++;
    } else if (char === "\b") {
      if (cursorX > 0) {
        cursorX--;
        const currentLine = lines[cursorY] || "";
        lines[cursorY] = currentLine.slice(0, cursorX) + currentLine.slice(cursorX + 1);
      }
      i++;
    } else if (text.slice(i).startsWith("\u001b") || text.slice(i).startsWith("\u009b")) {
      // Find end of ANSI escape sequence (usually a character between 'A' and 'Z' or 'a' and 'z')
      let endIdx = i + 1;
      while (endIdx < text.length) {
        const c = text[endIdx];
        if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")) {
          break;
        }
        endIdx++;
      }
      const seq = text.slice(i, endIdx + 1);

      // Extract numeric parameters if any
      const matchNumbers = seq.match(/\d+/g);
      const firstNum = matchNumbers && matchNumbers[0] ? parseInt(matchNumbers[0]) : null;

      if (seq.endsWith("K")) {
        // Clear line (EL - Erase in Line)
        const currentLine = lines[cursorY] || "";
        if (firstNum === 1) {
          // Clear from beginning of line to cursor
          lines[cursorY] = " ".repeat(cursorX) + currentLine.slice(cursorX);
        } else if (firstNum === 2) {
          // Clear entire line
          lines[cursorY] = "";
        } else {
          // Clear from cursor to end of line
          lines[cursorY] = currentLine.slice(0, cursorX);
        }
      } else if (seq.endsWith("J")) {
        // Clear screen (ED - Erase in Display)
        if (firstNum === 2) {
          // Clear entire screen & home cursor
          lines = [""];
          cursorX = 0;
          cursorY = 0;
        } else if (firstNum === 1) {
          // Clear from beginning of screen to cursor
          for (let r = 0; r < cursorY; r++) {
            lines[r] = "";
          }
          lines[cursorY] = " ".repeat(cursorX) + (lines[cursorY] || "").slice(cursorX);
        } else {
          // Clear from cursor to end of screen
          if (lines[cursorY]) {
            lines[cursorY] = lines[cursorY].slice(0, cursorX);
          }
          lines.splice(cursorY + 1);
        }
      } else if (seq.endsWith("H") || seq.endsWith("f")) {
        // Absolute Cursor Position (CUP / HVP)
        const matchPos = seq.match(/\[(\d*);(\d*)/);
        if (matchPos) {
          const row = matchPos[1] ? parseInt(matchPos[1]) - 1 : 0;
          const col = matchPos[2] ? parseInt(matchPos[2]) - 1 : 0;
          cursorY = Math.max(0, row);
          while (lines.length <= cursorY) {
            lines.push("");
          }
          cursorX = Math.max(0, col);
        } else {
          cursorY = 0;
          cursorX = 0;
        }
      } else if (seq.endsWith("A")) {
        // Cursor Up (CUU)
        const count = firstNum !== null ? firstNum : 1;
        cursorY = Math.max(0, cursorY - count);
        cursorX = Math.min(cursorX, (lines[cursorY] || "").length);
      } else if (seq.endsWith("B")) {
        // Cursor Down (CUD)
        const count = firstNum !== null ? firstNum : 1;
        while (lines.length <= cursorY + count) {
          lines.push("");
        }
        cursorY += count;
        cursorX = Math.min(cursorX, (lines[cursorY] || "").length);
      } else if (seq.endsWith("C")) {
        // Cursor Forward (CUF)
        const count = firstNum !== null ? firstNum : 1;
        cursorX += count;
      } else if (seq.endsWith("D")) {
        // Cursor Backward (CUB)
        const count = firstNum !== null ? firstNum : 1;
        cursorX = Math.max(0, cursorX - count);
      } else if (seq.endsWith("E")) {
        // Cursor Next Line (CNL)
        const count = firstNum !== null ? firstNum : 1;
        while (lines.length <= cursorY + count) {
          lines.push("");
        }
        cursorY += count;
        cursorX = 0;
      } else if (seq.endsWith("F")) {
        // Cursor Previous Line (CPL)
        const count = firstNum !== null ? firstNum : 1;
        cursorY = Math.max(0, cursorY - count);
        cursorX = 0;
      } else if (seq.endsWith("G")) {
        // Cursor Horizontal Absolute (CHA)
        const col = firstNum !== null ? firstNum - 1 : 0;
        cursorX = Math.max(0, col);
      }

      i = endIdx + 1;
    } else {
      // Regular printable character
      let currentLine = lines[cursorY] || "";
      if (cursorX > currentLine.length) {
        currentLine = currentLine.padEnd(cursorX, " ");
      }
      lines[cursorY] = currentLine.slice(0, cursorX) + char + currentLine.slice(cursorX + 1);
      cursorX++;
      i++;
    }
  }

  // 2. Scan lines for URLs and format pretty Clickable links
  const urlRegex = /(https?:\/\/[^\s\r\n]+)/g;

  return (
    <div className="space-y-0.5">
      {lines.map((line, lineIdx) => {
        // Clean leftover control characters
        const cleanLine = line.replace(/[\r\b]/g, "").trimEnd();

        // Skip trailing empty lines
        if (!cleanLine && lineIdx === lines.length - 1) return null;

        const trimmed = cleanLine.trim();

        // Console Noise Filtering: Filter out interactive agent prompt and selection boilerplates
        const isNoise = [
          /esc to cancel/i,
          /Gemini\s+(?:3\.5|1\.5|1\.0)?\s*(?:Flash|Pro)?\s*\(Medium\)/i,
          /Gemini\s+(?:3\.5|1\.5|1\.0)?\s*(?:Flash|Pro)?/i,
          /↑\/↓\s+Navigate/i,
          /Navigate\s+·\s+tab\s+Amend/i,
          /e\s+edit\s+command/i,
          /Yes,\s+and\s+always\s+allow/i,
          /Persist\s+to\s+settings\.json/i,
          /^\d+\.\s*Yes/i,
          /^\d+\.\s*No/i,
          /^Yes$/i,
          /^No$/i,
          /^\?.*?Yes/i,
          /^\?.*?No/i
        ].some(regex => regex.test(trimmed));

        if (isNoise) return null;

        // Compress excessive consecutive empty lines inside terminal scroll logs
        if (!cleanLine) {
          const prevLine = lineIdx > 0 ? lines[lineIdx - 1].replace(/[\r\b]/g, "").trimEnd() : null;
          if (!prevLine) return null;
        }

        const parts = cleanLine.split(urlRegex);

        return (
          <div key={lineIdx} className="min-h-[1.1rem] whitespace-pre-wrap break-all">
            {parts.map((part, partIdx) => {
              if (part.match(urlRegex)) {
                return (
                  <span key={partIdx} className="block my-2.5 max-w-full">
                    <a
                      href={part}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 underline font-bold cursor-pointer bg-orange-500/10 hover:bg-orange-500/20 px-4 py-2.5 rounded-xl border border-orange-500/30 hover:border-orange-500/50 transition-all font-sans text-xs shadow-sm shadow-orange-950/20 select-none"
                    >
                      🚀 Click to Log In & Authenticate Antigravity
                    </a>
                    <span className="block text-[10px] text-stone-500 mt-1 select-all break-all font-mono opacity-80 border-t border-stone-800/40 pt-1">
                      {part}
                    </span>
                  </span>
                );
              }
              return part;
            })}
          </div>
        );
      })}
    </div>
  );
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
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${isSelected
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

  // SSH Agent Hub State
  const [explorerTab, setExplorerTab] = useState<"issues" | "ssh-agent">("issues");
  const [activeSSHIssue, setActiveSSHIssue] = useState<Issue | null>(null);
  const [sshLogs, setSshLogs] = useState<{ type: "stdout" | "stderr" | "system"; text: string; timestamp: string }[]>([]);
  const [sshPrompt, setSshPrompt] = useState("");
  const [sshRunning, setSshRunning] = useState(false);
  const [hasSSHCredential, setHasSSHCredential] = useState(false);
  const [projectPaths, setProjectPaths] = useState<string[]>([]);
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(null);
  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const [artifactsList, setArtifactsList] = useState<any[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<{ name: string; fullPath: string; content: string } | null>(null);
  const [isReviewingOpen, setIsReviewingOpen] = useState(false);
  const [isArtifactsLoading, setIsArtifactsLoading] = useState(false);
  const toastedArtifacts = useRef<Set<string>>(new Set());

  // Scroll to bottom of terminal only if user is near bottom or ran a command
  useEffect(() => {
    const container = terminalScrollRef.current;
    if (!container) return;

    // Check if the user is already near the bottom (within a 100px threshold)
    const threshold = 100;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    const lastLog = sshLogs[sshLogs.length - 1];
    const isSystemCommand = lastLog?.type === "system";

    if (isNearBottom || isSystemCommand || sshLogs.length <= 1) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [sshLogs]);

  // Load Developer Hub Integration Status
  const loadIntegration = async () => {
    try {
      const res = await getGitHubStatus();
      setGitStatus(res);
      if (res.connected && !res.expired && res.selectedRepos && res.selectedRepos.length > 0) {
        setActiveRepo(res.selectedRepos[0]);
      }

      // Check SSH Credentials Setup
      const sshRes = await getSSHCredential();
      if (sshRes.success && sshRes.credential) {
        setHasSSHCredential(true);
        const raw = sshRes.credential.projectPaths || "";
        const parsedPaths = raw ? raw.split(";").filter(Boolean) : [];
        setProjectPaths(parsedPaths);
        if (parsedPaths.length > 0 && !selectedProjectPath) {
          setSelectedProjectPath(parsedPaths[0]);
        }
      } else {
        setHasSSHCredential(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runSSHCommand = async (customPrompt?: string) => {
    const promptToSend = customPrompt || sshPrompt;
    if (!promptToSend.trim()) return;

    setSshRunning(true);
    setSshPrompt("");

    // Append user query to logs
    const userLog = {
      type: "system" as const,
      text: `$ ${promptToSend}`,
      timestamp: new Date().toISOString(),
    };
    setSshLogs((prev) => [...prev, userLog]);

    try {
      const response = await fetch("/api/developer/ssh-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          projectPath: selectedProjectPath,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to execute SSH command");
      }

      if (!response.body) {
        throw new Error("Readable stream not available");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const appendLog = (logObj: { type: "stdout" | "stderr" | "system"; text: string; timestamp?: string }) => {
        setSshLogs((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].type === logObj.type && logObj.type !== "system") {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              text: updated[updated.length - 1].text + logObj.text,
            };
            return updated;
          }
          return [...prev, { ...logObj, timestamp: logObj.timestamp || new Date().toISOString() }];
        });
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const logObj = JSON.parse(line);
            appendLog(logObj);
          } catch (e) {
            appendLog({ type: "stdout", text: line });
          }
        }
      }

      if (buffer.trim()) {
        try {
          const logObj = JSON.parse(buffer);
          appendLog(logObj);
        } catch (e) {
          appendLog({ type: "stdout", text: buffer });
        }
      }
    } catch (err: any) {
      setSshLogs((prev) => [
        ...prev,
        {
          type: "stderr",
          text: `❌ Remote execution failed: ${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      toast.error(err.message || "Execution failed");
    } finally {
      setSshRunning(false);
    }
  };

  const sendSSHInput = async (customInput?: string) => {
    const inputToSend = customInput !== undefined ? customInput : sshPrompt;
    if (customInput === undefined && !inputToSend.trim()) return;

    if (customInput === undefined) {
      setSshPrompt("");
    }

    try {
      const response = await fetch("/api/developer/ssh-input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: inputToSend }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to send SSH input");
      }
    } catch (err: any) {
      setSshRunning(false);
      setSshLogs((prev) => [
        ...prev,
        {
          type: "stderr",
          text: `❌ Failed to send input: ${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const reconnectSession = async () => {
    try {
      const response = await fetch("/api/developer/ssh-run", {
        method: "GET",
      });

      if (!response.ok) return;

      const contentType = response.headers.get("Content-Type") || "";
      if (!contentType.includes("application/x-ndjson")) {
        setSshRunning(false);
        return;
      }

      if (!response.body) return;

      setSshRunning(true);
      setSshLogs([]); // Clear local logs to display buffer history

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const appendLog = (logObj: {
        type: "stdout" | "stderr" | "system";
        text: string;
        timestamp?: string;
        reconnected?: boolean;
        projectPath?: string;
        prompt?: string;
      }) => {
        if (logObj.reconnected) {
          if (logObj.projectPath) {
            setSelectedProjectPath(logObj.projectPath);
          }
          return;
        }

        setSshLogs((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].type === logObj.type && logObj.type !== "system") {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              text: updated[updated.length - 1].text + logObj.text,
            };
            return updated;
          }
          return [...prev, { ...logObj, timestamp: logObj.timestamp || new Date().toISOString() }];
        });
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const logObj = JSON.parse(line);
            appendLog(logObj);
          } catch (e) {
            appendLog({ type: "stdout", text: line });
          }
        }
      }

      if (buffer.trim()) {
        try {
          const logObj = JSON.parse(buffer);
          appendLog(logObj);
        } catch (e) {
          appendLog({ type: "stdout", text: buffer });
        }
      }
    } catch (err: any) {
      console.error("Failed to reconnect terminal session:", err);
    } finally {
      setSshRunning(false);
    }
  };

  const terminateSession = async () => {
    try {
      const response = await fetch("/api/developer/ssh-run", {
        method: "DELETE",
      });
      if (response.ok) {
        setSshLogs([]);
        setSshRunning(false);
        toast.success("Terminal session terminated.");
      } else {
        toast.error("Failed to terminate session.");
      }
    } catch (err: any) {
      toast.error("Failed to terminate session: " + err.message);
    }
  };

  const loadArtifacts = async () => {
    if (!selectedProjectPath) return;
    setIsArtifactsLoading(true);
    try {
      const res = await listWorkspaceArtifacts(selectedProjectPath);
      if (res.success && res.artifacts) {
        setArtifactsList(res.artifacts);
      }
    } catch (err) {
      console.error("Failed to load workspace artifacts:", err);
    } finally {
      setIsArtifactsLoading(false);
    }
  };

  const handleSelectArtifact = async (artifact: any) => {
    try {
      setSelectedArtifact(null);
      setIsReviewingOpen(true);
      const res = await readWorkspaceFile(artifact.fullPath);
      if (res.success && res.content) {
        setSelectedArtifact({
          name: artifact.name,
          fullPath: artifact.fullPath,
          content: res.content,
        });
      } else {
        toast.error("Failed to read artifact content: " + res.error);
      }
    } catch (err: any) {
      toast.error("Error reading artifact: " + err.message);
    }
  };

  const handleApproveArtifact = () => {
    sendSSHInput("1");
    setIsReviewingOpen(false);
    setSelectedArtifact(null);
    toast.success(`Artifact "${selectedArtifact?.name}" approved! Resuming execution...`);
  };

  useEffect(() => {
    if (selectedProjectPath) {
      loadArtifacts();
    }
  }, [selectedProjectPath, sshRunning]);

  useEffect(() => {
    if (explorerTab === "ssh-agent" && hasSSHCredential) {
      reconnectSession();
    }
  }, [explorerTab, hasSSHCredential]);

  // Monitor logs to automatically pop up toasts for artifacts or permissions
  useEffect(() => {
    if (sshLogs.length === 0) return;
    const lastLog = sshLogs[sshLogs.length - 1];
    if (lastLog.type === "stdout" || lastLog.type === "system") {
      const match = lastLog.text.match(/\[ARTIFACT:\s*([^\]\s]+)\]/i);
      if (match && match[1]) {
        const artifactName = match[1];
        if (!toastedArtifacts.current.has(artifactName)) {
          toastedArtifacts.current.add(artifactName);
          loadArtifacts().then(() => {
            toast.info(`✨ New Artifact Available: ${artifactName}`, {
              action: {
                label: "Review",
                onClick: () => {
                  const found = artifactsList.find(a => a.name.toLowerCase().includes(artifactName.toLowerCase()));
                  if (found) {
                    handleSelectArtifact(found);
                  } else {
                    const tempArtifact = { name: artifactName, fullPath: `${selectedProjectPath}\\artifacts\\${artifactName}` };
                    handleSelectArtifact(tempArtifact);
                  }
                }
              },
              duration: 12000,
            });
          });
        }
      }
    }
  }, [sshLogs, artifactsList]);


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

  const cleanVoiceCommand = (text: string): string => {
    let cleaned = text.trim();

    // Remove trailing period if transcribed as a sentence
    if (cleaned.endsWith(".")) {
      cleaned = cleaned.slice(0, -1).trim();
    }

    // Strip common conversational terminal wrappers
    const patterns = [
      /^(?:please\s+)?run\s+command\s+/i,
      /^(?:please\s+)?run\s+/i,
      /^(?:please\s+)?execute\s+command\s+/i,
      /^(?:please\s+)?execute\s+/i,
      /^(?:please\s+)?check\s+command\s+/i,
      /^(?:please\s+)?check\s+/i,
      /^(?:please\s+)?can\s+you\s+run\s+/i,
      /^(?:please\s+)?can\s+you\s+execute\s+/i,
      /^(?:please\s+)?can\s+you\s+check\s+/i,
      /^ssh\s+run\s+/i,
      /^ssh\s+/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, "").trim();
        break;
      }
    }

    return cleaned;
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

      if (explorerTab === "ssh-agent") {
        setShowVoiceModal(false);
        const cleanedCmd = cleanVoiceCommand(resData.transcript);
        
        if (sshRunning) {
          // If a command/process is already active (like `agy`), send the input directly to the active stdin session
          sendSSHInput(cleanedCmd);
          toast.success("Voice input sent to active SSH PTY shell!");
        } else {
          // Otherwise, start/run a brand new command
          setSshPrompt(cleanedCmd);
          runSSHCommand(cleanedCmd);
          toast.success("Voice prompt executed in SSH Agent Tunnel!");
        }
        return;
      }

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

      <main className="flex-1 max-w-[1800px] w-full mx-auto px-4 lg:px-8 py-6 flex flex-col gap-6">
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
          <div className="flex-1 flex flex-col lg:flex-row gap-6">
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
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${isActive
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

            {/* Right Issues Explorer Panel with Bounded Mobile Heights */}
            <div className="flex-1 bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)] lg:h-[calc(100vh-180px)] min-h-[520px] lg:min-h-[750px]">

              {/* Premium Tab Selector for GitHub Issues vs Interactive SSH Agent Hub */}
              <div className="flex bg-stone-50/70 p-1 gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setExplorerTab("issues")}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${explorerTab === "issues"
                      ? "bg-white text-orange-600 shadow-sm border border-stone-200/50"
                      : "text-stone-500 hover:text-stone-700 hover:bg-stone-100/50"
                    }`}
                >
                  <FolderGit2 className="w-4 h-4" /> GitHub Issues
                </button>
                <button
                  type="button"
                  onClick={() => setExplorerTab("ssh-agent")}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${explorerTab === "ssh-agent"
                      ? "bg-white text-orange-600 shadow-sm border border-stone-200/50"
                      : "text-stone-500 hover:text-stone-700 hover:bg-stone-100/50"
                    }`}
                >
                  <Terminal className="w-4 h-4" /> Interactive Agent Hub
                  {activeSSHIssue && (
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                  )}
                </button>
              </div>

              {explorerTab === "ssh-agent" ? (
                <div className="flex-1 flex flex-col overflow-hidden bg-stone-900 text-stone-100 font-sans">

                  {/* Active Context Banner with Session Controls & Artifact Drawer Access */}
                  <div className="p-3 bg-stone-900 border-b border-stone-800 flex items-center justify-between gap-3 text-xs shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {activeSSHIssue ? (
                        <div className="flex items-center gap-1.5 text-orange-400 font-semibold truncate">
                          <span className="flex h-2 w-2 relative shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                          </span>
                          <span className="truncate text-[11px]">
                            Context: <span className="font-extrabold text-stone-100">Issue #{activeSSHIssue.number}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-stone-400 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-stone-600" />
                          <span className="text-[11px] truncate">Direct Tunnel Mode</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {activeSSHIssue && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSSHIssue(null);
                            toast.success("Active context cleared.");
                          }}
                          className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-705 text-[10px] font-bold text-stone-300 transition-colors cursor-pointer border border-stone-750"
                        >
                          Clear Context
                        </button>
                      )}

                      {selectedProjectPath && (
                        <button
                          type="button"
                          onClick={() => {
                            loadArtifacts();
                            setIsReviewingOpen(true);
                          }}
                          className="px-2.5 py-1 rounded bg-orange-500/10 hover:bg-orange-500 hover:text-white border border-orange-500/20 text-orange-400 text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 animate-pulse"
                        >
                          📁 Review Artifacts {artifactsList.length > 0 && `(${artifactsList.length})`}
                        </button>
                      )}

                      {sshRunning && (
                        <button
                          type="button"
                          onClick={terminateSession}
                          className="px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500 border border-red-500/35 hover:border-red-500 text-red-400 hover:text-white text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Terminate active process"
                        >
                          <Power className="w-3 h-3 animate-spin duration-1000" /> Kill Shell
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Project Workspace Selector */}
                  {hasSSHCredential && projectPaths.length > 0 && (
                    <div className="px-3 py-2 bg-stone-900 border-b border-stone-800 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-hide">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest shrink-0">Workspace:</span>
                      {projectPaths.map((path) => {
                        const label = path.split(/[\\/]/).filter(Boolean).pop() || path;
                        const isActive = selectedProjectPath === path;
                        return (
                          <button
                            key={path}
                            type="button"
                            onClick={() => setSelectedProjectPath(path)}
                            title={path}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${isActive
                                ? "bg-orange-500 text-white shadow-sm shadow-orange-900"
                                : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
                              }`}
                          >
                            📁 {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {hasSSHCredential && projectPaths.length === 0 && (
                    <div className="px-3 py-2 bg-stone-900 border-b border-stone-800 flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-stone-500 font-semibold">No project workspaces configured.</span>
                      <a href="/settings" className="text-[10px] text-orange-400 font-bold hover:underline">Add paths in Settings →</a>
                    </div>
                  )}

                  {/* Not Configured Alert */}
                  {!hasSSHCredential ? (
                    <div className="flex-1 p-8 flex flex-col items-center justify-center text-center gap-4 bg-stone-950/80">
                      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 mb-2">
                        <AlertCircle className="w-7 h-7" />
                      </div>
                      <h3 className="text-base font-bold text-stone-100">SSH Tunnel Credentials Required</h3>
                      <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
                        To run local development commands from this portal, you must first configure your SSH host, username, and password or private keys in settings.
                      </p>
                      <a
                        href="/settings"
                        className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-950/50 transition-colors flex items-center gap-1.5 cursor-pointer mt-2"
                      >
                        Configure SSH in Settings <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    <>
                      {/* Shell Output Console with Custom Bounded Scrolling & Touch Optimization */}
                      <div
                        ref={terminalScrollRef}
                        className="flex-1 p-3.5 sm:p-4 overflow-y-auto font-mono text-[10px] sm:text-[11px] leading-relaxed space-y-2.5 bg-stone-950 scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-stone-950 overscroll-contain"
                      >
                        {sshLogs.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 gap-2 py-12 my-auto">
                            <Terminal className="w-8 h-8 text-stone-700 animate-pulse" />
                            <p className="font-bold text-stone-400">Remote Console Connected</p>
                            <p className="text-[10px] text-stone-500 font-sans max-w-[280px]">
                              Type standard instruction prompts or use the voice FAB below to dispatch tasks directly into the Antigravity CLI.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {sshLogs.map((log, idx) => {
                              let textClass = "text-stone-300";
                              if (log.type === "system") {
                                textClass = "text-orange-400 font-bold border-l-2 border-orange-500/40 pl-2 py-0.5 bg-orange-500/5 my-1.5";
                              } else if (log.type === "stderr") {
                                textClass = "text-red-400 border-l-2 border-red-500/40 pl-2";
                              } else {
                                textClass = "text-stone-300 whitespace-pre-wrap break-all";
                              }

                              return (
                                <div key={idx} className={textClass}>
                                  {cleanAndFormatText(log.text)}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      {/* Interactive Permission Selector - Shows only when prompt matches */}
                      {(() => {
                        const lastLogText = sshLogs.length > 0 ? sshLogs[sshLogs.length - 1].text : "";
                        const isProceedPrompt = /do you want to proceed|requesting permission|press.*key|confirm/i.test(lastLogText);
                        if (!isProceedPrompt) return null;
                        return (
                          <div className="px-4 py-2.5 bg-orange-950/60 border-t border-orange-500/20 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center gap-2 text-orange-400 font-bold">
                              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                              <span>Prompt Detected: Confirm or cancel request?</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => sendSSHInput("1")}
                                className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-orange-950"
                              >
                                Confirm (1)
                              </button>
                              <button
                                type="button"
                                onClick={() => sendSSHInput("4")}
                                className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Cancel (4)
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Console Action Bar - Fixed Height Pinned at Bottom */}
                      <div className="p-3 bg-stone-900 border-t border-stone-800 flex items-center gap-2 shrink-0">
                        {/* Terminal heartbeat status */}
                        {sshRunning && (
                          <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1.5 rounded-lg text-emerald-400 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span className="hidden sm:inline">PTY SHELL ACTIVE</span>
                          </div>
                        )}

                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={sshPrompt}
                            onChange={(e) => setSshPrompt(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (sshRunning) {
                                  sendSSHInput();
                                } else {
                                  runSSHCommand();
                                }
                              }
                            }}
                            placeholder={sshRunning ? "Active Shell: Type input..." : "Type command (e.g. dir, agy)..."}
                            className="w-full pl-3 pr-9 py-2 rounded-xl border border-stone-800 bg-stone-950 text-base sm:text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-orange-500 transition-all font-mono shadow-inner shadow-black/40"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (isRecording) {
                                stopRecording();
                              } else {
                                startRecording();
                              }
                            }}
                            className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-stone-500 hover:text-stone-300 transition-all cursor-pointer ${isRecording ? "text-orange-500 animate-pulse bg-orange-500/10" : ""
                              }`}
                          >
                            <Mic className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {sshRunning && (
                          <button
                            type="button"
                            onClick={() => sendSSHInput("ctrl+c")}
                            className="px-2.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                            title="Send Ctrl+C"
                          >
                            <span className="font-mono text-[9px]">Ctrl+C</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (sshRunning) {
                              sendSSHInput();
                            } else {
                              runSSHCommand();
                            }
                          }}
                          disabled={!sshPrompt.trim()}
                          className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-950/50 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Send className="w-3 h-3" />
                          <span>{sshRunning ? "Send" : "Run"}</span>
                        </button>

                        {sshLogs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSshLogs([]);
                              toast.success("Console cleared");
                            }}
                            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-800 text-stone-400 hover:text-stone-200 transition-all cursor-pointer shrink-0"
                            title="Clear Terminal Output"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Filter and search bar */}
                  <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center gap-3 bg-stone-50/50 shrink-0">
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
                            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all capitalize ${issuesFilter === opt
                                ? "bg-orange-500 text-white shadow-sm"
                                : "text-stone-500 hover:text-stone-805"
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
                              <div className="flex items-start justify-between gap-4 font-sans">
                                <h4 className="text-xs font-bold text-stone-850 hover:text-orange-600 transition-colors truncate">
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

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {issue.state === "open" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSSHIssue(issue);
                                    setExplorerTab("ssh-agent");
                                    toast.success(`Active context set to Issue #${issue.number}!`);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-105 text-[10px] font-bold text-orange-600 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  <Terminal className="w-3 h-3" /> Work
                                </button>
                              )}
                              <a
                                href={issue.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-stone-300 hover:text-stone-600 hover:bg-stone-100 shrink-0 transition-all"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
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
                      className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 mb-6 ${isRecording ? "bg-orange-500 scale-105 shadow-xl shadow-orange-100" : "bg-orange-50"
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
                      className={`mt-10 px-10 py-3 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-95 ${isRecording ? "bg-stone-900 text-white shadow-stone-200" : "bg-orange-500 text-white shadow-orange-100"
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
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${isSelected
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
      {/* Workspace Artifact Review Panel */}
      {isReviewingOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm" onClick={() => setIsReviewingOpen(false)} />
          <div className="relative w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden h-[90vh] sm:h-[80vh] flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 shrink-0 bg-stone-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-100 animate-pulse">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight">
                    Review Workspace Artifacts & Output
                  </h2>
                  <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                    Secure local filesystem sandboxed reader
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReviewingOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Split Panel: Left List, Right Rendered Markdown */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Left sidebar: file list */}
              <div className={`w-full sm:w-64 border-r border-stone-100 flex flex-col bg-stone-50/30 overflow-y-auto ${selectedArtifact ? "hidden sm:flex" : "flex"}`}>
                <div className="p-3 border-b border-stone-100 flex items-center justify-between">
                  <span className="text-[9px] font-extrabold text-stone-450 uppercase tracking-widest block">Available Files</span>
                  <button
                    onClick={loadArtifacts}
                    className="text-[9px] font-bold text-orange-500 hover:underline cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>
                {isArtifactsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-stone-400 gap-2">
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-bold">Scanning workspace...</span>
                  </div>
                ) : artifactsList.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-xs font-semibold">
                    No artifacts found in workspace yet.
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {artifactsList.map((art) => {
                      const isActive = selectedArtifact?.fullPath === art.fullPath;
                      return (
                        <button
                          key={art.fullPath}
                          onClick={() => handleSelectArtifact(art)}
                          className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-1 ${isActive
                              ? "bg-orange-500 text-white shadow-sm"
                              : "hover:bg-stone-100 text-stone-600"
                            }`}
                        >
                          <span className="text-[11px] font-extrabold truncate w-full flex items-center gap-1.5">
                            📄 {art.name}
                          </span>
                          <span className={`text-[9px] truncate w-full font-medium ${isActive ? "text-orange-200" : "text-stone-400"}`}>
                            {art.dir === "brain" ? "🧠 Brain Log" : "🚀 Artifacts"} • {new Date(art.mtime).toLocaleDateString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Panel: Content */}
              <div className={`flex-1 flex flex-col overflow-hidden min-h-0 bg-white ${!selectedArtifact ? "hidden sm:flex items-center justify-center text-stone-400" : "flex"}`}>
                {!selectedArtifact ? (
                  <div className="p-12 text-center max-w-sm space-y-3">
                    <Sparkles className="w-8 h-8 text-orange-200 mx-auto animate-pulse" />
                    <p className="font-bold text-stone-700 text-sm">Select an Artifact to Review</p>
                    <p className="text-xs text-stone-450 leading-relaxed">
                      Select any newly generated file from the list to view its complete, formatted contents before proceeding with execution.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Toolbar */}
                    <div className="px-4 py-2 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => setSelectedArtifact(null)}
                          className="sm:hidden p-1.5 rounded-lg text-stone-450 hover:bg-stone-100 hover:text-stone-900 cursor-pointer mr-1"
                        >
                          ← Back
                        </button>
                        <span className="text-[11px] font-extrabold text-stone-850 truncate">
                          Viewing: {selectedArtifact.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedArtifact.content);
                            toast.success("Content copied to clipboard!");
                          }}
                          className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-[10px] font-bold text-stone-600 transition-all cursor-pointer"
                        >
                          Copy Raw Text
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Document Container */}
                    <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-stone-50/20 font-sans">
                      <div className="max-w-2xl mx-auto bg-white border border-stone-100 rounded-2xl p-5 sm:p-6 shadow-sm max-w-none text-stone-800">
                        <h1 className="text-base sm:text-lg font-black text-stone-900 mb-3 border-b border-stone-100 pb-2 flex items-center gap-2">
                          <span className="text-orange-500 font-sans">#</span> {selectedArtifact.name}
                        </h1>

                        <div className="whitespace-pre-wrap font-mono text-[10px] sm:text-xs leading-relaxed text-stone-700 bg-stone-50 rounded-xl p-4 overflow-x-auto border border-stone-100 shadow-inner">
                          {selectedArtifact.content}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-4 border-t border-stone-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                      <span className="text-[10px] font-bold text-stone-400 text-center sm:text-left">
                        Approving this artifact will send the confirmation signal to the active PTY shell.
                      </span>
                      <div className="flex gap-2.5 w-full sm:w-auto">
                        <button
                          onClick={() => setIsReviewingOpen(false)}
                          className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-stone-200 text-[11px] font-extrabold text-stone-500 hover:bg-stone-50 transition-colors cursor-pointer"
                        >
                          Keep Open
                        </button>
                        <button
                          onClick={handleApproveArtifact}
                          className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[11px] shadow-md shadow-orange-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve & Proceed (Yes)
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

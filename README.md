# Life-OS (Task & Alert Management Capsule) 🚀

> **A premium, privacy-first personal task manager and voice-dictated "think aloud" capture engine.** Just talk, and let advanced AI extract your task list, schedule deadlines, assess priorities, and queue multi-stage active push alerts—powered by Next.js, Prisma, Upstash QStash, and your own AI keys.

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-ui)](http://makeapullrequest.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-ui&logo=next.js)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-teal?style=flat-ui&logo=prisma)](https://www.prisma.io)

---

## ⚡ The Concept & Workflow

Most task managers are tedious: they force you to type titles, click date-pickers, select labels, and manually manage backlogs on small screens. 

**Life-OS** turns task management on its head. It features a minimalist, responsive PWA layout optimized for high-speed micro-interactions. You can click the **Microphone** button to start a **"Think Aloud" session**. Talk naturally for up to 10 minutes about your day, your stress points, or tasks you need to get done. Behind the scenes, Life-OS:
1. Captures your voice with browser Web Audio APIs.
2. Sends the audio to **Whisper STT** (via OpenAI or lightning-fast **Groq** free tier).
3. Pipes the text transcript to your choice of LLM (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Flash, or Llama 3 on Groq/OpenRouter).
4. Extracts structured task properties (Title, Category, Priority, Deadlines) and injects them instantly with premium optimistic updates into your board!

---

## 📐 AI Brain-Dump Task Extraction Architecture

The entire voice-to-schedule transaction flows securely through Next.js Server Actions and Edge APIs using **Bring Your Own Key (BYOK)** models:

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Voice Interface)
    participant Client as Next.js Web Frontend
    participant Route as Next.js API (POST /api/ai/process)
    participant Prisma as PostgreSQL Database (Prisma)
    participant STT as Whisper STT (Groq / OpenAI)
    participant LLM as AI LLM (Gemini / Claude / GPT)

    User->>Client: Clicks microphone & records "Brain Dump"
    Client->>Route: HTTP POST (multipart/form-data audio/webm)
    Route->>Prisma: Fetch User's local AI Provider Settings & API Keys
    Prisma-->>Route: Return encrypted settings JSON
    Route->>STT: Send audio file for Whisper transcription
    STT-->>Route: Return clean text transcript
    Route->>LLM: Pass transcript + context-aware task extraction prompt
    LLM-->>Route: Return structured JSON (Tasks, Deadlines, Priorities)
    Route-->>Client: Return transcript & suggested task list
    Client->>User: Display preview overlay & add to active views optimistically
```

---

## ✨ Outstanding Features (Newly Expanded!)

### 🎙️ 1. Universal Voice Commander
* **Natural Language Dictation**: Capture audio thoughts on the fly. Extracts title, description, category, due dates, and priority using state-of-the-art LLM JSON structures.
* **Optimistic Live Drafting**: Watch the task draft forms populate automatically while saving with zero latency.

### 📋 2. Interactive Kanban & Chronological Multi-Views
* **Kanban Board**: Drag-and-drop task status pipelines (Backlog, Scheduled, In Progress, Done, Cancelled).
* **Table View**: WhatsApp-style micro-layouts on mobile, structured spreadsheets with full sorting, paging, and keyboard navigation on desktop.
* **Week View**: Clean, grid columns showing task loads for the current week.
* **Touch-Grip Mobile Control**: Kanban cards utilize a specialized vertical grab handle (`GripVertical`) preventing touch scrolling collisions, maintaining pristine native mobile swipe fluidity.

### 💻 3. Advanced Developer Hub (DevPortal / CLI)
An engineering command center designed to monitor local services and synchronize task states securely:
* **PTY SSH Console Client**: Full live interactive console with secure SSH tunnel configurations and keepalive heartbeats to maintain active connections.
* **Popped-out Neon Voice FAB**: Larger floating mic button located in the terminal top-right, featuring dual expanding glowing rings (`animate-ping`) and floating status strings to indicate voice state.
* **Workspace Artifact Sandbox Reader**: Read and verify generated repository files securely before committing or executing terminal instructions.
* **GitHub Issues Sync**: Pull down repository issues in real-time, wrap titles perfectly (avoiding trailing dot-dot-dots), and bind them directly as active task context.

### 🔒 4. Access Guard & SMTP Authentication
* **SMTP Reset password loop**: High-security forgot/reset password flow powered by Resend SMTP configurations.
* **Local Password Upgrades**: Allows users signed in via Google OAuth to securely establish custom local passwords without breaking session tokens.
* **Multi-tenant Isolation locks**: Session-validated Next.js Server Actions securing all IDOR locks to enforce absolute database isolation.

### 📱 5. High-Performance Mobile PWA
* **Add to Home Screen**: PWA ready with registered service workers and offline database assets.
* **Hard Refresh Action**: dedicated reload button in the navigation header that automatically clears registered service workers and web cache to resolve local cache locks instantly.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 15+ (App Router, Server Actions)
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: Auth.js (NextAuth v5) utilizing JWT Cookie Sessions
- **Task Scheduling**: Upstash QStash integration
- **Styling**: Tailwind CSS + custom Vanilla CSS glassmorphic layers

---

## 🚦 Getting Started

### Prerequisites
- Node.js (v18.0.0+)
- PostgreSQL instance
- Upstash QStash account (Optional, for email/alert scheduler)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/har412/Life-OS.git
   cd Life-OS
   ```

2. **Install node dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables (`.env`):**
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/lifeos"
   AUTH_SECRET="your-32-character-nextauth-secret"
   
   # For Alert Scheduler
   QSTASH_TOKEN="your-upstash-qstash-token"
   QSTASH_CURRENT_SIGNING_KEY="your-qstash-signing-key"
   ```

4. **Synchronize database models:**
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start dev environment:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to start dictating!

---

## 🤝 Contributing & Community Issues

Life-OS is an open-source project. If you want to contribute, please check our [**Contributing Guide**](CONTRIBUTING.md) to set up your workflow. 

We track all bugs, improvements, and feature tasks in our public issues page. Feel free to pick up any open issues!

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

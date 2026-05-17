# 🤝 Contributing to Life-OS

First off, thank you for considering contributing to **Life-OS**! It’s people like you who make open source such a powerful and inspiring space.

This document outlines the guidelines, code styles, and workflow conventions for contributing to the Life-OS repository.

---

## 🚦 Getting Started

### 1. Fork & Clone
1. Fork the repository on GitHub: [har412/Life-OS](https://github.com/har412/Life-OS).
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Life-OS.git
   cd Life-OS
   ```
3. Set up the upstream remote:
   ```bash
   git remote add upstream https://github.com/har412/Life-OS.git
   ```

### 2. Environment Setup
Make sure you have:
- **Node.js** (v18 or higher)
- **NPM** (v9 or higher)
- **PostgreSQL** running locally (or via Docker)

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure your `.env` file:**
   Copy `.env.example` to `.env` and fill in your database connection string and Auth secret:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/lifeos"
   AUTH_SECRET="your-super-secure-nextauth-secret-here"
   ```
3. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```
4. **Seed local data:**
   ```bash
   npx prisma db seed
   ```
5. **Fire up the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to start developing!

---

## 🎨 Design & Code Conventions

To keep Life-OS looking premium, clean, and highly structured, we enforce the following code standards:

### 1. Style Guide (Aesthetics Matter!)
- **Harmoious Colors:** We use curated, warm stone and high-contrast orange color palettes. Avoid generic/browser-default colors.
- **Glassmorphism:** Use semi-transparent borders with backdrop-blur (`bg-white/40 backdrop-blur-md border border-stone-200/50`) for a state-of-the-art overlay feel.
- **Interactive States:** Every interactive button should have explicit `:hover` and `:active` CSS transitions (`transition-all active:scale-95`).
- **Responsive-First:** Always ensure that views are optimized for both small mobile screens (WhatsApp-style card layouts) and large monitors (grids/tables).

### 2. Next.js & Server Actions
- **Auth Guard:** Every server action and API endpoint MUST verify the active session. Never trust input IDs blindly:
  ```typescript
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  ```
- **Optimistic Updates:** To keep the PWA feeling instant, always implement optimistic UI state updates using React states or `useOptimistic` hooks (e.g. immediately toggling a task checkbox or removing a deleted task card before the database transaction completes).

### 3. Database Integrity
- **Backlog Constraint:** Backlog tasks **cannot** have due dates or times. If you change a task's status to `BACKLOG`, you must nullify its `dueDate` and `time` parameters.
- **Scheduled Tasks:** Moving a task out of `BACKLOG` or setting a due date during creation should automatically transition its status to `SCHEDULED`.

---

## 🚀 Branching & PR Workflow

We follow a clean, standard branching model:

1. **Synchronize master:**
   ```bash
   git checkout master
   git pull upstream master
   ```
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-awesome-feature
   # or
   git checkout -b bugfix/timezone-drift
   ```
3. **Commit your changes:**
   Use clear, imperative-style commit messages:
   ```bash
   git commit -m "feat(stt): integrate Groq Whisper API for lightning-fast voice processing"
   ```
4. **Push & Open PR:**
   Push to your fork and submit a Pull Request against the `master` branch of `har412/Life-OS`. Ensure all TypeScript compilation checks (`npm run build`) pass successfully before opening the PR.

---

## 🛡️ License
By contributing to this repository, you agree that your contributions will be licensed under the project's MIT License.

# Life-OS (Task and Alert Management)

Life-OS is a comprehensive task and alert management system built with Next.js. It features a rich interface for managing tasks across different views (Table, Kanban, Week), categorizing them, setting priorities, and handling alerts.

## 🚀 Features
- **Dynamic Views**: Table, Kanban, and Week views for task management.
- **Think Aloud AI**: Speak for up to 10 minutes; AI extracts tasks, deadlines, and priorities automatically.
- **AI Intelligence (BYOK)**: Bring Your Own Key support for OpenAI, Gemini, Claude, OpenRouter, and NVIDIA.
- **Smart Alerts**: Multi-stage notifications (e.g., 10m before + overdue) using QStash.
- **Mobile Optimized**: PWA support with a dedicated Inbox and action-button notifications.

## 🛠 Technology Stack
- **Framework**: [Next.js 15+](https://nextjs.org) (App Router)
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **AI/LLM**: Support for OpenAI, Google Gemini, Anthropic, and OpenRouter
- **Background Tasks**: [Upstash QStash](https://upstash.com/docs/qstash/overall/getstarted) (for scheduling alerts)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Styling**: Vanilla CSS + Tailwind

## 🧠 AI Intelligence (Bring Your Own Key)
Life-OS is designed to be privacy-first and cost-effective. Instead of a monthly subscription, you provide your own API keys.
1. **STT (Speech-to-Text)**: Converts your "Think Aloud" sessions into text.
2. **LLM Extraction**: Analyzes the transcript to create structured tasks (Title, Category, Due Date, etc.).

Supported Providers:
- **OpenAI**: Best for high-accuracy Whisper transcription.
- **Google Gemini**: Excellent for long-form audio processing (10 min+).
- **OpenRouter/NVIDIA**: Use any open-source model (Llama-3, etc.).

## 📁 Project Structure
- `src/app/`: Next.js App Router routes and Server Actions.
  - `actions/`: Server actions for Tasks, Categories, and Views.
- `src/components/`: React components (Modals, Task Cards, Filters, Layouts).
- `src/lib/`: Utility functions, Prisma client, and Shared Context.
  - `viewContext.tsx`: Main React Context for managing app state.
  - `taskData.ts`: Type definitions and metadata constants.
- `prisma/`: Database schema and migrations.

## 🚦 Getting Started

### Prerequisites
- Node.js installed
- PostgreSQL database
- Redis (for BullMQ)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables in a `.env` file (see `.env.example`).
4. Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧠 Core Business Logic
- **Backlog Integrity**: 
  - Backlog tasks **cannot have due dates or times**.
  - Moving a task to `BACKLOG` automatically clears its `dueDate`.
  - Adding a `dueDate` to a `BACKLOG` task moves it to `SCHEDULED`.
- **Task Creation**: Adding a `dueDate` during creation defaults the status to `SCHEDULED`.
- **Alerts**: Scheduled based on task `dueDate` and `time`.

## 📄 License
This project is for personal use.

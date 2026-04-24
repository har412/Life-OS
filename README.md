# Life-OS (Task and Alert Management)

Life-OS is a comprehensive task and alert management system built with Next.js. It features a rich interface for managing tasks across different views (Table, Kanban, Week), categorizing them, setting priorities, and handling alerts.

## 🚀 Features
- **Dynamic Views**: Table, Kanban, and Week views for task management.
- **Backlog Management**: Strict rules to keep backlog clean (no due dates in backlog).
- **Smart Scheduling**: Automatic status transitions when adding/removing due dates.
- **Categories & Priorities**: Custom categories with color coding and priority levels.
- **Alert System**: Scheduled notifications via BullMQ.
- **Voice Input**: Create tasks using voice commands.

## 🛠 Technology Stack
- **Framework**: [Next.js 15+](https://nextjs.org) (App Router)
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Auth.js)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **Icons**: [Lucide-react](https://lucide.dev/)
- **Background Tasks**: [BullMQ](https://docs.bullmq.io/) (for scheduling alerts)

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

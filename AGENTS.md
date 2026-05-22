<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Coding Standards & Workflows

Any AI agent working on this project MUST strictly read and follow the defined standards and workflows:

1. **Coding & Security Standards:** Follow the guidelines outlined in [.agents/standards.md](file:///f:/Coding/task%20and%20alert%20management/apps/web/.agents/standards.md) (strict TypeScript types, session-validated Server Actions, IDOR query locks, optimistic state styling, mobile touch grip scrolling, and build testing).
2. **Git & PR Workflows:** Follow the protocol specified in [.agents/workflows/code-push.md](file:///f:/Coding/task%20and%20alert%20management/apps/web/.agents/workflows/code-push.md) when the user requests a code push or PR submission (check compiler, verify compliant branches, stash changes, pull latest from master, create/checkout branch off master, pop, commit, push, and submit a high-fidelity Pull Request).

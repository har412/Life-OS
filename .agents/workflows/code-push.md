---
description: Code Push Workflow
---

# Code Push Workflow

This workflow defines the standard procedure that any AI Agent (or automated scripts) must follow when the user issues a **"code push"** or **"push the code"** request.

---

## 🛠️ Step-by-Step Procedure

### Step 1: Pre-push Build & Verification
- **Action**: Run `npm run build` locally in the app directory to run the compiler, TypeScript validation, and Prisma schema generation.
- **Rule**: If the build fails, **HALT** the workflow immediately and report the specific errors to the user. Do not proceed to commit or push broken code.

### Step 2: Analyze Local Changes
- **Action**: Run `git status` and `git diff` to identify all changed files (modified, untracked, deleted).
- **Goal**: Understand the intent of the changes (e.g. is it a feature, layout adjustment, database addition, or a bug fix) to generate high-quality commit messages, branch names, and PR descriptions.

### Step 3: Branch Compliance Check
Check the name of the currently active branch:
- **Case A: Compliant Branch (e.g., `feature/...`, `bug/...`, `fix/...`)**
  1. Continue in the current branch.
  2. Stage all modifications (`git add .`).
  3. Prompt/create a semantic commit message (e.g. `feat: ...`, `fix: ...`) matching standard conventions.
  4. Commit changes (`git commit -m "..."`).
  5. Push commits to the remote branch (`git push origin <branch-name>`).
  6. Create a Pull Request from the current branch into `master` using the GitHub MCP tool with a high-fidelity Markdown description detailing what changed and what was verified.

- **Case B: Non-Compliant Branch (e.g., `master`, `main` or no branch prefix)**
  1. **Brainstorm Branch Name**: Based on the files and diff analyzed in Step 2, generate a clean, lowercase, hyphenated branch name prefixed with `feature/` or `bug/` (e.g., `feature/kanban-reordering`, `bug/auth-redirect-fix`).
  2. **Stash Changes**: Stash local changes to keep the workspace clean before switching branches:
     ```bash
     git stash -u
     ```
  3. **Checkout Base Branch**: Checkout `master` (or `main`) to ensure the new branch starts from the default codebase:
     ```bash
     git checkout master
     ```
  4. **Pull Latest Changes**: Pull the latest commits from origin to stay up to date:
     ```bash
     git pull origin master
     ```
  5. **Create & Switch Branch**: Spin up the new compliant branch off of the up-to-date master branch:
     ```bash
     git checkout -b <new-branch-name>
     ```
  6. **Restore Changes**: Pop the stashed changes onto the new branch:
     ```bash
     git stash pop
     ```
  7. **Stage & Commit**: Stage all changes (`git add .`) and commit them with a semantic message describing the work.
  8. **Push Branch**: Push the new branch to the remote origin:
     ```bash
     git push -u origin <new-branch-name>
     ```
  9. **Create PR**: Open a Pull Request from the new branch to `master` with a comprehensive Markdown description.
  10. **Environment Variable Alert**: If the session involved any new or modified environment variables (e.g., in `.env`, `.env.example`, or code definitions), the agent **MUST** explicitly track this change. In the final push report to the user, the agent **MUST** display a highly visible warning listing the specific variables that the user needs to manually add to the production hosting platform. *Never commit active secrets or actual `.env` files to Git.*

---

## 📝 Standards for Branch Naming & Commits

### Branch Naming Patterns
- New features: `feature/<short-hyphenated-description>`
- Bug fixes: `bug/<short-hyphenated-description>` or `fix/<short-hyphenated-description>`
- Refactoring: `refactor/<short-hyphenated-description>`

### Commit Messages
- Use standard semantic commit prefixes:
  - `feat:` for new capabilities.
  - `fix:` for bug fixes.
  - `refactor:` for code restructuring.
  - `db:` or `schema:` for database changes.

---

## 🚀 Execution Commands (Local Fallback)
For manual trigger by developers, we also provide a CLI tool. Run:
```bash
npm run code-push
```
This CLI tool matches this workflow logic precisely.

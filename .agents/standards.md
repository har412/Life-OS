# Life-OS Code Standards & Security Guidelines

This document outlines the strict quality, type-safety, security, and testing standards that all developers and AI agents must adhere to when contributing to the **Life-OS** repository.

---

## 🟦 1. TypeScript & Type-Safety Standards

To prevent runtime exceptions and maintain codebase readability:
- **No Implicit `any`:** Under no circumstances should type `any` be introduced. Use strict interface structures or generic types. If type shape is unknown, use `unknown`.
- **Avoid Type Assertions (`as ...`):** Do not bypass compile-time checks using type assertions (e.g., `as unknown as Task`) unless parsing external, unsafe dynamic inputs.
- **Strict Interfaces:** Define custom models in standard libraries (like `src/lib/taskData.ts`). Ensure components import centralized models instead of declaring local, divergent types.
- **Strict Optional Handling:** Always use optional chaining (`?.`) or explicit nullish coalescing (`??`) for fields that can be `null` or `undefined` (e.g., `task.reminderOffset`, `task.order`).

---

## 🔒 2. Security & Vulnerability Standards

We handle personal tasks, notifications, and user data. Security must be integrated into every change:
- **Server Action Authorization:** All Next.js Server Actions in `src/app/actions/` MUST verify authentication before executing logic:
  ```typescript
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;
  ```
- **Database Tenancy (Ownership Lock):** Every Prisma query, update, or deletion must be explicitly scoped to the authenticated `userId` to prevent IDOR (Insecure Direct Object Reference) vulnerabilities:
  ```typescript
  // GOOD: Scoped to the active userId
  await prisma.task.update({
    where: { id: taskId, userId },
    data: { ... }
  });

  // BAD: Vulnerable to cross-user mutations
  await prisma.task.update({
    where: { id: taskId },
    data: { ... }
  });
  ```
- **Credential Storage:** Never log or store plain-text passwords. User passwords must be hashed using a salt factor of 10 (`bcrypt`) before saving to the database.
- **Environment Variables:** Confidential tokens, secrets, or keys (e.g., `NEXTAUTH_SECRET`, database URIs, API keys) must be read from `process.env` and never hardcoded in files.

---

## 🎨 3. UI/UX & React Standards

Life-OS is a premium productivity platform. Ensure design excellence in every layout:
- **Optimistic UI Updates:** Interactive elements (Kanban boards, delete actions, state toggles) should use React states optimistically to feel instantaneous. Provide elegant rollback/error notifications (`sonner` toasts) if the server request fails.
- **Mobile Usability & Scroll Integrity:** Drag-and-drop systems must not interfere with native vertical scrolling on touch screens. Always restrict drag handles on mobile viewports to custom grab handles (e.g. `GripVertical` icons) instead of the entire card wrapper.
- **Harmonious Aesthetics:** Use curated gradients (e.g., `bg-gradient-to-br from-orange-500 to-orange-600`), Outfit/Inter typography, and subtle box-shadows. Avoid standard browser colors.
- **Layout Adaptability:** Always test designs on both small mobile layouts (320px–480px) and wide desktop monitors. Maintain screen boundaries without overflow.

---

## 🧪 4. Testing & Verification Scenarios

Before submitting any code changes or filing a Pull Request, the following scenarios must be verified:

### A. Static Compiler Validation
- Run the Next.js and Prisma compiler:
  ```bash
  npm run build
  ```
- Ensure the build completes with a code `0` exit status. Zero TypeScript or ESLint errors are permitted in production builds.

### B. User Authorization & Auth Gates
- Try to execute actions or view views while logged out.
- Ensure the app redirects correctly to `/login` and blocks database operations with an `Unauthorized` error.

### C. Kanban Drag & Drop Scenarios
- **Same Column:** Drag a card within the same column and reload. Check if the relative vertical order remains persisted.
- **Cross Column:** Move a card into a different column. Verify that the task status updates successfully in the DB and matches the new target order.
- **Mobile Scrolling:** On touch simulations, ensure you can swipe up/down freely without accidentally triggering card drag actions.

### D. Voice FAB Actions
- Click the floating `Mic` action button.
- Check that the `AddTaskModal` opens, autofocuses correctly, and transitions with clean, micro-animated opacity.

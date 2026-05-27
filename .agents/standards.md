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

## 🔒 2. Security & Vulnerability Standards (OWASP Top 10 Compliance)

We handle personal tasks, notifications, and sensitive financial logs. Security must be built into every code contribution in alignment with the OWASP Top 10 standards:

### 🛡️ A01:2021 – Broken Access Control (Insecure Direct Object Reference - IDOR)
- **Tenancy-Locked Queries:** Every database action (read, update, delete, reorder) in Prisma MUST be explicitly scoped to the authenticated `userId`.
  ```typescript
  // SECURE: Enforces strict data ownership
  await prisma.task.update({
    where: { id: taskId, userId: session.user.id },
    data: { ... }
  });
  ```
- **Action Auth Gates:** Every Server Action in `src/app/actions/` and API route must verify user authentication. Immediately return `{ error: "Unauthorized" }` or `401 Unauthorized` if `session?.user?.id` is absent.

### 🛡️ A02:2021 – Cryptographic Failures (Sensitive Data Exposure)
- **High-Entropy Password Hashing:** Never log or save plain-text passwords. All credentials must be hashed using a salt factor of 10 (`bcrypt`) before saving to the database.
- **TLS & Environment Hygiene:** Secrets, JWT secret values, base URLs, and integration keys (e.g., `DATABASE_URL`, `NEXTAUTH_SECRET`) must reside exclusively in `.env` variables and never be checked into version control.

### 🛡️ A03:2021 – Injection (SQL Injection & XSS)
- **Parameterized Database Queries:** Avoid executing dynamic strings or raw SQL concatenations (`prisma.$queryRawUnsafe`). Use standard Prisma methods or parameterized tagged templates (`prisma.$queryRaw`) to enforce compile-time escaping.
- **XSS & Content Sanitization:** Any user-generated HTML (e.g., rich text from the editor, description blocks, comment threads) must be sanitized or safely outputted to prevent Cross-Site Scripting. Never use `dangerouslySetInnerHTML` with un-sanitized dynamic input strings.

### 🛡️ A04:2021 – Insecure Design
- **Authenticated Route Protection:** Enforce Next.js middleware router guards and NextAuth checks for protected views (`/kanban`, `/expenses`, `/settings`).
- **Defensive Error Handling:** Standardize API responses so that stack traces and Prisma backend exceptions are caught and never leaked directly to the client browser.

### 🛡️ A05:2021 – Security Misconfiguration
- **Secure Browser Headers:** Set appropriate CSP (Content Security Policy) rules and restrict frame loading using standard modern Next.js response headers.
- **Dev vs Prod Environment Configuration:** Toggle verbose debugging, source maps, and detailed logging tools off in production environments.

### 🛡️ A06:2021 – Vulnerable and Outdated Components
- **Dependency Auditing:** Perform standard package security audits (`npm audit`) before committing changes or deploying to production.
- **Minimize Third-Party Dependency Footprint:** Do not install unnecessary npm dependencies. Favor core browser APIs and robust standard packages.

### 🛡️ A07:2021 – Identification and Authentication Failures
- **Secure Sessions:** Use standard, high-entropy JWT session tokens issued and cryptographically validated via NextAuth.
- **Cookie Security:** Enforce secure cookies (`HttpOnly`, `Secure`, `SameSite=Lax`) to defend against session hijacking and Cross-Site Request Forgery (CSRF).

### 🛡️ A08:2021 – Software and Data Integrity Failures
- **Input Validation & Sanitization:** Use standard TS typings or runtime validators (e.g., `zod`) to assert the exact shape, bounds, and payload types of all inbound POST bodies, Next.js Server Actions, and API inputs.
- **Automatic CI Validation:** Integrate build checks (`npm run build`) and Playwright E2E test suites inside the code-push pipeline to prevent software integration failures.

### 🛡️ A09:2021 – Security Logging and Monitoring Failures
- **Audit Trails:** Ensure core operations (e.g., failed logins, auth gates bypassed, server action failures) output structured logging on the server-side.
- **Log Sanitation:** Ensure that sensitive details (passwords, JWTs, credit card info, bank details) are explicitly scrubbed and never printed to console logs or log aggregators.

### 🛡️ A10:2021 – Server-Side Request Forgery (SSRF)
- **Validation of External Resource Loading:** Restrict the ingestion of external assets or media uploads to validated domains. For standard media upload (e.g., attachment cards), assert type checks on base64 headers or strictly use trusted third-party SDK endpoints.

---

## 🎨 3. UI/UX & React Standards

Life-OS is a premium productivity platform. Ensure design excellence in every layout:
- **Optimistic UI Updates:** Interactive elements (Kanban boards, delete actions, state toggles) should use React states optimistically to feel instantaneous. Provide elegant rollback/error notifications (`sonner` toasts) if the server request fails.
- **Mobile Usability & Scroll Integrity:** Drag-and-drop systems must not interfere with native vertical scrolling on touch screens. Always restrict drag handles on mobile viewports to custom grab handles (e.g. `GripVertical` icons) instead of the entire card wrapper.
- **Harmonious Aesthetics & Color Scheme (Sober Orange):** The primary unified color scheme for Life-OS buttons, active states, focus highlights, header tags, and layout brand items is **Sober Orange** (e.g., `bg-orange-500`, `hover:bg-orange-600`, focus rings `focus:ring-orange-400`, subtle backdrops `bg-orange-50` or `bg-orange-100`, and shadow highlights `shadow-orange-100`). Do not introduce other colors (like purple, blue, or green) for settings, save buttons, forms, or general UI actions. Other colors must only be used when explicitly displaying dynamic custom task categories/labels. Use premium Outfit/Inter typography and subtle box-shadows. Avoid standard browser colors.
- **Mobile Responsiveness & Mobile UX Excellence:** Whenever creating or modifying any user interface, it MUST be fully responsive and tailored meticulously to mobile viewport constraints (320px–480px). Touch target areas must be highly accessible (minimum `44px x 44px` for clickable elements) with responsive spacing to avoid visual crowding. Ensure that layouts resize fluidly, grids collapse cleanly into readable single-column stacks, and sidebars or floating controls remain easy to use with touch gestures. Place highly critical primary action buttons (like creation or submission buttons) within comfortable thumb reach (bottom-aligned or persistent bottom sheets) to maximize mobile comfort and convenience.
- **Layout Adaptability:** Always test designs on both small mobile layouts (320px–480px) and wide desktop monitors. Maintain screen boundaries without overflow.

### A. Advanced Component & Selector UX Rules:
- **Searchable Dropdowns (Autocomplete):** Wherever a drop-down or selector handles dynamic options that can scale (e.g., 5+ items), you MUST implement an **autocomplete/searchable dropdown** allowing inline searching, rather than using generic static `<select>` elements.
- **Bulk Actions in Filters:** If any filter or checkbox menu contains more than 4 options, always include immediate control options for **"Select All"** and **"Clear All"** to eliminate user clicking fatigue.
- **Responsive Navigation for Sidebars:** On mobile viewports, do not render full-length sidebar navigation lists that push active content below the fold. Instead, consolidate sidebar controls into clean top-sticky scrolling pill tracks or optimized dropdown selectors at the very top of the active pane.

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

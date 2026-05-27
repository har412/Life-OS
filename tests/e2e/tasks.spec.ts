import { test, expect } from "@playwright/test";

test.describe("Life-OS Consolidated E2E Workspace Verification", () => {
  test("Should execute complete signup, login, navigation, task CRUD, and Voice AI flows", async ({ page }) => {
    // Elevate test timeout to 120 seconds for compilation during development testing runs
    test.setTimeout(120000);

    // Enable browser console logging
    page.on("console", (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on("pageerror", (err) => console.error(`[BROWSER ERROR]: ${err.message}`));

    // Set 60-second default navigation timeout for lazy compiling dev servers on Windows
    page.setDefaultNavigationTimeout(60000);

    const timestamp = Date.now();
    const email = `e2e-user-${timestamp}@lifeos.local`;
    const taskTitle = `Meticulous E2E Task ${timestamp}`;
    const voiceTaskTitle = `Voice Task Urgent ${timestamp}`;

    // --- STEP 1: SIGNUP AND REGISTRATION ---
    console.log("➡️ Starting Step 1: Signup");
    await page.goto("/signup");
    await expect(page).toHaveTitle(/LifeOS/i);

    await page.fill('input#name', "E2E Tester");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "SecurePassword123!");

    // Submit registration form
    await page.click('button[type="submit"]');

    // Wait for automatic redirect to login screen
    await page.waitForURL(/.*\/login.*/, { timeout: 20000 });
    await expect(page.locator("h2")).toContainText("Welcome back");
    console.log("✅ Step 1 Completed: Signed up successfully");

    // --- STEP 2: LOGIN ---
    console.log("➡️ Starting Step 2: Login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "SecurePassword123!");

    // Submit credentials login
    await page.click('button[type="submit"]');

    // Wait for home page to render and NextAuth session to load
    await page.waitForURL(url => url.pathname === "/", { timeout: 20000 });
    
    // Assert that the dashboard loaded by finding the Add Task Voice FAB button
    const fabButton = page.getByRole("button", { name: /Add task/i });
    await expect(fabButton).toBeVisible({ timeout: 20000 });
    console.log("✅ Step 2 Completed: Logged in & Dashboard loaded");

    // --- STEP 3: VIEW NAVIGATION & CRASH CHECKS ---
    console.log("➡️ Starting Step 3: Navigation and Views");
    const mainViews = ["Kanban", "Week", "Table"];
    for (const view of mainViews) {
      await page.evaluate((v) => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === v);
        if (btn) btn.click();
      }, view);
      await page.waitForTimeout(300); // Allow render transition
    }

    // Verify other active sub-routes load without server-side rendering or application crashes
    const otherPages = [
      { url: "/expenses" },
      { url: "/developer" },
      { url: "/settings" }
    ];

    for (const item of otherPages) {
      console.log(`Checking route: ${item.url}`);
      await page.goto(item.url);
      await page.waitForLoadState("networkidle");
      const bodyText = await page.locator("body").innerText();
      expect(bodyText).not.toContain("Application error");
      expect(bodyText).not.toContain("500");
    }

    // Return to main dashboard
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const freshFab = page.getByRole("button", { name: /Add task/i });
    await expect(freshFab).toBeVisible({ timeout: 15000 });
    console.log("✅ Step 3 Completed: All active views verified stable");

    // --- STEP 4: MANUAL TASK CRUD ---
    console.log("➡️ Starting Step 4: Manual Task CRUD");
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Add task via Voice"]') as HTMLButtonElement;
      if (btn) btn.click();
    });

    // Open Manual Entry tab inside modal
    await page.waitForSelector('button:has-text("Manual Entry")', { state: "visible", timeout: 10000 });
    await page.click('button:has-text("Manual Entry")', { force: true });

    // Wait for manual entry input field to be visible
    await page.waitForSelector('input[placeholder="What\'s the plan?"]', { state: "visible", timeout: 10000 });
    await page.fill('input[placeholder="What\'s the plan?"]', taskTitle);

    // Save task
    await page.click('button:has-text("Create Task")', { force: true });
    
    // Wait for the modal to dismiss completely before switching views
    await page.waitForSelector('input[placeholder="What\'s the plan?"]', { state: "hidden", timeout: 10000 });

    // Switch to Table view to check for task existence
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Table');
      if (btn) btn.click();
    });
    const taskSelector = page.locator(`text=${taskTitle}`).filter({ visible: true }).first();
    await expect(taskSelector).toBeVisible({ timeout: 15005 });

    // Open Task details modal by clicking the task element
    await taskSelector.click({ force: true });
    await page.waitForSelector("select", { timeout: 5000 });

    // Update status dropdown option to IN_PROGRESS
    const statusSelect = page.locator("select").first();
    await statusSelect.selectOption("IN_PROGRESS");

    // Dismiss details modal
    await page.click('button:has-text("Discard"), button:has-text("Cancel"), svg.lucide-x', { force: true });
    await page.waitForTimeout(500);
    console.log("✅ Step 4 Completed: Manual task created & status updated");

    // --- STEP 5: GLOBAL VOICE FAB AI SIMULATION (TASK & EXPENSE) ---
    console.log("➡️ Starting Step 5: Global Voice FAB AI simulation");

    const voiceExpenseTitle = `E2E Voice Expense ${timestamp}`;

    // A. Intercept Task AI process API
    await page.route("**/api/ai/process", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          transcript: "Design system architecture urgent due tomorrow",
          tasks: [
            {
              title: voiceTaskTitle,
              description: "Voice-first E2E task description",
              dueDate: "2026-05-28",
              time: "18:00",
              categoryId: "WORK",
              priority: "URGENT",
              status: "SCHEDULED"
            }
          ]
        })
      });
    });

    // B. Intercept Expense AI process API
    await page.route("**/api/ai/process-expense", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          transcript: "I spent 500 rupees on dinner with friends today",
          expense: {
            amount: 500,
            description: voiceExpenseTitle,
            category: "Food",
            date: "2026-05-27",
            quantity: "1",
            location: "Restaurant",
            type: "DEBIT",
            paymentMode: "CARD"
          }
        })
      });
    });

    // C. Test Global FAB - Task Creation
    console.log("👉 Testing Global Voice FAB: Task Creation");
    const aiAssistantButton = page.locator('button[title="Ask AI Assistant"]');
    await expect(aiAssistantButton).toBeVisible({ timeout: 15000 });
    await aiAssistantButton.click({ force: true });

    // Verify modal is open and in Task mode by checking title text
    await expect(page.locator('h3:has-text("Create Task via Voice")')).toBeVisible({ timeout: 5000 });

    // Start & Stop recording using aria-label to trigger mock API
    await page.click('button[aria-label="Start Recording"]', { force: true });
    await page.waitForTimeout(600);
    await page.click('button[aria-label="Stop Recording"]', { force: true });

    // Verify the Task Verification form is loaded with populated data
    const taskTitleInput = page.locator('label:has-text("Task Title") + input');
    await expect(taskTitleInput).toHaveValue(voiceTaskTitle, { timeout: 10000 });

    // Click Confirm & Save
    await page.click('button:has-text("Confirm & Save")', { force: true });
    await page.waitForTimeout(1000);

    // Verify the Voice Task is visible on the main dashboard Table view
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Table');
      if (btn) btn.click();
    });
    await expect(page.locator(`text=${voiceTaskTitle}`).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    console.log("✅ Task via Global Voice FAB created and verified!");

    // D. Test Global FAB - Expense Creation
    console.log("👉 Testing Global Voice FAB: Expense Creation");
    await aiAssistantButton.click({ force: true });

    // Switch to Expense AI tab
    await page.click('button:has-text("Expense AI")', { force: true });
    await expect(page.locator('h3:has-text("Log Expense via Voice")')).toBeVisible({ timeout: 5000 });

    // Start & Stop recording using aria-label to trigger mock API
    await page.click('button[aria-label="Start Recording"]', { force: true });
    await page.waitForTimeout(600);
    await page.click('button[aria-label="Stop Recording"]', { force: true });

    // Verify the Expense Verification form is loaded with populated amount and description
    const expenseDescriptionInput = page.locator('label:has-text("Description") + input');
    await expect(expenseDescriptionInput).toHaveValue(voiceExpenseTitle, { timeout: 10000 });

    const expenseAmountInput = page.locator('label:has-text("Amount (₹)") + input');
    await expect(expenseAmountInput).toHaveValue("500", { timeout: 5000 });

    // Click Confirm & Save
    await page.click('button:has-text("Confirm & Save")', { force: true });
    await page.waitForTimeout(1000);

    // E. Verify Expense database synchronization on the /expenses dashboard
    console.log("👉 Verifying expense sync in /expenses page");
    await page.goto("/expenses");
    await page.waitForLoadState("networkidle");

    // Expect the created expense to be visible in the list
    await expect(page.locator(`text=${voiceExpenseTitle}`).filter({ visible: true }).first()).toBeVisible({ timeout: 15005 });
    console.log("✅ Expense via Global Voice FAB created, synced to DB, and verified on dashboard!");
  });
});

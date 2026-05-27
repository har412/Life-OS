const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Helpers for color printing
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

function log(msg, color = COLORS.reset) {
  console.log(`${color}${msg}${COLORS.reset}`);
}

function errorLog(msg) {
  console.error(`${COLORS.red}${COLORS.bright}Error: ${msg}${COLORS.reset}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function run() {
  log("=========================================", COLORS.cyan);
  log("🚀 STARTING AUTOMATED CODE PUSH WORKFLOW", COLORS.cyan + COLORS.bright);
  log("=========================================\n", COLORS.cyan);

  // 1. Run Pre-push Build Verification
  log("📋 Step 1: Running TypeScript & Build Validation...", COLORS.blue);
  try {
    execSync("npm run build", { stdio: "inherit" });
    log("\n✨ Build verification passed successfully!\n", COLORS.green + COLORS.bright);
  } catch (err) {
    errorLog("Build verification failed. Please fix compilation/linting errors before pushing.");
    process.exit(1);
  }

  // 1.5. Run E2E Tests
  log("🧪 Step 1.5: Running Automated Playwright E2E Testing...", COLORS.blue);
  try {
    execSync("npx playwright test", { stdio: "inherit" });
    log("\n✨ E2E Testing Suite passed perfectly!\n", COLORS.green + COLORS.bright);
  } catch (err) {
    errorLog("E2E tests failed. Please resolve functional failures before pushing.");
    process.exit(1);
  }

  // 2. Check Git status
  log("🔍 Step 2: Checking current git changes...", COLORS.blue);
  let statusOutput = "";
  try {
    statusOutput = execSync("git status --porcelain", { encoding: "utf8" }).trim();
  } catch (err) {
    errorLog("Failed to run git status. Are you in a git repository?");
    process.exit(1);
  }

  if (!statusOutput) {
    log("ℹ️ No local changes to commit or push. Clean working directory.", COLORS.yellow);
    rl.close();
    return;
  }

  log("\nFound local modifications:", COLORS.yellow);
  console.log(statusOutput);
  console.log();

  // 3. Branch Verification
  log("🎋 Step 3: Checking current branch compliance...", COLORS.blue);
  let currentBranch = "";
  try {
    currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch (err) {
    errorLog("Failed to determine current branch.");
    process.exit(1);
  }

  log(`Current branch: '${currentBranch}'`, COLORS.cyan);

  const COMPLIANT_PREFIXES = ["feature/", "bug/", "fix/", "refactor/", "hotfix/"];
  const isCompliant = COMPLIANT_PREFIXES.some((prefix) => currentBranch.startsWith(prefix));

  if (!isCompliant) {
    log(`⚠️ Warning: Current branch '${currentBranch}' is non-compliant (e.g. Master/Main or lacks prefix).`, COLORS.yellow);
    log("Creating a compliant feature or bug branch...", COLORS.yellow);

    let branchType = await question("Select branch type (1: feature, 2: bug/fix, 3: refactor) [1]: ");
    branchType = branchType.trim();
    let prefix = "feature/";
    if (branchType === "2") prefix = "bug/";
    if (branchType === "3") prefix = "refactor/";

    let branchDesc = "";
    while (!branchDesc) {
      branchDesc = await question("Enter a short hyphenated description for the branch (e.g., auth-fixes): ");
      branchDesc = branchDesc.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    }

    const newBranch = `${prefix}${branchDesc}`;

    // Determine the base branch (master or main)
    let baseBranch = "master";
    try {
      const branches = execSync("git branch", { encoding: "utf8" });
      if (branches.includes("main") && !branches.includes("master")) {
        baseBranch = "main";
      }
    } catch (err) {
      // default to master
    }

    log(`\n📦 Stashing your current changes to checkout ${baseBranch}...`, COLORS.blue);
    let didStash = false;
    try {
      execSync("git stash -u", { stdio: "inherit" });
      didStash = true;
      log("✅ Changes stashed.", COLORS.green);
    } catch (err) {
      errorLog("Failed to stash changes. Please commit, stash, or discard them manually.");
      process.exit(1);
    }

    try {
      log(`🔄 Switching to base branch '${baseBranch}'...`, COLORS.blue);
      execSync(`git checkout ${baseBranch}`, { stdio: "inherit" });
      
      log(`📥 Pulling latest updates for '${baseBranch}' from origin...`, COLORS.blue);
      execSync(`git pull origin ${baseBranch}`, { stdio: "inherit" });

      log(`🎋 Creating and switching to new branch '${newBranch}'...`, COLORS.blue);
      execSync(`git checkout -b ${newBranch}`, { stdio: "inherit" });
      currentBranch = newBranch;
      log(`🎋 Successfully created and switched to branch '${currentBranch}'`, COLORS.green);
    } catch (err) {
      errorLog("Failed during git branch checkout / pull operations.");
      // Attempt to recover stashed changes if we stashed
      if (didStash) {
        log("🔄 Attempting to restore stashed changes...", COLORS.yellow);
        try {
          execSync("git stash pop", { stdio: "inherit" });
        } catch (e) {
          // ignore pop failures on cleanup
        }
      }
      process.exit(1);
    }

    if (didStash) {
      log("📥 Restoring stashed changes onto new branch...", COLORS.blue);
      try {
        execSync("git stash pop", { stdio: "inherit" });
        log("✅ Changes restored successfully.", COLORS.green);
      } catch (err) {
        log("⚠️ Conflicts occurred when applying your stashed changes. Please resolve them manually.", COLORS.yellow);
      }
    }
  } else {
    log("✅ Branch complies with workflow standards.", COLORS.green);
  }

  // 4. Commit Changes
  log("\n💾 Step 4: Staging and committing changes...", COLORS.blue);
  let commitMessage = "";
  while (!commitMessage) {
    commitMessage = await question("Enter semantic commit message (e.g., feat: add search): ");
    commitMessage = commitMessage.trim();
  }

  try {
    execSync("git add .", { stdio: "inherit" });
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
    log("✅ Changes committed successfully.", COLORS.green);
  } catch (err) {
    errorLog("Failed to commit changes.");
    process.exit(1);
  }

  // 5. Push Code
  log(`\n📤 Step 5: Pushing branch '${currentBranch}' to remote origin...`, COLORS.blue);
  try {
    execSync(`git push -u origin ${currentBranch}`, { stdio: "inherit" });
    log("✅ Code pushed to GitHub successfully.", COLORS.green + COLORS.bright);
  } catch (err) {
    errorLog("Failed to push changes to remote origin.");
    process.exit(1);
  }

  // 6. Create Pull Request
  log("\n🔀 Step 6: Initiating GitHub Pull Request to 'master'...", COLORS.blue);
  let hasGhCli = false;
  try {
    // Check if GitHub CLI is installed
    const whereCommand = process.platform === "win32" ? "where gh" : "which gh";
    execSync(whereCommand, { stdio: "ignore" });
    hasGhCli = true;
  } catch (err) {
    // GitHub CLI not installed
  }

  const prTitle = commitMessage;
  const prBody = `PR automated via 'npm run code-push' workflow.

### Summary
- Switched/Created branch: \`${currentBranch}\`
- Commit: \`${commitMessage}\`
- Local build & typescript validation: **Passed**`;

  if (hasGhCli) {
    log("GitHub CLI detected. Attempting to create PR automatically...", COLORS.cyan);
    try {
      execSync(`gh pr create --base master --title "${prTitle.replace(/"/g, '\\"')}" --body "${prBody.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
      log("\n🎉 Pull Request created successfully via GitHub CLI!", COLORS.green + COLORS.bright);
    } catch (err) {
      log("\n⚠️ GitHub CLI PR creation failed (is repository set up with remote upstream?). Please create PR manually.", COLORS.yellow);
    }
  } else {
    log("\nGitHub CLI (gh) not detected.", COLORS.yellow);
    log("You can create a Pull Request manually by visiting your repository on GitHub:", COLORS.bright);
    try {
      const remoteUrl = execSync("git config --get remote.origin.url", { encoding: "utf8" }).trim();
      const webUrl = remoteUrl.replace(/\.git$/, "").replace("git@github.com:", "https://github.com/");
      log(`🔗 Compare & Create PR: ${webUrl}/compare/master...${currentBranch}`, COLORS.cyan + COLORS.bright);
    } catch (err) {
      log(`🔗 Visit your repository on GitHub to merge '${currentBranch}' into 'master'.`, COLORS.cyan + COLORS.bright);
    }
  }

  log("\n=========================================", COLORS.green);
  log("🏁 WORKFLOW COMPLETED SUCCESSFULLY!", COLORS.green + COLORS.bright);
  log("=========================================\n", COLORS.green);

  rl.close();
}

run().catch((err) => {
  errorLog(err.message);
  rl.close();
  process.exit(1);
});

#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildManualRequirements,
  buildPreflightSummary,
  detectPlatform,
  renderSummary,
} from "./lib/bootstrap-lib.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const SKILLS_DIR = process.env.CODEX_SKILLS_DIR || path.join(process.env.HOME || process.env.USERPROFILE || "", ".agents", "skills");
const TARGET_SKILL = path.join(SKILLS_DIR, "boss-daily-followup", "SKILL.md");

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    ...options,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function hasCommand(command) {
  const platform = detectPlatform();
  if (platform === "windows") {
    return run("where", [command]).ok;
  }
  return run("sh", ["-lc", `command -v ${command}`]).ok;
}

function canReadBossChatlist() {
  return run("opencli", ["boss", "chatlist", "--limit", "1", "-f", "json"]).ok;
}

function readDoctor() {
  return run("opencli", ["doctor"]);
}

export function runPreflight() {
  const platform = detectPlatform();
  const checks = {
    node: {
      ok: hasCommand("node"),
      detail: "Node.js is required.",
      manual: true,
    },
    npm: {
      ok: hasCommand("npm"),
      detail: "npm is required.",
      manual: true,
    },
    opencli: {
      ok: hasCommand("opencli"),
      detail: "opencli CLI availability",
      autoFixable: true,
      fix: "npm install -g @jackwener/opencli",
    },
    skill: {
      ok: Boolean(TARGET_SKILL) && run("node", ["-e", `process.exit(require('node:fs').existsSync(${JSON.stringify(TARGET_SKILL)}) ? 0 : 1)`]).ok,
      detail: `Installed skill at ${TARGET_SKILL}`,
      autoFixable: true,
      fix: "node scripts/install-skill.mjs",
    },
    browserBridge: {
      ok: false,
      detail: "Browser Bridge extension connectivity",
      manual: true,
    },
    bossLogin: {
      ok: false,
      detail: "Authenticated BOSS chat session",
      manual: true,
    },
  };

  if (checks.opencli.ok) {
    const chatlist = canReadBossChatlist();
    if (chatlist.ok) {
      checks.browserBridge.ok = true;
      checks.browserBridge.manual = false;
      checks.browserBridge.detail = "opencli boss chatlist succeeded";
      checks.bossLogin.ok = true;
      checks.bossLogin.manual = false;
      checks.bossLogin.detail = "BOSS chatlist returned data";
    } else {
      const doctor = readDoctor();
      const combined = `${doctor.stdout}\n${doctor.stderr}`;
      if (/Extension:\s+connected/i.test(combined) || /Connectivity:\s+connected/i.test(combined)) {
        checks.browserBridge.ok = true;
        checks.browserBridge.manual = false;
        checks.browserBridge.detail = "opencli doctor reports extension connected";
      } else {
        checks.browserBridge.detail = "Install/enable Browser Bridge, then rerun bootstrap.";
      }
      checks.bossLogin.detail = "Open BOSS chat in the browser profile used for automation, then rerun bootstrap.";
    }
  }

  const summary = buildPreflightSummary({ platform, checks });
  const manualSteps = buildManualRequirements({
    hasBrowserBridge: checks.browserBridge.ok,
    hasBossLogin: checks.bossLogin.ok,
  });

  return {
    platform,
    checks,
    summary,
    manualSteps,
    repoRoot: REPO_ROOT,
    skillsDir: SKILLS_DIR,
    targetSkill: TARGET_SKILL,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = runPreflight();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderSummary(result.summary, result.checks));
    if (result.manualSteps.length > 0) {
      console.log("Manual next steps:");
      for (const step of result.manualSteps) {
        console.log(`- ${step}`);
      }
    }
  }
  process.exit(result.summary.ok ? 0 : 1);
}

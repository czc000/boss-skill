#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { runPreflight } from "./preflight.mjs";
import { installSkill } from "./install-skill.mjs";
import { renderSummary } from "./lib/bootstrap-lib.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function installOpencliIfNeeded() {
  execFileSync("npm", ["install", "-g", "@jackwener/opencli"], {
    stdio: "inherit",
  });
}

function main() {
  let preflight = runPreflight();

  if (preflight.checks.opencli.ok !== true && preflight.checks.npm.ok === true) {
    console.log("Installing opencli...");
    installOpencliIfNeeded();
    preflight = runPreflight();
  }

  if (preflight.checks.skill.ok !== true) {
    const installed = installSkill();
    console.log(`Installed skill to ${installed.targetSkill}`);
    preflight = runPreflight();
  }

  console.log(renderSummary(preflight.summary, preflight.checks));
  if (preflight.manualSteps.length > 0) {
    console.log("Manual next steps:");
    for (const step of preflight.manualSteps) {
      console.log(`- ${step}`);
    }
  }

  process.exit(preflight.summary.ok ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

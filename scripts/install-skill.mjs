#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const SKILLS_DIR = process.env.CODEX_SKILLS_DIR || path.join(process.env.HOME || process.env.USERPROFILE || "", ".agents", "skills");
const TARGET_DIR = path.join(SKILLS_DIR, "boss-daily-followup");
const SOURCE_SKILL = path.join(REPO_ROOT, "skills", "boss-daily-followup", "SKILL.md");
const TARGET_SKILL = path.join(TARGET_DIR, "SKILL.md");

export function installSkill() {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  const source = fs.readFileSync(SOURCE_SKILL, "utf8");
  const rendered = source.replaceAll("__BOSS_SKILL_ROOT__", REPO_ROOT);
  fs.writeFileSync(TARGET_SKILL, rendered);
  return {
    sourceSkill: SOURCE_SKILL,
    targetSkill: TARGET_SKILL,
    skillsDir: SKILLS_DIR,
    repoRoot: REPO_ROOT,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = installSkill();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("Installed boss-daily-followup skill:");
    console.log(`- ${result.targetSkill}`);
  }
}

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = path.resolve(TEST_DIR, "../src/commands");

for (const command of ["scan-today.mjs", "process-today.mjs", "reply-needs.mjs"]) {
  test(`${command} passes syntax check`, () => {
    const result = spawnSync("node", ["--check", path.join(COMMANDS_DIR, command)], {
      encoding: "utf8",
    });

    assert.equal(
      result.status,
      0,
      `Expected ${command} to pass syntax check.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  });
}

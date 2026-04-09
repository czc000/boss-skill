import test from "node:test";
import assert from "node:assert/strict";

import {
  buildManualRequirements,
  buildPreflightSummary,
  detectPlatform,
} from "../scripts/lib/bootstrap-lib.mjs";

test("detectPlatform maps win32 to windows", () => {
  assert.equal(detectPlatform("win32"), "windows");
});

test("detectPlatform maps darwin to macos", () => {
  assert.equal(detectPlatform("darwin"), "macos");
});

test("detectPlatform maps linux to linux", () => {
  assert.equal(detectPlatform("linux"), "linux");
});

test("buildManualRequirements lists extension and boss login as manual-only steps", () => {
  const steps = buildManualRequirements({
    hasBrowserBridge: false,
    hasBossLogin: false,
  });

  assert.deepEqual(steps, [
    "Install and enable the opencli Browser Bridge extension in Chrome/Chromium.",
    "Log into BOSS Zhipin in the browser profile used for automation.",
  ]);
});

test("buildPreflightSummary separates auto-fixable and manual requirements", () => {
  const summary = buildPreflightSummary({
    platform: "windows",
    checks: {
      node: { ok: true },
      npm: { ok: true },
      opencli: { ok: false, autoFixable: true, fix: "npm install -g @jackwener/opencli" },
      skill: { ok: false, autoFixable: true, fix: "node scripts/install-skill.mjs" },
      browserBridge: { ok: false, manual: true },
      bossLogin: { ok: false, manual: true },
    },
  });

  assert.deepEqual(summary, {
    platform: "windows",
    ok: false,
    autoFixable: [
      {
        id: "opencli",
        fix: "npm install -g @jackwener/opencli",
      },
      {
        id: "skill",
        fix: "node scripts/install-skill.mjs",
      },
    ],
    manualRequired: [
      {
        id: "browserBridge",
      },
      {
        id: "bossLogin",
      },
    ],
  });
});

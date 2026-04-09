export function detectPlatform(platform = process.platform) {
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "macos";
  if (platform === "linux") return "linux";
  return "unknown";
}

export function buildManualRequirements({ hasBrowserBridge, hasBossLogin }) {
  const steps = [];
  if (hasBrowserBridge === false) {
    steps.push("Install and enable the opencli Browser Bridge extension in Chrome/Chromium.");
  }
  if (hasBossLogin === false) {
    steps.push("Log into BOSS Zhipin in the browser profile used for automation.");
  }
  return steps;
}

export function buildPreflightSummary({ platform, checks }) {
  const entries = Object.entries(checks || {});
  const autoFixable = entries
    .filter(([, check]) => check?.ok !== true && check?.autoFixable === true)
    .map(([id, check]) => ({
      id,
      fix: check.fix,
    }));

  const manualRequired = entries
    .filter(([, check]) => check?.ok !== true && check?.manual === true)
    .map(([id]) => ({ id }));

  return {
    platform,
    ok: autoFixable.length === 0 && manualRequired.length === 0,
    autoFixable,
    manualRequired,
  };
}

export function renderSummary(summary, checks = {}) {
  const lines = [
    `Platform: ${summary.platform}`,
    `Overall: ${summary.ok ? "OK" : "ACTION REQUIRED"}`,
  ];

  for (const [id, check] of Object.entries(checks)) {
    const status = check?.ok ? "PASS" : check?.autoFixable ? "AUTO-FIXABLE" : check?.manual ? "MANUAL" : "FAIL";
    const detail = check?.detail ? ` - ${check.detail}` : "";
    lines.push(`- ${id}: ${status}${detail}`);
  }

  if (summary.autoFixable.length > 0) {
    lines.push("Auto-fixable:");
    for (const item of summary.autoFixable) {
      lines.push(`- ${item.id}: ${item.fix}`);
    }
  }

  if (summary.manualRequired.length > 0) {
    lines.push("Manual steps required:");
    for (const item of summary.manualRequired) {
      lines.push(`- ${item.id}`);
    }
  }

  return lines.join("\n");
}

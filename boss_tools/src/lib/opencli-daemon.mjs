const DEFAULT_DAEMON_PORT = 19825;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function daemonPort() {
  return parseInt(process.env.OPENCLI_DAEMON_PORT ?? String(DEFAULT_DAEMON_PORT), 10);
}

function daemonUrl() {
  return `http://127.0.0.1:${daemonPort()}`;
}

let idCounter = 0;

function commandId() {
  idCounter += 1;
  return `cmd_${Date.now()}_${idCounter}`;
}

export function wrapForEval(js) {
  if (typeof js !== "string") return "undefined";
  const code = js.trim();
  if (!code) return "undefined";
  if (/^\([\s\S]*\)\s*\(.*\)\s*$/.test(code)) return code;
  if (/^(async\s+)?(\([^)]*\)|[A-Za-z_]\w*)\s*=>/.test(code)) return `(${code})()`;
  if (/^(async\s+)?function[\s(]/.test(code)) return `(${code})()`;
  return code;
}

export async function checkDaemonStatus({ timeout = 2000 } = {}) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(`${daemonUrl()}/status`, {
        headers: { "X-OpenCLI": "1" },
        signal: controller.signal,
      });
      const data = await res.json();
      return {
        running: true,
        extensionConnected: data.extensionConnected,
        extensionVersion: data.extensionVersion,
      };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { running: false, extensionConnected: false };
  }
}

export async function sendCommand(action, params = {}) {
  const maxRetries = 4;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${daemonUrl()}/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OpenCLI": "1",
        },
        body: JSON.stringify({
          id: commandId(),
          action,
          ...params,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const result = await res.json();
      if (!result.ok) {
        const error = result.error ?? "Daemon command failed";
        const isTransient =
          error.includes("Extension disconnected") ||
          error.includes("Extension not connected") ||
          error.includes("attach failed") ||
          error.includes("no longer exists");
        if (isTransient && attempt < maxRetries) {
          await sleep(1500);
          continue;
        }
        throw new Error(error);
      }
      return result.data;
    } catch (error) {
      const retryable =
        error instanceof TypeError ||
        (error instanceof Error && error.name === "AbortError");
      if (retryable && attempt < maxRetries) {
        await sleep(500);
        continue;
      }
      throw error;
    }
  }

  throw new Error("sendCommand: max retries exhausted");
}

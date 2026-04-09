import path from "node:path";
import { appendLine, writeJson } from "./fs.mjs";
import { dateStamp, nowIso, timestampSlug } from "./time.mjs";

export class RunLogger {
  constructor({ rootDir }) {
    this.rootDir = rootDir;
    this.createdAt = new Date();
    this.runId = timestampSlug(this.createdAt);
    this.logFile = path.join(rootDir, "logs", dateStamp(this.createdAt), `${this.runId}.jsonl`);
    this.summaryFile = path.join(rootDir, "runs", `${this.runId}-summary.json`);
  }

  event(payload) {
    const record = {
      timestamp: nowIso(),
      ...payload,
    };
    appendLine(this.logFile, JSON.stringify(record));
    return record;
  }

  saveSummary(summary) {
    writeJson(this.summaryFile, summary);
    return this.summaryFile;
  }
}

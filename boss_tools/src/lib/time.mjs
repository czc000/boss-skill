export function nowIso() {
  return new Date().toISOString();
}

export function dateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function buildScanSummary({ totalToday, filtered, remaining, skipped, actionable, needsReply = [], errors }) {
  return {
    total_today: totalToday,
    filtered_count: filtered.length,
    remaining_count: remaining.length,
    already_handled_count: skipped.length,
    needs_action_count: actionable.length,
    needs_reply_count: needsReply.length,
    error_count: errors.length,
  };
}

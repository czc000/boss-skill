# boss_tools

Reusable local CLI helpers for BOSS Zhipin operations.

## Commands

- `npm test`
- `node src/commands/scan-today.mjs`
- `node src/commands/process-today.mjs`
- `node src/commands/reply-needs.mjs draft`
- `node src/commands/reply-needs.mjs send --plan-file /path/to/reply-plan.json`

## Output

- Structured run summaries: `runs/`
- Detailed JSONL logs: `logs/YYYY-MM-DD/`

## Guarantees

- Uses one stable `tabId` per run
- Filters `isFiltered === true` before conversation work
- Requires verification after send / request / agree actions
- Separates `needs_reply` drafting from direct batch processing

## Troubleshooting

Check the latest file in `runs/` first, then the matching JSONL file in `logs/`.

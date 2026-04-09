# boss_tools

Reusable local CLI helpers for BOSS Zhipin operations.

## Commands

- `npm test`
- `node src/commands/scan-today.mjs`
- `node src/commands/process-today.mjs`

## Output

- Structured run summaries: `runs/`
- Detailed JSONL logs: `logs/YYYY-MM-DD/`

## Guarantees

- Uses one stable `tabId` per run
- Filters `isFiltered === true` before conversation work
- Requires verification after send / request / agree actions

## Troubleshooting

Check the latest file in `runs/` first, then the matching JSONL file in `logs/`.

# Boss Skill Packaging Plan

Goal: package the current BOSS Zhipin workflow into a portable repository that can be uploaded to GitHub and reused on other machines.

Scope:
- include reusable `boss_tools` code
- include installable `boss-daily-followup` skill
- include sanitized SOP and memory documents
- exclude private logs, run outputs, and personal chat data

Implementation steps:
1. Create the repository skeleton under `boss-skill/`.
2. Copy `boss_tools` source and tests, but exclude `logs/` and `runs/`.
3. Replace machine-specific OpenCLI imports with a local daemon client wrapper.
4. Add top-level docs:
   - setup/install guide
   - daily SOP
   - troubleshooting
   - migration notes
5. Add sanitized memory docs distilled from BOSS-specific memory and recent fixes.
6. Add a skill template plus install script that renders repo-path-specific absolute paths into `~/.agents/skills/`.
7. Add `.gitignore` to keep runtime artifacts and local state out of Git.
8. Run tests and basic verification commands.

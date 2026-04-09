# Migration Notes

This repo is intentionally portable, but it still depends on local browser state.

What moves with Git:
- `boss_tools`
- skill template
- SOP docs
- sanitized operating memory

What does not move with Git:
- Chrome login state
- installed Browser Bridge extension
- opencli global install
- BOSS cookies and authenticated session
- runtime logs and summaries

After cloning on a new machine:
1. Install dependencies.
2. Log into BOSS in Chrome/Chromium.
3. Run host `opencli doctor`.
4. Run `bash scripts/install.sh`.

#!/bin/bash
# Commits and pushes any changes to the tracked server-side files to the
# server-live branch on GitHub, so on-server edits aren't silently lost.
set -e
cd /opt/sovereign-mirror
git add -A
if git diff --cached --quiet; then
  exit 0
fi
git commit -q -m "Auto-snapshot: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -q origin server-live

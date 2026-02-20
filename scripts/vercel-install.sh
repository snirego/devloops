#!/bin/bash
# Vercel install script: exclude mobile app to avoid React 18/19 conflict
sed -i 's|  - apps/\*|  - apps/web\n  - apps/docs\n  - apps/waitlist|' pnpm-workspace.yaml
pnpm install --no-frozen-lockfile

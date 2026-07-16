#!/bin/bash
URL="https://x-access-token:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/caio-padua/Integrative-Health-Engine.git"
git push --force "$URL" ver-l2-dr-claude:ver-l2-dr-claude && echo "✓ TUDO NO GITHUB"

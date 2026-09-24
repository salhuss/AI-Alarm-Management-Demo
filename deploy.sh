#!/bin/bash
set -euo pipefail

# Push code to GitHub and deploy to GitHub Pages.
#
# The token is used transiently and never written to .git/config. An earlier
# version of this script did `git remote add origin https://$GITHUB_TOKEN@...`,
# which persisted the expanded token in plaintext on disk where it showed up
# in `git remote -v`. Passing it per-push instead keeps the stored remote clean.

REPO="github.com/salhuss/AI-Alarm-Management-Demo.git"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# Refuse to publish confidential plant data.
# The public repo must carry only synthetic data; the real values live in
# gitignored paths (see .gitignore). Fail loudly if any are staged.
echo "Checking for confidential plant data..."
CONFIDENTIAL=$(git ls-files | grep -Ei 'cause-and-effect|cause-effect|Tag_Registry|HMI_Standards|Logic_Matrix|FDS|/real/|\.real\.js$' || true)
if [ -n "$CONFIDENTIAL" ]; then
    echo "✗ REFUSING TO PUSH — confidential files are tracked:"
    echo "$CONFIDENTIAL" | sed 's/^/    /'
    echo ""
    echo "  Untrack them:  git rm --cached <file>"
    echo "  They are covered by .gitignore once untracked."
    exit 1
fi
echo "✓ No confidential files tracked"
echo ""

if [ -z "${GITHUB_TOKEN:-}" ]; then
    echo "Pushing $BRANCH using your configured git credentials..."
    git push -u origin "$BRANCH"
else
    echo "Pushing $BRANCH using GITHUB_TOKEN..."
    # Token passed inline for this invocation only — not stored.
    git push "https://${GITHUB_TOKEN}@${REPO}" "$BRANCH"
fi

echo "✓ Code pushed"
echo ""

if [ "$BRANCH" != "main" ]; then
    echo "On branch '$BRANCH', not main — skipping Pages deploy."
    echo "Merge to main first if you want the live demo updated."
    exit 0
fi

echo "Deploying to GitHub Pages..."
npm run deploy
echo ""
echo "✓ Deployment complete"
echo "  https://salhuss.github.io/AI-Alarm-Management-Demo/"

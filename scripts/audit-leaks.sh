#!/bin/bash
# Fail if project-confidential plant data appears in anything git tracks.
#
# This repo is public and deploys to GitHub Pages. Real facility names,
# instrument tags, F&G zone IDs and document numbers must stay in the
# gitignored paths (the reference documents and src/plant/real/).
#
# Checks the tracked tree, not the diff: a diff that deletes a confidential
# file still contains its content, which would make this fail forever.
#
#   ./scripts/audit-leaks.sh
#
# The patterns live in scripts/leak-patterns.local (gitignored), because a
# committed list of the exact strings to look for is itself a labelled index
# of the client and its document series. See leak-patterns.example for the
# format. Without that file only the generic checks below run.

set -uo pipefail
cd "$(dirname "$0")/.."

PATTERN_FILE="scripts/leak-patterns.local"
FAIL=0
TRACKED=$(git ls-files)

# Always-on checks that name nothing confidential.
GENERIC=(
    'ghp_' 'github_pat_'           # GitHub tokens
    'BEGIN RSA PRIVATE KEY'
    'BEGIN OPENSSH PRIVATE KEY'
)

scan() {
    local pat="$1" label="${2:-$1}"
    # -F: literal match, so patterns starting with '-' are not read as options.
    # Exclude this script and the example file, which legitimately contain
    # pattern-shaped text.
    local hits
    hits=$(printf '%s\n' "$TRACKED" \
        | grep -v -e '^scripts/audit-leaks.sh$' -e '^scripts/leak-patterns.example$' \
        | xargs -I{} grep -lnF -- "$pat" {} 2>/dev/null || true)
    if [ -n "$hits" ]; then
        echo "LEAK  $label found in:"
        echo "$hits" | sort -u | sed 's/^/        /'
        FAIL=1
    fi
}

for pat in "${GENERIC[@]}"; do
    scan "$pat"
done

if [ -f "$PATTERN_FILE" ]; then
    COUNT=0
    while IFS= read -r line; do
        [ -z "$line" ] && continue
        case "$line" in \#*) continue ;; esac
        # Report a redacted label so the audit output does not echo the
        # confidential string either.
        scan "$line" "'${line:0:2}…' (pattern $((COUNT + 1)))"
        COUNT=$((COUNT + 1))
    done < "$PATTERN_FILE"
    echo "  (checked $COUNT project pattern(s) from $PATTERN_FILE)"
else
    echo "  NOTE: $PATTERN_FILE not found — only generic secret checks ran."
    echo "        Copy scripts/leak-patterns.example and fill in the real"
    echo "        identifiers to enable project-specific auditing."
fi

# Confidential files must not be tracked, whatever they contain.
DOCS=$(printf '%s\n' "$TRACKED" | grep -Ei 'cause-and-effect|cause-effect|Tag_Registry|HMI_Standards|Logic_Matrix|/real/|\.real\.js$' || true)
if [ -n "$DOCS" ]; then
    echo "LEAK  confidential files are tracked:"
    echo "$DOCS" | sed 's/^/        /'
    FAIL=1
fi

if [ "$FAIL" -eq 0 ]; then
    echo "✓ No confidential plant data in tracked files"
else
    echo ""
    echo "✗ Audit failed — do not push until resolved."
fi
exit $FAIL

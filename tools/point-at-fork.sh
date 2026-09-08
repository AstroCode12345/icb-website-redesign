#!/usr/bin/env bash
#
# Point this checkout, and the admin portal, at the mosque admin's fork.
#
#   ./tools/point-at-fork.sh <owner>/<repo>
#
# e.g. ./tools/point-at-fork.sh icbwayland/icbwayland-website-redesign
#
# What it does:
#   1. checks the fork exists and that you can actually push to it
#   2. renames your own repo's remote to "mine" and makes the fork "origin"
#   3. points the portal's GITHUB_REPO at the fork
#
# What it deliberately does NOT do: touch GITHUB_TOKEN. That is a credential.
# You paste it into .env.local yourself; it should never travel through a
# script, a chat window, or a commit.
set -euo pipefail

TARGET="${1:-}"
# The fork may be named differently from the original, so take the full path
# rather than assuming <admin>/<same-name>.
ADMIN="${TARGET%%/*}"
REPO_NAME="${TARGET#*/}"
SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADMIN_DIR="$(cd "$SITE_DIR/../../Projects/icb-admin" && pwd)"

if [[ -z "$TARGET" || "$TARGET" != */* ]]; then
  echo "Usage: ./tools/point-at-fork.sh <owner>/<repo>" >&2
  echo "  e.g. ./tools/point-at-fork.sh icbwayland/icbwayland-website-redesign" >&2
  exit 1
fi

FORK="https://github.com/${ADMIN}/${REPO_NAME}.git"
echo "Fork: $FORK"
echo

# 1. Does it exist, and can you write to it?
echo "==> Checking the fork exists and you can push to it"
if ! git ls-remote "$FORK" >/dev/null 2>&1; then
  echo "FAILED: cannot reach $FORK" >&2
  echo "  Check the owner and repo name." >&2
  exit 1
fi
echo "    fork is reachable"

# git ls-remote succeeds for read access, so ask GitHub whether you may push.
if command -v gh >/dev/null 2>&1; then
  PERM=$(gh api "repos/${ADMIN}/${REPO_NAME}" --jq '.permissions.push' 2>/dev/null || echo "unknown")
  if [[ "$PERM" == "true" ]]; then
    echo "    you have push access"
  elif [[ "$PERM" == "false" ]]; then
    echo "FAILED: you can read the fork but not push to it." >&2
    echo "  Ask the admin to add you under Settings > Collaborators, and accept the invite." >&2
    exit 1
  else
    echo "    could not confirm push access (gh not logged in); continuing"
  fi
else
  echo "    'gh' not installed, skipping the push-access check"
fi
echo

# 2. Rewire the site repo.
cd "$SITE_DIR"
echo "==> Rewiring $SITE_DIR"
CURRENT=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "$CURRENT" == "$FORK" ]]; then
  echo "    origin already points at the fork"
else
  if git remote get-url mine >/dev/null 2>&1; then
    echo "    remote 'mine' already exists, leaving it alone"
  else
    git remote rename origin mine
    echo "    your old repo is now the remote 'mine'"
  fi
  git remote add origin "$FORK"
  echo "    origin now points at the fork"
fi

git fetch origin --quiet
git branch --set-upstream-to=origin/main main >/dev/null 2>&1 || true
echo "    main now tracks origin/main"
echo

# 3. Point the portal at the fork. Only the repo name, never the token.
echo "==> Pointing the portal at the fork"
ENV_FILE="$ADMIN_DIR/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  if grep -q '^GITHUB_REPO=' "$ENV_FILE"; then
    # macOS sed needs the empty -i argument.
    sed -i '' "s|^GITHUB_REPO=.*|GITHUB_REPO=${ADMIN}/${REPO_NAME}|" "$ENV_FILE"
  else
    printf '\nGITHUB_REPO=%s/%s\n' "$ADMIN" "$REPO_NAME" >> "$ENV_FILE"
  fi
  echo "    GITHUB_REPO=${ADMIN}/${REPO_NAME}"
else
  echo "    no .env.local found at $ENV_FILE; set GITHUB_REPO there yourself"
fi
echo

cat <<EOF
Done. Two things are still yours to do by hand:

  1. GITHUB_TOKEN in $ENV_FILE
     Your own token works: you are a collaborator, so it has write access to
     the fork. Make one at https://github.com/settings/tokens with 'repo'
     scope. Paste it into the file yourself. Never commit it.

  2. Push your local work to the fork:
       cd "$SITE_DIR" && git push origin main

Check it worked:
    git remote -v          # origin = the fork, mine = your own copy
    git log --oneline -1 origin/main
EOF

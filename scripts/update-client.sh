#!/usr/bin/env bash
#
# update-client.sh — push template bug-fixes/features into a client repo.
#
# Client repos are created from this template, so they share NO git history
# with it (a template repo is not a fork). This script brings selected fix
# commits over by cherry-picking them onto the client's branch, then pushing.
#
# Usage:
#   bash update-client.sh <client-repo-url> [commitA commitB ...]
#
#   <client-repo-url>   e.g. https://github.com/imransadik089/noorin.git
#   [commits...]        optional. Which TEMPLATE commit SHAs to cherry-pick.
#                       If omitted, uses DEFAULT_FIXES below.
#
# Requirements:
#   - git + gh CLI authenticated as an account that is a COLLABORATOR on the
#     client repo (so `git push` is allowed).
#
# Notes:
#   - A commit already present in the client (empty cherry-pick) is skipped.
#   - On a real conflict the script stops and prints where to resolve it.
#   - The maroon SUFIYA theme commit (3f58f12) is intentionally NOT in the
#     default list — each client sets its own colours from the admin panel.
#
set -euo pipefail

TEMPLATE_URL="https://github.com/sofistorebd/IhdaShop.git"

# Maintained list of shippable fix/feature commits, oldest -> newest.
# Add new template fix SHAs here as you make them.
DEFAULT_FIXES=(
  43e5598   # public navbar light bg (logo visible fix)
  84f0c69   # logo resize + favicon (web icon) upload
  4aba265   # remove default favicon.ico so admin favicon applies
  79c45fa   # admin navbar light bg fix
  c3b9b31   # Meta Conversions API (server Purchase + browser dedup)
)

CLIENT_URL="${1:-}"
if [ -z "$CLIENT_URL" ]; then
  echo "Usage: bash update-client.sh <client-repo-url> [commits...]" >&2
  exit 1
fi
shift || true

if [ "$#" -gt 0 ]; then
  FIXES=("$@")
else
  FIXES=("${DEFAULT_FIXES[@]}")
fi

WORK="$(mktemp -d)"
cleanup() { cd / 2>/dev/null || true; rm -rf "$WORK"; }
trap cleanup EXIT

echo "▶ Cloning $CLIENT_URL ..."
git clone --quiet "$CLIENT_URL" "$WORK/repo"
cd "$WORK/repo"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

echo "▶ Adding template remote + fetching ..."
git remote add template "$TEMPLATE_URL"
git fetch --quiet template

echo "▶ Cherry-picking ${#FIXES[@]} commit(s) onto '$BRANCH' ..."
for sha in "${FIXES[@]}"; do
  printf '   → %s ' "$sha"
  if git cherry-pick -x "$sha" >/dev/null 2>&1; then
    echo "applied"
  elif git diff --quiet && git diff --cached --quiet; then
    git cherry-pick --skip >/dev/null 2>&1 || true
    echo "already present — skipped"
  else
    echo "CONFLICT"
    echo ""
    echo "‼ Conflict on $sha. Resolve it here:"
    echo "    $WORK/repo"
    echo "  Then run:"
    echo "    git add . && git cherry-pick --continue && git push origin $BRANCH"
    echo "  (script left the working copy in place; temp dir NOT auto-deleted)"
    trap - EXIT   # keep the dir so the user can finish manually
    exit 1
  fi
done

echo "▶ Pushing to client ($BRANCH) ..."
git push --quiet origin "$BRANCH"
echo "✅ Done — $CLIENT_URL updated."

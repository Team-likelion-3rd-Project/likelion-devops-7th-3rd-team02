#!/bin/sh
set -eu

: "${GITOPS_REPO_URL:?GITOPS_REPO_URL is required}"
: "${GITOPS_TOKEN:?GITOPS_TOKEN is required (masked Actions secret, contents:write)}"
: "${GITOPS_RELEASE_COMMIT:?GITOPS_RELEASE_COMMIT is required (release commit to revert; no default)}"
GITOPS_BRANCH="${GITOPS_BRANCH:-main}"
GITOPS_TOKEN_USER="${GITOPS_TOKEN_USER:-x-access-token}"

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

mask() {
  sed "s#$GITOPS_TOKEN#***#g" "$1"
}

AUTH_URL=$(printf '%s' "$GITOPS_REPO_URL" | sed "s#https://#https://${GITOPS_TOKEN_USER}:${GITOPS_TOKEN}@#")

echo "=== Clone GitOps repository (branch: $GITOPS_BRANCH) ==="
if ! git clone "$AUTH_URL" "$WORKDIR/repo" > "$WORKDIR/git.log" 2>&1; then   # full clone: verification/revert need release history
  mask "$WORKDIR/git.log"
  echo "ERROR: clone of $GITOPS_REPO_URL failed"
  exit 1
fi
cd "$WORKDIR/repo"
git remote set-url origin "$GITOPS_REPO_URL"
git checkout --quiet "$GITOPS_BRANCH"

echo "=== Verify rollback target is an actual GitOps release commit ==="
if ! git cat-file -e "${GITOPS_RELEASE_COMMIT}^{commit}" 2>/dev/null; then
  echo "ERROR: GITOPS_RELEASE_COMMIT=$GITOPS_RELEASE_COMMIT is not a commit in this repository"
  exit 1
fi
if ! git merge-base --is-ancestor "$GITOPS_RELEASE_COMMIT" HEAD; then
  echo "ERROR: $GITOPS_RELEASE_COMMIT is not part of branch $GITOPS_BRANCH"
  exit 1
fi
SUBJECT=$(git log -1 --format='%s' "$GITOPS_RELEASE_COMMIT")
case "$SUBJECT" in
  release:*) ;;
  *)
    echo "ERROR: refusing to revert non-release commit $GITOPS_RELEASE_COMMIT (subject: $SUBJECT)"
    exit 1
    ;;
esac
TOUCHED=$(git show --pretty=format: --name-only "$GITOPS_RELEASE_COMMIT" | grep -v '^[[:space:]]*$' | sort -u)
if [ -z "$TOUCHED" ]; then
  echo "ERROR: release commit $GITOPS_RELEASE_COMMIT changes no files"
  exit 1
fi
for F in $TOUCHED; do
  case "$F" in
    values/aws-dev.yaml | applications/devflow.yaml) ;;
    *)
      echo "ERROR: commit $GITOPS_RELEASE_COMMIT touches unrelated file: $F — refusing revert"
      exit 1
      ;;
  esac
done
echo "Target OK: '$SUBJECT'"

echo "=== Revert release commit: $GITOPS_RELEASE_COMMIT ==="
git config user.name "github-actions-gitops"
git config user.email "actions@github.com"
git revert --no-edit "$GITOPS_RELEASE_COMMIT"

echo "=== Resulting desired state ==="
for F in values/aws-dev.yaml applications/devflow.yaml; do
  if [ ! -f "$F" ]; then
    echo "ERROR: desired-state file $F is missing after revert (unexpected repo state) — aborting before push"
    exit 1
  fi
done
grep -n 'tag:' values/aws-dev.yaml || true
grep -nE 'targetRevision: "[0-9a-f]{40}"' applications/devflow.yaml || true

if ! git push --quiet "$AUTH_URL" "HEAD:$GITOPS_BRANCH" > "$WORKDIR/git.log" 2>&1; then
  mask "$WORKDIR/git.log"
  echo "ERROR: push to $GITOPS_REPO_URL ($GITOPS_BRANCH) failed"
  exit 1
fi
echo "=== Revert pushed; Argo CD reconciles to previous desired state ==="

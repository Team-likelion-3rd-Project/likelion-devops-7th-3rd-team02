#!/bin/sh
set -eu

<<<<<<< HEAD
: "${GITOPS_REPO_URL:?GITOPS_REPO_URL is required (e.g. https://github.com/<org>/<repo>-gitops.git)}"
: "${GITOPS_TOKEN:?GITOPS_TOKEN is required (masked Actions secret, contents:write on the GitOps repo)}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"
GITOPS_BRANCH="${GITOPS_BRANCH:-main}"
GITOPS_TOKEN_USER="${GITOPS_TOKEN_USER:-x-access-token}"
GITHUB_SHA_SHORT="${GITHUB_SHA_SHORT:-$(printf '%s' "$GITHUB_SHA" | cut -c1-8)}"
GITHUB_RUN_URL="${GITHUB_RUN_URL:-https://github.com/${GITHUB_REPOSITORY:-unknown}/actions}"
=======
: "${GITOPS_REPO_URL:?GITOPS_REPO_URL is required (e.g. https://gitlab.example/root/devflow-gitops.git)}"
: "${GITOPS_TOKEN:?GITOPS_TOKEN is required (masked CI variable, write_repository scope on the GitOps repo)}"
: "${CI_COMMIT_SHA:?CI_COMMIT_SHA is required}"
: "${CI_COMMIT_SHORT_SHA:?CI_COMMIT_SHORT_SHA is required}"
GITOPS_BRANCH="${GITOPS_BRANCH:-main}"
>>>>>>> origin/develop

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

<<<<<<< HEAD
mask() {
  sed "s#$GITOPS_TOKEN#***#g" "$1"
}

AUTH_URL=$(printf '%s' "$GITOPS_REPO_URL" | sed "s#https://#https://${GITOPS_TOKEN_USER}:${GITOPS_TOKEN}@#")

echo "=== Clone GitOps repository (branch: $GITOPS_BRANCH) ==="
if ! git clone --quiet --depth 1 --branch "$GITOPS_BRANCH" "$AUTH_URL" "$WORKDIR/repo" > "$WORKDIR/git.log" 2>&1; then
  mask "$WORKDIR/git.log"
  echo "ERROR: clone of $GITOPS_REPO_URL failed"
  exit 1
fi
cd "$WORKDIR/repo"
git remote set-url origin "$GITOPS_REPO_URL"

if grep -q '<IMAGE_TAG>' values/aws-dev.yaml && ! grep -q 'ghcr.io/' values/aws-dev.yaml; then
  echo "WARNING: values/aws-dev.yaml keeps the <IMAGE_TAG> placeholder for an authenticated registry"
  echo "WARNING: no GitOps release commit created - existing deployment path is unchanged"
  exit 0
fi

echo "=== Set image tags to $GITHUB_SHA_SHORT ==="
sed -i "s#tag: \"[^\"]*\"#tag: \"$GITHUB_SHA_SHORT\"#g" values/aws-dev.yaml

echo "=== Pin chart revision to immutable SHA $GITHUB_SHA ==="
sed -i -E "s#(targetRevision: \")[0-9a-f]{40}(\")#\1${GITHUB_SHA}\2#" applications/devflow.yaml

echo "=== Guard: desired state is complete and immutable ==="
if grep -q '<IMAGE_TAG>' values/aws-dev.yaml; then
  echo "ERROR: image tag placeholder remains in values/aws-dev.yaml (unquoted or renamed tag field?)"
  exit 1
fi
if grep -q '<RDS_HOST>' values/aws-dev.yaml; then
  echo "WARNING: values/aws-dev.yaml still contains the <RDS_HOST> placeholder - fill it before syncing"
fi
=======
echo "=== Clone GitOps repository (branch: $GITOPS_BRANCH) ==="
AUTH_URL=$(printf '%s' "$GITOPS_REPO_URL" | sed "s#https://#https://oauth2:${GITOPS_TOKEN}@#")
git clone --quiet --depth 1 --branch "$GITOPS_BRANCH" "$AUTH_URL" "$WORKDIR/repo"
cd "$WORKDIR/repo"

echo "=== Set image tags to $CI_COMMIT_SHORT_SHA ==="
sed -i "s#tag: \"[^\"]*\"#tag: \"$CI_COMMIT_SHORT_SHA\"#g" values/aws-dev.yaml

echo "=== Pin chart revision to immutable SHA $CI_COMMIT_SHA ==="
sed -i -E "s#(targetRevision: \")[0-9a-f]{40}(\")#\1${CI_COMMIT_SHA}\2#" applications/devflow.yaml

echo "=== Guard: desired state is complete and immutable ==="
if grep -q '<IMAGE_TAG>' values/aws-dev.yaml; then
  echo "ERROR: image tag placeholder remains in values/aws-dev.yaml"
  exit 1
fi
>>>>>>> origin/develop
if grep -q 'targetRevision: "0\{40\}"' applications/devflow.yaml; then
  echo "ERROR: chart targetRevision is still the 0000... placeholder"
  exit 1
fi
<<<<<<< HEAD
if ! grep -q "targetRevision: \"$GITHUB_SHA\"" applications/devflow.yaml; then
  echo "ERROR: chart targetRevision was not replaced with GITHUB_SHA (mutable or stale reference?)"
=======
if ! grep -q "targetRevision: \"$CI_COMMIT_SHA\"" applications/devflow.yaml; then
  echo "ERROR: chart targetRevision was not replaced with CI_COMMIT_SHA (mutable or stale reference?)"
>>>>>>> origin/develop
  exit 1
fi

echo "=== Commit and push single release commit ==="
<<<<<<< HEAD
git config user.name "github-actions-gitops"
git config user.email "actions@github.com"
=======
git config user.name "gitlab-ci-gitops"
git config user.email "gitlab-ci@localhost"
>>>>>>> origin/develop
git add values/aws-dev.yaml applications/devflow.yaml
if git diff --cached --quiet; then
  echo "No desired-state change (same tags/SHA). Skipping commit."
  exit 0
fi
<<<<<<< HEAD
git commit -m "release: dev image $GITHUB_SHA_SHORT chart $GITHUB_SHA" \
           -m "workflow: $GITHUB_RUN_URL"
if ! git push --quiet "$AUTH_URL" "HEAD:$GITOPS_BRANCH" > "$WORKDIR/git.log" 2>&1; then
  mask "$WORKDIR/git.log"
  echo "ERROR: push to $GITOPS_REPO_URL ($GITOPS_BRANCH) failed"
  exit 1
fi
=======
git commit -m "release: dev image $CI_COMMIT_SHORT_SHA chart $CI_COMMIT_SHA" \
           -m "pipeline: $CI_PIPELINE_URL"
git push --quiet origin "HEAD:$GITOPS_BRANCH"
>>>>>>> origin/develop
echo "=== GitOps release commit created ==="

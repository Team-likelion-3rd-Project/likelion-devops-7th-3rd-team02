#!/bin/sh
set -eu

: "${GITOPS_REPO_URL:?GITOPS_REPO_URL is required (e.g. https://gitlab.example/root/devflow-gitops.git)}"
: "${GITOPS_TOKEN:?GITOPS_TOKEN is required (masked CI variable, write_repository scope on the GitOps repo)}"
: "${CI_COMMIT_SHA:?CI_COMMIT_SHA is required}"
: "${CI_COMMIT_SHORT_SHA:?CI_COMMIT_SHORT_SHA is required}"
GITOPS_BRANCH="${GITOPS_BRANCH:-main}"

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

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
if grep -q 'targetRevision: "0\{40\}"' applications/devflow.yaml; then
  echo "ERROR: chart targetRevision is still the 0000... placeholder"
  exit 1
fi
if ! grep -q "targetRevision: \"$CI_COMMIT_SHA\"" applications/devflow.yaml; then
  echo "ERROR: chart targetRevision was not replaced with CI_COMMIT_SHA (mutable or stale reference?)"
  exit 1
fi

echo "=== Commit and push single release commit ==="
git config user.name "gitlab-ci-gitops"
git config user.email "gitlab-ci@localhost"
git add values/aws-dev.yaml applications/devflow.yaml
if git diff --cached --quiet; then
  echo "No desired-state change (same tags/SHA). Skipping commit."
  exit 0
fi
git commit -m "release: dev image $CI_COMMIT_SHORT_SHA chart $CI_COMMIT_SHA" \
           -m "pipeline: $CI_PIPELINE_URL"
git push --quiet origin "HEAD:$GITOPS_BRANCH"
echo "=== GitOps release commit created ==="

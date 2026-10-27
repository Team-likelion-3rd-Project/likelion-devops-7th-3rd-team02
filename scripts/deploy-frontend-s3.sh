#!/bin/sh
set -eu

: "${FRONTEND_S3_BUCKET:?FRONTEND_S3_BUCKET is required (terraform output frontend_s3_bucket)}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?CLOUDFRONT_DISTRIBUTION_ID is required (terraform output frontend_cloudfront_distribution_id)}"
AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-ap-northeast-1}"
export AWS_DEFAULT_REGION

DIST_DIR="${1:-frontend/dist}"

if [ ! -f "$DIST_DIR/index.html" ]; then
  echo "ERROR: $DIST_DIR/index.html missing - refusing to sync (run frontend-build first / wrong path?)"
  exit 1
fi

BUCKET_URI="s3://$FRONTEND_S3_BUCKET"

echo "=== Sync hashed assets (immutable, 1y) ==="
if [ -d "$DIST_DIR/assets" ]; then
  aws s3 sync "$DIST_DIR/assets" "$BUCKET_URI/assets" \
    --delete --exact-timestamps \
    --cache-control "public,max-age=31536000,immutable"
fi

echo "=== Sync remaining files (no-cache so CloudFront revalidates index.html) ==="
# filter, so the immutable subtree is untouched.
aws s3 sync "$DIST_DIR" "$BUCKET_URI" \
  --delete --exclude "assets/*" \
  --cache-control "public,max-age=0,no-cache"

echo "=== Invalidate CloudFront ==="
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths "/*"

echo "=== Frontend deployed to $BUCKET_URI ==="

#!/bin/bash

# Health check script for monitoring
# Usage: ./scripts/health-check.sh [API_URL]

API_URL="${1:-http://localhost:8787}"

echo "🏥 SyncPact Health Check"
echo "========================"
echo "Checking: ${API_URL}/api/health"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/api/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API is healthy!"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 0
else
    echo "❌ API is unhealthy (HTTP $HTTP_CODE)"
    echo ""
    echo "Response:"
    echo "$BODY"
    exit 1
fi

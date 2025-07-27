#!/bin/bash

# S3 Migration Dashboard - Screenshot Generation Helper
# This script helps organize and prepare UI screenshots for the README

set -e

echo "🖼️  S3 Migration Dashboard - Screenshot Helper"
echo "=============================================="
echo ""

# Create images directory if it doesn't exist
mkdir -p docs/images

echo "📁 Images directory ready: docs/images/"
echo ""

# Check if application is running
echo "🔍 Checking if application is running..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Application is running at http://localhost:3000"
else
    echo "❌ Application is not running. Please start it first:"
    echo "   npm run dev"
    echo ""
    exit 1
fi

echo ""
echo "📸 Please take the following screenshots:"
echo ""

screenshots=(
    "dashboard-overview.png|Main Dashboard|http://localhost:3000"
    "configuration.png|Configuration Tab|http://localhost:3000 (click Configure tab)"
    "migration-wizard.png|Migration Tab|http://localhost:3000 (click Migrate tab)"
    "progress-monitoring.png|Progress Monitoring|http://localhost:3000 (during active migration)"
    "migration-history.png|Migration History|http://localhost:3000 (click History tab)"
    "log-viewer.png|Log Viewer|http://localhost:3000 (click Logs tab)"
)

for i in "${!screenshots[@]}"; do
    IFS='|' read -r filename title url <<< "${screenshots[$i]}"
    echo "$((i+1)). $title"
    echo "   File: docs/images/$filename"
    echo "   URL:  $url"
    echo ""
done

echo "💡 Screenshot Tips:"
echo "   • Use consistent browser width (1200px recommended)"
echo "   • Capture clean, professional-looking UI states"
echo "   • Include some sample data for better demonstration"
echo "   • Save as PNG format for best quality"
echo ""

echo "📝 After taking screenshots:"
echo "   1. Save them in docs/images/ with the exact filenames above"
echo "   2. Run: ./scripts/enable-screenshots.sh"
echo "   3. Commit and push: git add . && git commit -m 'docs: Add UI screenshots' && git push"
echo ""

echo "🚀 Alternative: Use this placeholder script to enable screenshots:"
echo "   ./scripts/enable-screenshots.sh --placeholder"
echo ""
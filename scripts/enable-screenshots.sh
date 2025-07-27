#!/bin/bash

# S3 Migration Dashboard - Enable Screenshots in README
# This script uncomments the screenshot image tags in README.md

set -e

echo "🖼️  Enabling Screenshots in README"
echo "================================="
echo ""

README_FILE="README.md"

if [ ! -f "$README_FILE" ]; then
    echo "❌ README.md not found!"
    exit 1
fi

# Function to enable screenshots
enable_screenshots() {
    echo "📝 Enabling screenshot images in README.md..."
    
    # Uncomment the image lines
    sed -i.bak 's/<!-- \(!\[.*\](docs\/images\/.*\.png)\) -->/\1/g' "$README_FILE"
    
    echo "✅ Screenshots enabled in README.md"
    echo ""
}

# Function to create placeholder images
create_placeholders() {
    echo "🎨 Creating placeholder images..."
    
    # Create simple placeholder images using ImageMagick (if available)
    if command -v convert >/dev/null 2>&1; then
        screenshots=(
            "dashboard-overview.png"
            "configuration.png"
            "migration-wizard.png"
            "progress-monitoring.png"
            "migration-history.png"
            "log-viewer.png"
        )
        
        for screenshot in "${screenshots[@]}"; do
            if [ ! -f "docs/images/$screenshot" ]; then
                echo "  Creating placeholder: $screenshot"
                convert -size 1200x800 xc:lightblue \
                    -pointsize 48 -fill darkblue \
                    -gravity center -annotate +0+0 "UI Screenshot\n$screenshot\n\nReplace with actual screenshot" \
                    "docs/images/$screenshot"
            fi
        done
        
        echo "✅ Placeholder images created"
    else
        echo "⚠️  ImageMagick not found. Please add actual screenshots manually to docs/images/"
    fi
    echo ""
}

# Check command line arguments
if [ "$1" = "--placeholder" ]; then
    create_placeholders
fi

# Check if screenshot files exist
missing_screenshots=()
screenshots=(
    "dashboard-overview.png"
    "configuration.png"
    "migration-wizard.png"
    "progress-monitoring.png"
    "migration-history.png"
    "log-viewer.png"
)

for screenshot in "${screenshots[@]}"; do
    if [ ! -f "docs/images/$screenshot" ]; then
        missing_screenshots+=("$screenshot")
    fi
done

if [ ${#missing_screenshots[@]} -gt 0 ]; then
    echo "⚠️  Missing screenshot files:"
    for missing in "${missing_screenshots[@]}"; do
        echo "   - docs/images/$missing"
    done
    echo ""
    
    if [ "$1" = "--placeholder" ]; then
        create_placeholders
    else
        echo "💡 To create placeholder images, run:"
        echo "   $0 --placeholder"
        echo ""
        echo "📸 Or take actual screenshots and save them with the names above."
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Cancelled."
            exit 1
        fi
    fi
fi

# Enable screenshots in README
enable_screenshots

echo "🎉 Screenshot setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review the changes in README.md"
echo "   2. Replace placeholder images with actual screenshots if needed"
echo "   3. Commit changes: git add . && git commit -m 'docs: Enable UI screenshots'"
echo "   4. Push to GitHub: git push origin main"
echo ""
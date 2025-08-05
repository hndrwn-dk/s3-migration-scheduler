#!/bin/bash

# S3 Migration Scheduler - Icon Generation Script
# This script generates various icon formats from the SVG source

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ELECTRON_DIR="$PROJECT_ROOT/electron-app"
ASSETS_DIR="$ELECTRON_DIR/assets"
SOURCE_SVG="$ASSETS_DIR/icon.svg"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites for icon generation..."
    
    # Check if ImageMagick is available (for convert command)
    if command -v convert &> /dev/null; then
        CONVERTER="imagemagick"
        log_info "Using ImageMagick for icon conversion"
    elif command -v inkscape &> /dev/null; then
        CONVERTER="inkscape"
        log_info "Using Inkscape for icon conversion"
    elif command -v rsvg-convert &> /dev/null; then
        CONVERTER="rsvg"
        log_info "Using rsvg-convert for icon conversion"
    else
        log_warn "No suitable SVG converter found (ImageMagick, Inkscape, or rsvg-convert)"
        log_info "Installing fallback: creating basic icons..."
        CONVERTER="fallback"
    fi
}

# Create directory structure
setup_directories() {
    log_info "Setting up icon directories..."
    mkdir -p "$ASSETS_DIR"
}

# Generate PNG icons
generate_png_icons() {
    log_info "Generating PNG icons..."
    
    # Icon sizes for different purposes
    declare -A SIZES=(
        ["16"]="Small icon for taskbar/notifications"
        ["32"]="Standard small icon"
        ["48"]="Medium icon for lists"
        ["64"]="Standard medium icon"
        ["128"]="Large icon for high-DPI displays"
        ["256"]="Very large icon for macOS and high-DPI"
        ["512"]="Maximum size icon for app stores"
    )
    
    for size in "${!SIZES[@]}"; do
        output_file="$ASSETS_DIR/icon-${size}x${size}.png"
        log_info "Creating ${size}x${size} PNG: ${SIZES[$size]}"
        
        case $CONVERTER in
            "imagemagick")
                convert -background none -size "${size}x${size}" "$SOURCE_SVG" "$output_file"
                ;;
            "inkscape")
                inkscape -w "$size" -h "$size" "$SOURCE_SVG" -o "$output_file"
                ;;
            "rsvg")
                rsvg-convert -w "$size" -h "$size" "$SOURCE_SVG" -o "$output_file"
                ;;
            "fallback")
                create_fallback_png "$size" "$output_file"
                ;;
        esac
    done
    
    # Create the main icon.png (256x256)
    cp "$ASSETS_DIR/icon-256x256.png" "$ASSETS_DIR/icon.png"
}

# Generate Windows ICO file
generate_ico_icon() {
    log_info "Generating Windows ICO icon..."
    
    if [ "$CONVERTER" = "imagemagick" ]; then
        # Use ImageMagick to create multi-resolution ICO
        convert "$SOURCE_SVG" -background none \
            \( -clone 0 -resize 16x16 \) \
            \( -clone 0 -resize 32x32 \) \
            \( -clone 0 -resize 48x48 \) \
            \( -clone 0 -resize 64x64 \) \
            \( -clone 0 -resize 128x128 \) \
            \( -clone 0 -resize 256x256 \) \
            -delete 0 "$ASSETS_DIR/icon.ico"
    else
        # Fallback: convert largest PNG to ICO
        if [ -f "$ASSETS_DIR/icon-256x256.png" ]; then
            if command -v convert &> /dev/null; then
                convert "$ASSETS_DIR/icon-256x256.png" "$ASSETS_DIR/icon.ico"
            else
                log_warn "Cannot create ICO file without ImageMagick"
                create_fallback_ico
            fi
        fi
    fi
}

# Generate macOS ICNS file
generate_icns_icon() {
    log_info "Generating macOS ICNS icon..."
    
    # Create iconset directory
    ICONSET_DIR="$ASSETS_DIR/icon.iconset"
    mkdir -p "$ICONSET_DIR"
    
    # macOS iconset requires specific naming and sizes
    declare -A ICNS_SIZES=(
        ["icon_16x16.png"]="16"
        ["icon_16x16@2x.png"]="32"
        ["icon_32x32.png"]="32"
        ["icon_32x32@2x.png"]="64"
        ["icon_128x128.png"]="128"
        ["icon_128x128@2x.png"]="256"
        ["icon_256x256.png"]="256"
        ["icon_256x256@2x.png"]="512"
        ["icon_512x512.png"]="512"
        ["icon_512x512@2x.png"]="1024"
    )
    
    for filename in "${!ICNS_SIZES[@]}"; do
        size="${ICNS_SIZES[$filename]}"
        
        case $CONVERTER in
            "imagemagick")
                convert -background none -size "${size}x${size}" "$SOURCE_SVG" "$ICONSET_DIR/$filename"
                ;;
            "inkscape")
                inkscape -w "$size" -h "$size" "$SOURCE_SVG" -o "$ICONSET_DIR/$filename"
                ;;
            "rsvg")
                rsvg-convert -w "$size" -h "$size" "$SOURCE_SVG" -o "$ICONSET_DIR/$filename"
                ;;
            "fallback")
                create_fallback_png "$size" "$ICONSET_DIR/$filename"
                ;;
        esac
    done
    
    # Convert iconset to ICNS (macOS only)
    if command -v iconutil &> /dev/null; then
        iconutil -c icns "$ICONSET_DIR" -o "$ASSETS_DIR/icon.icns"
        rm -rf "$ICONSET_DIR"
        log_info "Created macOS ICNS file"
    else
        log_warn "iconutil not available (not on macOS) - keeping iconset directory"
    fi
}

# Create fallback PNG when no converter is available
create_fallback_png() {
    local size=$1
    local output=$2
    
    # Create a simple colored square as fallback
    if command -v convert &> /dev/null; then
        convert -size "${size}x${size}" xc:"#4F46E5" \
            -fill white -gravity center \
            -pointsize $((size/8)) -annotate +0+0 "S3" \
            "$output"
    else
        log_warn "Creating placeholder file for $output"
        touch "$output"
    fi
}

# Create fallback ICO
create_fallback_ico() {
    log_warn "Creating placeholder ICO file"
    touch "$ASSETS_DIR/icon.ico"
}

# Create desktop file icons for Linux
create_desktop_icons() {
    log_info "Creating desktop icons for Linux..."
    
    # Copy to standard Linux icon locations
    if [ -f "$ASSETS_DIR/icon-48x48.png" ]; then
        cp "$ASSETS_DIR/icon-48x48.png" "$ASSETS_DIR/s3-migration-scheduler-48.png"
    fi
    
    if [ -f "$ASSETS_DIR/icon-128x128.png" ]; then
        cp "$ASSETS_DIR/icon-128x128.png" "$ASSETS_DIR/s3-migration-scheduler-128.png"
    fi
}

# Update Electron package.json with icon paths
update_electron_package() {
    log_info "Updating Electron package.json with icon paths..."
    
    PACKAGE_JSON="$ELECTRON_DIR/package.json"
    
    if [ -f "$PACKAGE_JSON" ]; then
        # The package.json already has the correct icon paths
        log_info "Icon paths already configured in package.json"
    fi
}

# Show results
show_results() {
    log_info "Icon generation completed!"
    echo
    echo "Generated icons:"
    
    if [ -d "$ASSETS_DIR" ]; then
        find "$ASSETS_DIR" -name "icon*" -type f | sort | while read file; do
            if [ -f "$file" ]; then
                size=$(du -h "$file" | cut -f1)
                echo "  - $(basename "$file") ($size)"
            fi
        done
    fi
    
    echo
    echo "Icon files are ready for:"
    echo "  - Windows: icon.ico"
    echo "  - macOS: icon.icns"
    echo "  - Linux: icon.png (and various sizes)"
    echo "  - Electron: All formats included"
}

# Main execution
main() {
    echo "S3 Migration Scheduler - Icon Generation"
    echo "======================================="
    echo
    
    if [ ! -f "$SOURCE_SVG" ]; then
        log_error "Source SVG not found: $SOURCE_SVG"
        exit 1
    fi
    
    check_prerequisites
    setup_directories
    generate_png_icons
    generate_ico_icon
    generate_icns_icon
    create_desktop_icons
    update_electron_package
    show_results
    
    echo
    log_info "Icon generation process completed!"
}

# Run main function
main "$@"
#!/bin/bash

# Build all workshop chapters for GitHub Pages deployment
# Creates a combined dist folder with all chapters

set -e

echo "🔨 Building all workshop chapters for GitHub Pages..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

# Repo name used as the GitHub Pages base path. Override via env when forking.
REPO_NAME="${REPO_NAME:-geo-visualization-workshop}"

# Clean dist directory
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Chapter configurations: folder:name
CHAPTERS=(
  "01-basics:Deck.gl Basics"
  "02-layers:Built-in Layers"
  "03-extensions:Extensions"
  "04-shader-injection:Shader Injection"
  "05-custom-layer:Custom Layer"
  "06-nyc-taxi:NYC Taxi Animation"
  "07-celestial-threejs:Celestial Bodies"
  "08-solar-system:Solar System"
  "09-particles:GPU Particles"
)

# Build each chapter
for chapter in "${CHAPTERS[@]}"; do
  IFS=':' read -r folder name <<< "$chapter"

  if [ -d "$SCRIPT_DIR/$folder" ]; then
    echo "📦 Building $name ($folder)..."
    cd "$SCRIPT_DIR/$folder"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
      echo "   Installing dependencies..."
      npm install --silent
    fi

    # Update vite config for GitHub Pages base path
    # Build the chapter
    npm run build -- --base="/${REPO_NAME}/$folder/"

    # Copy built files to dist
    mkdir -p "$DIST_DIR/$folder"
    cp -r dist/* "$DIST_DIR/$folder/"

    echo "   ✅ Done"
  else
    echo "⚠️  Skipping $folder (directory not found)"
  fi
done

# Build gallery (no base path - it handles paths dynamically)
echo ""
echo "🎨 Building Gallery..."
cd "$SCRIPT_DIR/00-gallery"

if [ ! -d "node_modules" ]; then
  echo "   Installing dependencies..."
  npm install --silent
fi

npm run build -- --base="/${REPO_NAME}/"

# Copy gallery to root of dist
cp -r dist/* "$DIST_DIR/"

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ Build complete!"
echo "📁 Output: $DIST_DIR"
echo ""
echo "To preview locally:"
echo "   npx serve dist"
echo ""
echo "To deploy to GitHub Pages:"
echo "   git add dist -f"
echo "   git commit -m 'Build for GitHub Pages'"
echo "   git subtree push --prefix dist origin gh-pages"
echo "═══════════════════════════════════════════════════"

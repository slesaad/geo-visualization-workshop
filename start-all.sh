#!/bin/bash

# Start all workshop chapter dev servers
# Each runs in the background on its designated port

echo "🚀 Starting all workshop chapter servers..."
echo ""

# Store PIDs for cleanup
PIDS=()

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Stopping all servers..."
  for pid in "${PIDS[@]}"; do
    kill $pid 2>/dev/null
  done
  exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Chapter configurations: folder:port:name
CHAPTERS=(
  "01-basics:3001:Deck.gl Basics"
  "02-layers:3002:Built-in Layers"
  "03-extensions:3003:Extensions"
  "04-shader-injection:3004:Shader Injection"
  "05-custom-layer:3005:Custom Layer"
  "06-nyc-taxi:3006:NYC Taxi Animation"
  "07-celestial-threejs:3008:Celestial Bodies"
  "08-solar-system:3009:Solar System"
  "09-particles:3010:GPU Particles"
)

# Start each chapter server
for chapter in "${CHAPTERS[@]}"; do
  IFS=':' read -r folder port name <<< "$chapter"

  if [ -d "$SCRIPT_DIR/$folder" ]; then
    echo "📦 Starting $name on port $port..."
    cd "$SCRIPT_DIR/$folder"

    # Check if node_modules exists, if not install
    if [ ! -d "node_modules" ]; then
      echo "   Installing dependencies for $folder..."
      npm install --silent
    fi

    # Start dev server in background, suppress output
    npm run dev -- --host > /dev/null 2>&1 &
    PIDS+=($!)

    cd "$SCRIPT_DIR"
  else
    echo "⚠️  Skipping $folder (directory not found)"
  fi
done

echo ""
echo "✅ All servers started!"
echo ""
echo "📍 Chapter URLs:"
for chapter in "${CHAPTERS[@]}"; do
  IFS=':' read -r folder port name <<< "$chapter"
  if [ -d "$SCRIPT_DIR/$folder" ]; then
    echo "   $name: http://localhost:$port"
  fi
done

echo ""
echo "🎨 Starting Gallery on port 3000..."

# Start gallery
cd "$SCRIPT_DIR/00-gallery"
if [ ! -d "node_modules" ]; then
  echo "   Installing dependencies for gallery..."
  npm install --silent
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "🌐 Gallery: http://localhost:3000"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Run gallery in foreground (so we can see its output and Ctrl+C works)
npm run dev -- --host

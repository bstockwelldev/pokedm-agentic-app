#!/bin/bash

# Setup script for Agentic Flow React App
# This script sets up both the server and client components

set -e  # Exit on any error

echo "🚀 Setting up Agentic Flow React App..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Setup server
echo "📦 Setting up server..."
cd "$SCRIPT_DIR/server"

if [ ! -f "package.json" ]; then
    echo "❌ Error: server/package.json not found!"
    exit 1
fi

echo "   Installing server dependencies..."
npm install

if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    echo "   Copying .env.example to .env..."
    cp .env.example .env
    echo "   ⚠️  Please edit server/.env and set your AI_GATEWAY_API_KEY"
else
    if [ -f ".env" ]; then
        echo "   ℹ️  .env file already exists, skipping copy"
    else
        echo "   ⚠️  Warning: .env.example not found, you'll need to create .env manually"
    fi
fi

echo "✅ Server setup complete!"
echo ""

# Setup client
echo "📦 Setting up client..."
cd "$SCRIPT_DIR/client"

if [ ! -f "package.json" ]; then
    echo "❌ Error: client/package.json not found!"
    exit 1
fi

echo "   Installing client dependencies..."
npm install

echo "✅ Client setup complete!"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Setup complete!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Edit server/.env and set your AI_GATEWAY_API_KEY:"
echo "   cd server"
echo "   # Edit .env file with your API key"
echo ""
echo "2. Start the server (in one terminal):"
echo "   cd server"
echo "   npm start"
echo ""
echo "3. Start the client (in another terminal):"
echo "   cd client"
echo "   npm run dev"
echo ""
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

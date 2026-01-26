# Setup script for Agentic Flow React App (PowerShell)
# This script sets up both the server and client components

$ErrorActionPreference = "Stop"

Write-Host "🚀 Setting up Agentic Flow React App..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Get the directory where this script is located
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

# Setup server
Write-Host "📦 Setting up server..." -ForegroundColor Yellow
Set-Location "$SCRIPT_DIR\server"

if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: server/package.json not found!" -ForegroundColor Red
    exit 1
}

Write-Host "   Installing server dependencies..."
npm install

if ((Test-Path ".env.example") -and (-not (Test-Path ".env"))) {
    Write-Host "   Copying .env.example to .env..."
    Copy-Item ".env.example" ".env"
    Write-Host "   ⚠️  Please edit server/.env and set your AI_GATEWAY_API_KEY" -ForegroundColor Yellow
} else {
    if (Test-Path ".env") {
        Write-Host "   ℹ️  .env file already exists, skipping copy"
    } else {
        Write-Host "   ⚠️  Warning: .env.example not found, you'll need to create .env manually" -ForegroundColor Yellow
    }
}

Write-Host "✅ Server setup complete!" -ForegroundColor Green
Write-Host ""

# Setup client
Write-Host "📦 Setting up client..." -ForegroundColor Yellow
Set-Location "$SCRIPT_DIR\client"

if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: client/package.json not found!" -ForegroundColor Red
    exit 1
}

Write-Host "   Installing client dependencies..."
npm install

Write-Host "✅ Client setup complete!" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✨ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Edit server/.env and set your AI_GATEWAY_API_KEY:"
Write-Host "   cd server"
Write-Host "   # Edit .env file with your API key"
Write-Host ""
Write-Host "2. Start the server (in one terminal):"
Write-Host "   cd server"
Write-Host "   npm start"
Write-Host ""
Write-Host "3. Start the client (in another terminal):"
Write-Host "   cd client"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "4. Open http://localhost:3000 in your browser"
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

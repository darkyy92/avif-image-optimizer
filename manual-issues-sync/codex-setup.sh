#!/bin/bash

# Codex Setup Script for AVIF Image Optimizer
# This script sets up the development environment in the Codex sandbox

echo "🚀 Setting up AVIF Image Optimizer development environment..."

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install

# Install useful development tools
echo "🔧 Installing development tools..."
sudo apt update
sudo apt install -y ripgrep fd-find

# Verify installations
echo "✅ Setup complete!"
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Repository: $(pwd)"

# Test CLI functionality
echo "🧪 Testing CLI functionality..."
node src/cli.js --help

echo ""
echo "📋 Available issues are in the manual-issues-sync/ directory:"
echo "   - 8 quick-win issues (1-2 hour features)"
echo "   - Issues available in both JSON and Markdown formats"
echo "   - Start with issue-1.md for dry run mode implementation"
echo ""
echo "💡 Development tips:"
echo "   - Use 'npm test' equivalent: node src/cli.js --help"
echo "   - Test with sample files in test-images/ directory"
echo "   - Check AGENTS.md for architecture details"
echo ""
echo "🎯 Ready to start development!"
#!/bin/bash
echo "Setting up Bomee..."

# Check for npm
if ! command -v npm &> /dev/null; then
    # Try to source nvm if present
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    if ! command -v npm &> /dev/null; then
        echo "Error: npm could not be found."
        echo "Please install Node.js to use this application."
        exit 1
    fi
fi

echo "Installing dependencies..."
# Use --legacy-peer-deps just in case of conflicts
npm install --legacy-peer-deps

echo "Starting development server..."
npm run dev

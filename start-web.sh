#!/bin/bash

echo "🚀 Starting Crypto Tracker Web Application..."

# Build the React app if not already built
if [ ! -d "web/build" ]; then
    echo "📦 Building React application..."
    cd web && npm run build && cd ..
fi

# Start the server
echo "🌐 Starting server on http://localhost:3001"
node src/server.js

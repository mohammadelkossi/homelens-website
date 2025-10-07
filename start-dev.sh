#!/bin/bash

# Kill any existing Next.js processes
echo "🔄 Stopping any existing Next.js processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# Wait for processes to stop
sleep 2

# Clear build cache
echo "🧹 Clearing build cache..."
rm -rf .next

# Start development server
echo "🚀 Starting development server..."
npm run dev

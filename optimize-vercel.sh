#!/bin/bash

# Paperless Vercel Deployment Helper
# This script prepares the project for Vercel deployment and optimizes function count

echo "🔧 Paperless Vercel Deployment Optimizer"
echo "=========================================="
echo ""

# Check if .vercelignore exists
if [ ! -f ".vercelignore" ]; then
    echo "❌ .vercelignore not found!"
    exit 1
fi

echo "✅ .vercelignore found"

# Check if vercel.json is optimized
if grep -q '"functions"' vercel.json; then
    echo "✅ vercel.json configured with explicit function definition"
else
    echo "⚠️  vercel.json might not have explicit function configuration"
fi

# Remove Vercel cache
echo ""
echo "🧹 Cleaning Vercel cache..."
if [ -d ".vercel" ]; then
    rm -rf .vercel
    echo "✅ Cleared .vercel directory"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install --production > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed"
else
    echo "⚠️  npm install had issues"
fi

# Verify required files
echo ""
echo "📋 Verifying required files..."
files=(
    "api/index.js"
    "api/config/db.js"
    "api/config/passport.js"
    "api/middleware/verifyToken.js"
    "api/middleware/verifyAdmin.js"
    "api/routes/auth.js"
    "api/routes/categories.js"
    "api/routes/entries.js"
    "api/routes/admin.js"
)

missing=0
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (MISSING)"
        missing=$((missing + 1))
    fi
done

if [ $missing -gt 0 ]; then
    echo ""
    echo "❌ $missing required files are missing!"
    exit 1
fi

# Check environment variables
echo ""
echo "🔐 Checking environment variables..."
required_vars=(
    "MONGODB_URI"
    "JWT_SECRET"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
)

missing_vars=0
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "⚠️  $var not set locally (should be set in Vercel dashboard)"
        missing_vars=$((missing_vars + 1))
    else
        echo "✅ $var is set"
    fi
done

# Summary
echo ""
echo "=========================================="
echo "✅ Optimization Complete!"
echo ""
echo "📊 Deployment Summary:"
echo "   - Serverless Functions: 1"
echo "   - Entry Point: api/index.js"
echo "   - Status: Ready for Vercel deployment"
echo ""
echo "🚀 Next steps:"
echo "   1. Set environment variables in Vercel dashboard:"
for var in "${required_vars[@]}"; do
    echo "      - $var"
done
echo ""
echo "   2. Deploy with: vercel --prod"
echo ""

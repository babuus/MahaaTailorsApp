#!/bin/bash

echo "🚀 Deploying Internal Notes Fix to Backend..."
echo ""

# Navigate to backend directory
cd backend

# Check if we have the necessary files
if [ ! -f "deploy.sh" ]; then
    echo "❌ Error: deploy.sh not found in backend directory"
    exit 1
fi

if [ ! -f "billing/index.py" ]; then
    echo "❌ Error: billing/index.py not found"
    exit 1
fi

# Show what changes we're deploying
echo "📋 Changes being deployed:"
echo "✅ save_bill_items: Added internal_notes field to database save"
echo "✅ format_bill_items_for_response: Added internalNotes to API response"
echo "✅ update_bill_item: Added internalNotes update handling"
echo "✅ Added debugging logs for data flow tracing"
echo ""

# Make deploy script executable
chmod +x deploy.sh

# Run deployment
echo "🔨 Starting deployment..."
./deploy.sh

echo ""
echo "✅ Backend deployment completed!"
echo ""
echo "📝 Next steps:"
echo "1. Test the internal notes functionality in the app"
echo "2. Check browser console for debugging logs"
echo "3. Check CloudWatch logs for backend debugging"
echo "4. Verify data persistence by saving and reopening items"
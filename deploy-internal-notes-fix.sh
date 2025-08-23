#!/bin/bash

echo "🚀 Deploying Internal Notes Fix to Backend..."
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ]; then
    echo "❌ Error: backend directory not found. Please run this script from the project root."
    exit 1
fi

# Navigate to backend directory
cd backend

echo "📋 Changes being deployed:"
echo "✅ update_bill function: Added internalNotes field to processed_item"
echo "✅ add_bill function: Added internalNotes field to processed_item"
echo "✅ save_bill_items function: Already includes internal_notes field"
echo "✅ format_bill_items_for_response function: Already includes internalNotes in response"
echo "✅ update_bill_item function: Already handles internalNotes updates"
echo ""

# Check if SAM CLI is available
if ! command -v sam &> /dev/null; then
    echo "❌ Error: AWS SAM CLI is not installed or not in PATH."
    echo "Please install SAM CLI: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: AWS CLI is not configured or credentials are invalid."
    echo "Please configure AWS CLI: aws configure"
    exit 1
fi

echo "🔧 Building SAM application..."
sam build

if [ $? -ne 0 ]; then
    echo "❌ Error: SAM build failed."
    exit 1
fi

echo ""
echo "🚀 Deploying to AWS..."
echo "Please select the environment:"
echo "1) Development (dev)"
echo "2) Production (prod)"
read -p "Enter your choice (1 or 2): " env_choice

case $env_choice in
    1)
        ENV="dev"
        ;;
    2)
        ENV="prod"
        ;;
    *)
        echo "❌ Invalid choice. Defaulting to development."
        ENV="dev"
        ;;
esac

echo "Deploying to $ENV environment..."

# Deploy with guided mode for first time, or use existing config
if [ -f "samconfig.toml" ]; then
    sam deploy --config-env $ENV
else
    sam deploy --guided --config-env $ENV
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Test the internal notes functionality in the app"
    echo "2. Create a new bill item with internal notes"
    echo "3. Edit an existing bill item and add internal notes"
    echo "4. Verify internal notes are saved and displayed correctly"
    echo "5. Check browser console for debugging logs"
    echo ""
    echo "🔍 Debugging:"
    echo "- Check CloudWatch logs for 'DEBUG save_bill_items' entries"
    echo "- Look for 'internalNotes' in API responses"
    echo "- Verify DynamoDB BillItems table has 'internal_notes' field"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
#!/bin/bash

set -e

echo "Select environment:"
echo "1. Development"
echo "2. Production"
read -p "Enter environment (1 or 2): " env_choice

if [[ "$env_choice" == "1" ]]; then
  ENVIRONMENT="dev"
elif [[ "$env_choice" == "2" ]]; then
  ENVIRONMENT="prod"
else
  echo "Invalid choice. Exiting."
  exit 1
fi

echo "🚀 Deploying backend to $ENVIRONMENT environment..."

# Build the SAM application
echo "🔨 Building SAM application..."
sam build

# Deploy using the specified environment configuration
echo "📦 Deploying to AWS..."
sam deploy --config-env $ENVIRONMENT

# Get the API endpoint from the deployed stack
BACKEND_STACK_NAME="MahaaTailors-Backend-$ENVIRONMENT"
echo "📋 Getting deployment information..."

API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name $BACKEND_STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text --region ap-south-1 2>/dev/null || echo "")

if [[ -n "$API_ENDPOINT" && "$API_ENDPOINT" != "None" ]]; then
  echo "✅ Backend deployed successfully!"
  echo "🔗 API Endpoint: $API_ENDPOINT"
else
  echo "✅ Backend deployed successfully!"
  echo "⚠️  Could not retrieve API endpoint. Check CloudFormation stack outputs."
fi

echo "🎉 Backend deployment to $ENVIRONMENT complete!"
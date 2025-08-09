#!/bin/bash

set -e

echo "📱 Mahaa Tailors Mobile App Deployment"
echo "======================================"

# Get environment selection
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

echo "📱 Deploying mobile app for $ENVIRONMENT..."

# Get API endpoint for mobile app configuration
BACKEND_STACK_NAME="MahaaTailors-Backend-$ENVIRONMENT"
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name $BACKEND_STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text --region ap-south-1 2>/dev/null || echo "")

if [[ -n "$API_ENDPOINT" && "$API_ENDPOINT" != "None" ]]; then
  echo "✅ Found API endpoint: $API_ENDPOINT"
  
  # Update the API endpoint in the environment configuration
  if [[ -f "src/config/environment.ts" ]]; then
    # Create a backup
    cp src/config/environment.ts src/config/environment.ts.bak
    
    # Update the API endpoint based on environment
    if [[ "$ENVIRONMENT" == "prod" ]]; then
      # For production, update the production URL (after the colon)
      sed -i.tmp "s|: 'https://[^']*\.amazonaws\.com/Prod'|: '${API_ENDPOINT}'|g" src/config/environment.ts
      echo "✅ Updated production API endpoint to: ${API_ENDPOINT}"
    else
      # For development, update the development URL (after the question mark)
      sed -i.tmp "s|? 'https://[^']*\.amazonaws\.com/Prod'|? '${API_ENDPOINT}'|g" src/config/environment.ts
      echo "✅ Updated development API endpoint to: ${API_ENDPOINT}"
    fi
    
    rm -f src/config/environment.ts.tmp
  fi
  
  # UpdateService now uses environment configuration automatically
  echo "✅ UpdateService will use environment-based API endpoint automatically"
else
  echo "⚠️  Warning: Could not get API endpoint. Mobile app will use default configuration."
fi

# Mobile platform selection
echo "Select mobile platform:"
echo "1. Android"
echo "2. iOS (macOS only)"
echo "3. Both"
read -p "Enter platform choice (1, 2, or 3): " platform_choice

case $platform_choice in
  1) MOBILE_PLATFORM="android" ;;
  2) MOBILE_PLATFORM="ios" ;;
  3) MOBILE_PLATFORM="both" ;;
  *) echo "Invalid choice. Defaulting to Android."; MOBILE_PLATFORM="android" ;;
esac

# Build mode selection
if [[ "$ENVIRONMENT" == "prod" ]]; then
  BUILD_MODE="release"
  echo "🔨 Building mobile app in release mode for production..."
else
  echo "Select build mode:"
  echo "1. Debug"
  echo "2. Release"
  read -p "Enter build mode (1 or 2): " mode_choice
  
  case $mode_choice in
    1) BUILD_MODE="debug" ;;
    2) BUILD_MODE="release" ;;
    *) echo "Invalid choice. Defaulting to debug."; BUILD_MODE="debug" ;;
  esac
fi

# Check prerequisites
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js is not installed"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "❌ Error: npm is not installed"
  exit 1
fi

# Install dependencies
echo "📦 Installing mobile app dependencies..."
npm install --legacy-peer-deps

# Fix React Native codegen issues
echo "🔧 Fixing React Native codegen issues..."
if [[ -f "./fix-codegen.sh" ]]; then
  ./fix-codegen.sh
else
  echo "⚠️  fix-codegen.sh not found, running manual codegen fix..."
  npx react-native codegen || echo "⚠️  Codegen completed with warnings"
fi

# iOS specific setup
if [[ "$MOBILE_PLATFORM" == "ios" || "$MOBILE_PLATFORM" == "both" ]]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v pod &> /dev/null; then
      echo "📦 Installing iOS pods..."
      cd ios && pod install && cd ..
    else
      echo "⚠️  Warning: CocoaPods not found. iOS build may fail."
    fi
  else
    echo "⚠️  Warning: iOS builds are only supported on macOS"
    if [[ "$MOBILE_PLATFORM" == "ios" ]]; then
      echo "❌ Cannot build iOS on non-macOS system"
      exit 1
    fi
    MOBILE_PLATFORM="android"
  fi
fi

# Create deploy directory
mkdir -p deploy

# Build Android
if [[ "$MOBILE_PLATFORM" == "android" || "$MOBILE_PLATFORM" == "both" ]]; then
  echo "🔨 Building Android app..."
  
  # Check for Android SDK
  if ! command -v adb &> /dev/null; then
    echo "⚠️  Warning: Android SDK not found in PATH. Build may fail."
  fi
  
  cd android
  
  # Clean codegen files to prevent duplicate class errors
  echo "🧹 Cleaning codegen files..."
  rm -rf app/build/generated/source/codegen
  rm -rf ../build/generated
  ./gradlew clean
  
  if [[ "$BUILD_MODE" == "release" ]]; then
    echo "Building Android release..."
    ./gradlew assembleRelease
    ./gradlew bundleRelease
    
    mkdir -p ../deploy/android
    cp app/build/outputs/apk/release/app-release.apk ../deploy/android/ 2>/dev/null || echo "⚠️  APK not found"
    cp app/build/outputs/bundle/release/app-release.aab ../deploy/android/ 2>/dev/null || echo "⚠️  AAB not found"
    
    echo "✅ Android release build completed"
  else
    echo "Building Android debug..."
    ./gradlew assembleDebug
    
    mkdir -p ../deploy/android
    cp app/build/outputs/apk/debug/app-debug.apk ../deploy/android/ 2>/dev/null || echo "⚠️  Debug APK not found"
    
    echo "✅ Android debug build completed"
  fi
  
  cd ..
fi

# Build iOS
if [[ "$MOBILE_PLATFORM" == "ios" || "$MOBILE_PLATFORM" == "both" ]]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🔨 Building iOS app..."
    
    cd ios
    
    if [[ "$BUILD_MODE" == "release" ]]; then
      echo "Building iOS release archive..."
      
      xcodebuild archive \
        -workspace MahaaTailorsApp.xcworkspace \
        -scheme MahaaTailorsApp \
        -configuration Release \
        -archivePath ../deploy/ios/MahaaTailorsApp.xcarchive \
        -allowProvisioningUpdates || echo "⚠️  iOS archive build failed"
      
      # Export IPA
      if [[ -f "exportOptions-production.plist" ]]; then
        xcodebuild -exportArchive \
          -archivePath ../deploy/ios/MahaaTailorsApp.xcarchive \
          -exportPath ../deploy/ios \
          -exportOptionsPlist exportOptions-production.plist || echo "⚠️  iOS IPA export failed"
      fi
      
      echo "✅ iOS release build completed"
    else
      echo "Building iOS debug..."
      xcodebuild build \
        -workspace MahaaTailorsApp.xcworkspace \
        -scheme MahaaTailorsApp \
        -configuration Debug \
        -sdk iphonesimulator || echo "⚠️  iOS debug build failed"
      
      echo "✅ iOS debug build completed"
    fi
    
    cd ..
  fi
fi

# Upload to S3
echo "📤 Uploading mobile app builds to S3..."

# Set bucket name based on environment
if [[ "$ENVIRONMENT" == "prod" ]]; then
  MOBILE_BUCKET_NAME="mahaatailors-prod"
else
  MOBILE_BUCKET_NAME="mahaatailors-dev"
fi

echo "Using S3 bucket: $MOBILE_BUCKET_NAME"

# Ensure bucket policy allows public read access for mobile app downloads
echo "🔧 Configuring bucket policy for mobile app downloads..."
aws s3api put-bucket-policy --bucket "$MOBILE_BUCKET_NAME" --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadWebsite",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::'$MOBILE_BUCKET_NAME'/*"
    },
    {
      "Sid": "PublicReadMobileApps",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::'$MOBILE_BUCKET_NAME'/mobile/*"
    }
  ]
}' 2>/dev/null || echo "⚠️  Could not update bucket policy (may already exist)"

# Upload APK files with version timestamp
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
APP_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.1")

S3_URLS=""

if [[ -f "deploy/android/app-release.apk" ]]; then
  S3_KEY="mobile/apk/mahaatailors-v${APP_VERSION}-${TIMESTAMP}-release.apk"
  aws s3 cp "deploy/android/app-release.apk" "s3://$MOBILE_BUCKET_NAME/$S3_KEY"
  RELEASE_APK_URL="https://$MOBILE_BUCKET_NAME.s3.ap-south-1.amazonaws.com/$S3_KEY"
  S3_URLS="$S3_URLS\n- Release APK: $RELEASE_APK_URL"
  echo "✅ Uploaded release APK: $RELEASE_APK_URL"
  
  # Also upload as "latest" for easy access
  aws s3 cp "deploy/android/app-release.apk" "s3://$MOBILE_BUCKET_NAME/mobile/apk/mahaatailors-latest-release.apk"
  LATEST_RELEASE_URL="https://$MOBILE_BUCKET_NAME.s3.ap-south-1.amazonaws.com/mobile/apk/mahaatailors-latest-release.apk"
  echo "✅ Uploaded as latest release: $LATEST_RELEASE_URL"
fi

if [[ -f "deploy/android/app-debug.apk" ]]; then
  S3_KEY="mobile/apk/mahaatailors-v${APP_VERSION}-${TIMESTAMP}-debug.apk"
  aws s3 cp "deploy/android/app-debug.apk" "s3://$MOBILE_BUCKET_NAME/$S3_KEY"
  DEBUG_APK_URL="https://$MOBILE_BUCKET_NAME.s3.ap-south-1.amazonaws.com/$S3_KEY"
  S3_URLS="$S3_URLS\n- Debug APK: $DEBUG_APK_URL"
  echo "✅ Uploaded debug APK: $DEBUG_APK_URL"
  
  # Also upload as "latest" for easy access
  aws s3 cp "deploy/android/app-debug.apk" "s3://$MOBILE_BUCKET_NAME/mobile/apk/mahaatailors-latest-debug.apk"
  LATEST_DEBUG_URL="https://$MOBILE_BUCKET_NAME.s3.ap-south-1.amazonaws.com/mobile/apk/mahaatailors-latest-debug.apk"
  echo "✅ Uploaded as latest debug: $LATEST_DEBUG_URL"
fi

if [[ -f "deploy/android/app-release.aab" ]]; then
  S3_KEY="mobile/aab/mahaatailors-v${APP_VERSION}-${TIMESTAMP}-release.aab"
  aws s3 cp "deploy/android/app-release.aab" "s3://$MOBILE_BUCKET_NAME/$S3_KEY" --content-type "application/octet-stream"
  AAB_URL="https://$MOBILE_BUCKET_NAME.s3.ap-south-1.amazonaws.com/$S3_KEY"
  echo "✅ Uploaded AAB for Play Store: $AAB_URL"
fi

# Generate deployment report
echo "📋 Generating mobile deployment report..."
cat > deploy/mobile-deployment-report.txt << EOF
Mahaa Tailors Mobile App Deployment Report
==========================================

Deployment Date: $(date)
Environment: $ENVIRONMENT
Platform: $MOBILE_PLATFORM
Build Mode: $BUILD_MODE
App Version: $APP_VERSION
API Endpoint: ${API_ENDPOINT:-"Not configured"}
S3 Bucket: $MOBILE_BUCKET_NAME

Build Artifacts:
EOF

if [[ -f "deploy/android/app-release.apk" ]]; then
  echo "- Android APK: deploy/android/app-release.apk ($(du -h deploy/android/app-release.apk | cut -f1))" >> deploy/mobile-deployment-report.txt
fi
if [[ -f "deploy/android/app-release.aab" ]]; then
  echo "- Android AAB: deploy/android/app-release.aab ($(du -h deploy/android/app-release.aab | cut -f1))" >> deploy/mobile-deployment-report.txt
fi
if [[ -f "deploy/android/app-debug.apk" ]]; then
  echo "- Android Debug APK: deploy/android/app-debug.apk ($(du -h deploy/android/app-debug.apk | cut -f1))" >> deploy/mobile-deployment-report.txt
fi
if [[ -d "deploy/ios/MahaaTailorsApp.xcarchive" ]]; then
  echo "- iOS Archive: deploy/ios/MahaaTailorsApp.xcarchive" >> deploy/mobile-deployment-report.txt
fi

echo "" >> deploy/mobile-deployment-report.txt
echo "Download URLs:" >> deploy/mobile-deployment-report.txt
if [[ -n "$S3_URLS" ]]; then
  echo -e "$S3_URLS" >> deploy/mobile-deployment-report.txt
fi
if [[ -n "$LATEST_RELEASE_URL" ]]; then
  echo "- Latest Release: $LATEST_RELEASE_URL" >> deploy/mobile-deployment-report.txt
fi
if [[ -n "$LATEST_DEBUG_URL" ]]; then
  echo "- Latest Debug: $LATEST_DEBUG_URL" >> deploy/mobile-deployment-report.txt
fi

echo "" >> deploy/mobile-deployment-report.txt
echo "Next Steps:" >> deploy/mobile-deployment-report.txt
if [[ "$BUILD_MODE" == "release" ]]; then
  echo "- Share APK download link with users" >> deploy/mobile-deployment-report.txt
  echo "- Upload Android AAB to Google Play Console" >> deploy/mobile-deployment-report.txt
  echo "- Upload iOS archive to App Store Connect" >> deploy/mobile-deployment-report.txt
else
  echo "- Share debug APK link with testers" >> deploy/mobile-deployment-report.txt
  echo "- Install debug builds on test devices" >> deploy/mobile-deployment-report.txt
fi
echo "- Deploy component updates using: ../../scripts/deploy-update.sh" >> deploy/mobile-deployment-report.txt

# Upload deployment report to S3 as well
aws s3 cp deploy/mobile-deployment-report.txt "s3://$MOBILE_BUCKET_NAME/reports/deployment-$(date +%Y%m%d-%H%M%S).txt"

echo "✅ Mobile deployment report: deploy/mobile-deployment-report.txt"

echo "📱 Mobile app deployment completed!"
echo ""
echo "📋 Summary:"
echo "- Environment: $ENVIRONMENT"
echo "- Platform: $MOBILE_PLATFORM"
echo "- Build Mode: $BUILD_MODE"
if [[ -n "$LATEST_RELEASE_URL" ]]; then
  echo "- Latest Release APK: $LATEST_RELEASE_URL"
fi
if [[ -n "$LATEST_DEBUG_URL" ]]; then
  echo "- Latest Debug APK: $LATEST_DEBUG_URL"
fi
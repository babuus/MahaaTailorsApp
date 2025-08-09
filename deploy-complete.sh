#!/bin/bash

echo "🚀 Mahaa Tailors App - Complete Deployment Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the React Native project root directory"
    exit 1
fi

print_info "Starting deployment process..."

# Install dependencies
print_info "Installing Node.js dependencies..."
npm install --legacy-peer-deps
if [ $? -ne 0 ]; then
    print_error "Failed to install Node.js dependencies"
    exit 1
fi
print_status "Node.js dependencies installed"

# Run codegen fix
print_info "Running codegen fix..."
if [ -f "./fix-codegen.sh" ]; then
    ./fix-codegen.sh
    print_status "Codegen fix completed"
else
    print_warning "fix-codegen.sh not found, skipping..."
fi

# Android Build
print_info "Building Android app..."
cd android

# Clean previous builds
print_info "Cleaning previous Android builds..."
./gradlew clean

# Build APK
print_info "Building Android APK..."
./gradlew assembleRelease
if [ $? -eq 0 ]; then
    print_status "Android APK built successfully!"
    print_info "APK location: android/app/build/outputs/apk/release/app-release.apk"
else
    print_error "Android APK build failed"
    cd ..
    exit 1
fi

# Build AAB for Play Store
print_info "Building Android App Bundle (AAB)..."
./gradlew bundleRelease
if [ $? -eq 0 ]; then
    print_status "Android AAB built successfully!"
    print_info "AAB location: android/app/build/outputs/bundle/release/app-release.aab"
else
    print_error "Android AAB build failed"
fi

cd ..

# iOS Build (only on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    print_info "Building iOS app..."
    
    # Check if CocoaPods is installed
    if ! command -v pod &> /dev/null; then
        print_error "CocoaPods not found. Please install it first:"
        print_info "sudo gem install cocoapods"
        exit 1
    fi
    
    cd ios
    
    # Install iOS dependencies
    print_info "Installing iOS dependencies..."
    pod install --repo-update
    if [ $? -ne 0 ]; then
        print_error "Failed to install iOS dependencies"
        cd ..
        exit 1
    fi
    print_status "iOS dependencies installed"
    
    # Build iOS app
    print_info "Building iOS app for release..."
    xcodebuild -workspace MahaaTailorsApp.xcworkspace \
               -scheme MahaaTailorsApp \
               -configuration Release \
               -destination generic/platform=iOS \
               -archivePath MahaaTailorsApp.xcarchive \
               archive
    
    if [ $? -eq 0 ]; then
        print_status "iOS archive created successfully!"
        
        # Export IPA
        print_info "Exporting IPA..."
        xcodebuild -exportArchive \
                   -archivePath MahaaTailorsApp.xcarchive \
                   -exportPath ./build \
                   -exportOptionsPlist exportOptions.plist
        
        if [ $? -eq 0 ]; then
            print_status "iOS IPA exported successfully!"
            print_info "IPA location: ios/build/MahaaTailorsApp.ipa"
        else
            print_error "iOS IPA export failed"
        fi
    else
        print_error "iOS build failed"
    fi
    
    cd ..
else
    print_warning "iOS builds are only supported on macOS"
    print_info "To build for iOS:"
    print_info "1. Transfer this project to a macOS machine"
    print_info "2. Install Xcode and CocoaPods"
    print_info "3. Run: cd ios && pod install"
    print_info "4. Open MahaaTailorsApp.xcworkspace in Xcode"
    print_info "5. Build and archive for distribution"
fi

# Summary
echo ""
echo "🎉 Deployment Summary"
echo "===================="
print_status "Android APK: android/app/build/outputs/apk/release/app-release.apk"
print_status "Android AAB: android/app/build/outputs/bundle/release/app-release.aab"

if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -f "ios/build/MahaaTailorsApp.ipa" ]; then
        print_status "iOS IPA: ios/build/MahaaTailorsApp.ipa"
    fi
else
    print_info "iOS build requires macOS - see instructions above"
fi

echo ""
print_info "Next steps:"
print_info "📱 Android: Upload the AAB file to Google Play Console"
print_info "🍎 iOS: Upload the IPA file to App Store Connect (requires macOS)"
print_info "🔧 Testing: Install the APK on Android devices for testing"

echo ""
print_status "Deployment script completed!"
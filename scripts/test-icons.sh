#!/bin/bash

# Icon Testing Script for Ionicons Migration
# Run this script from the mobile-app/MahaaTailorsApp directory

echo "🎯 Testing Ionicons Migration..."
echo ""

# Check if react-native-vector-icons is installed
echo "📦 Checking dependencies..."
if npm list react-native-vector-icons > /dev/null 2>&1; then
    echo "✅ react-native-vector-icons is installed"
else
    echo "❌ react-native-vector-icons is missing"
    echo "Installing react-native-vector-icons..."
    npm install react-native-vector-icons
fi

# Clean and rebuild
echo ""
echo "🧹 Cleaning project..."
npm run clean

# For Android
echo ""
echo "🤖 Cleaning Android build..."
cd android && ./gradlew clean && cd ..

# Reinstall dependencies
echo ""
echo "📦 Reinstalling dependencies..."
rm -rf node_modules
npm install

# For iOS (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "🍎 Updating iOS pods..."
    cd ios && pod install && cd ..
fi

echo ""
echo "🚀 Starting the app..."
echo ""
echo "📋 Testing Checklist:"
echo "1. ✅ Check drawer menu opens with hamburger icon"
echo "2. ✅ Verify all menu icons display (not Chinese characters)"
echo "3. ✅ Navigate to 'Icon Test' screen"
echo "4. ✅ Verify all icons in test screen display properly"
echo "5. ✅ Test back button navigation"
echo "6. ✅ Check sync status indicators"
echo ""

# Start the app
npm run android
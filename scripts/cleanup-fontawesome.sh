#!/bin/bash

# Cleanup script to remove FontAwesome dependencies and references
# Run this script from the mobile-app/MahaaTailorsApp directory

echo "🧹 Cleaning up FontAwesome dependencies..."

# Remove FontAwesome packages
echo "📦 Removing FontAwesome packages..."
npm uninstall @fortawesome/fontawesome-svg-core @fortawesome/free-brands-svg-icons @fortawesome/free-regular-svg-icons @fortawesome/free-solid-svg-icons @fortawesome/react-native-fontawesome

# Clean node_modules and reinstall
echo "🔄 Cleaning and reinstalling dependencies..."
rm -rf node_modules
rm -f package-lock.json
npm install

# For iOS (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Updating iOS pods..."
    cd ios && pod install && cd ..
fi

# Clean React Native cache
echo "🧽 Cleaning React Native cache..."
npx react-native clean-project-auto

echo "✅ FontAwesome cleanup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test the app: npm run android"
echo "2. Check for any missing icons"
echo "3. Update any remaining FontAwesome references to use MaterialIcon"
echo "4. Refer to ICON_MIGRATION_GUIDE.md for detailed migration instructions"
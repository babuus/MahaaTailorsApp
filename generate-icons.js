#!/usr/bin/env node

/**
 * Icon Generation Script for Mahaa Tailors App
 * 
 * This script helps generate all required icon sizes for Android and iOS
 * from the base SVG design.
 * 
 * Prerequisites:
 * - Install ImageMagick: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)
 * - Or use online tools like https://appicon.co/ or https://makeappicon.com/
 * 
 * Usage:
 * 1. First convert the SVG to a high-res PNG (1024x1024)
 * 2. Run this script to generate all required sizes
 */

const fs = require('fs');
const path = require('path');

// Android icon sizes (in dp, but we generate in px assuming 1x density)
const androidSizes = {
  'mipmap-mdpi': 48,     // 1x
  'mipmap-hdpi': 72,     // 1.5x
  'mipmap-xhdpi': 96,    // 2x
  'mipmap-xxhdpi': 144,  // 3x
  'mipmap-xxxhdpi': 192  // 4x
};

// iOS icon sizes (in points, but we generate in px for @1x, @2x, @3x)
const iosSizes = {
  // iPhone App Icon
  '20x20': [20, 40, 60],      // @1x, @2x, @3x
  '29x29': [29, 58, 87],      // @1x, @2x, @3x
  '40x40': [40, 80, 120],     // @1x, @2x, @3x
  '60x60': [60, 120, 180],    // @1x, @2x, @3x
  // iPad App Icon
  '20x20-ipad': [20, 40],     // @1x, @2x
  '29x29-ipad': [29, 58],     // @1x, @2x
  '40x40-ipad': [40, 80],     // @1x, @2x
  '76x76': [76, 152],         // @1x, @2x
  '83.5x83.5': [167],         // @2x only
  // App Store
  '1024x1024': [1024]         // @1x only
};

console.log('🎨 Mahaa Tailors App Icon Generator');
console.log('=====================================\n');

console.log('📱 Required Android Sizes:');
Object.entries(androidSizes).forEach(([folder, size]) => {
  console.log(`   ${folder}/ic_launcher.png: ${size}x${size}px`);
  console.log(`   ${folder}/ic_launcher_round.png: ${size}x${size}px`);
});

console.log('\n🍎 Required iOS Sizes:');
Object.entries(iosSizes).forEach(([name, sizes]) => {
  sizes.forEach((size, index) => {
    const scale = index + 1;
    const suffix = scale === 1 ? '' : `@${scale}x`;
    console.log(`   AppIcon${suffix}.png: ${size}x${size}px`);
  });
});

console.log('\n🛠️  Generation Steps:');
console.log('1. Convert SVG to PNG (1024x1024):');
console.log('   magick app-icon-design.svg -resize 1024x1024 app-icon-1024.png');
console.log('\n2. Generate Android icons:');
Object.entries(androidSizes).forEach(([folder, size]) => {
  console.log(`   magick app-icon-1024.png -resize ${size}x${size} android/app/src/main/res/${folder}/ic_launcher.png`);
  console.log(`   magick app-icon-1024.png -resize ${size}x${size} android/app/src/main/res/${folder}/ic_launcher_round.png`);
});

console.log('\n3. Generate iOS icons:');
console.log('   # Place these in ios/MahaaTailorsApp/Images.xcassets/AppIcon.appiconset/');
Object.entries(iosSizes).forEach(([name, sizes]) => {
  sizes.forEach((size, index) => {
    const scale = index + 1;
    const suffix = scale === 1 ? '' : `@${scale}x`;
    console.log(`   magick app-icon-1024.png -resize ${size}x${size} AppIcon${suffix}.png`);
  });
});

console.log('\n🌐 Alternative: Online Tools');
console.log('If you prefer using online tools:');
console.log('• https://appicon.co/ - Upload 1024x1024 PNG, generates all sizes');
console.log('• https://makeappicon.com/ - Similar service');
console.log('• https://icon.kitchen/ - Google\'s icon generator');

console.log('\n✅ After generating icons:');
console.log('1. Replace the generated icons in their respective folders');
console.log('2. Clean and rebuild your project');
console.log('3. Test on device/simulator to verify the icons appear correctly');

console.log('\n🎨 Icon Design Features:');
console.log('• Professional gradient background (dark blue-gray)');
console.log('• Elegant serif "M" letter in white');
console.log('• Golden accent underline');
console.log('• Subtle tailoring icons (needle, scissors, measuring tape)');
console.log('• Optimized for both light and dark themes');
console.log('• Scalable design that works at all sizes');
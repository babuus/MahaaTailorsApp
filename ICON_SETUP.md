# Mahaa Tailors App Icon Setup

This guide helps you set up the custom app icon for the Mahaa Tailors mobile application.

## 🎨 Icon Design

The app icon features:
- **Professional gradient background** in dark blue-gray tones
- **Elegant serif "M"** representing "Mahaa" in white
- **Golden accent underline** for premium feel
- **Subtle tailoring icons** (needle, scissors, measuring tape)
- **Scalable design** that works at all sizes

## 📁 Files Included

- `app-icon-design.svg` - Master SVG design file (1024x1024)
- `generate-icons.js` - Helper script with generation commands
- `ICON_SETUP.md` - This setup guide

## 🚀 Quick Setup (Recommended)

### Option 1: Online Icon Generator (Easiest)

1. **Convert SVG to PNG**:
   ```bash
   # If you have ImageMagick installed:
   magick app-icon-design.svg -resize 1024x1024 app-icon-1024.png
   
   # Or use any SVG to PNG converter online
   ```

2. **Use Online Generator**:
   - Go to [appicon.co](https://appicon.co/)
   - Upload your 1024x1024 PNG
   - Download the generated icon pack
   - Extract and copy icons to the appropriate folders

### Option 2: Manual Generation

1. **Install ImageMagick** (if not already installed):
   ```bash
   # macOS
   brew install imagemagick
   
   # Ubuntu/Debian
   sudo apt-get install imagemagick
   
   # Windows
   # Download from https://imagemagick.org/script/download.php
   ```

2. **Run the generation script**:
   ```bash
   node generate-icons.js
   ```

3. **Follow the displayed commands** to generate all required sizes

## 📱 Android Icon Placement

Replace icons in these directories:
```
android/app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png (48x48)
│   └── ic_launcher_round.png (48x48)
├── mipmap-hdpi/
│   ├── ic_launcher.png (72x72)
│   └── ic_launcher_round.png (72x72)
├── mipmap-xhdpi/
│   ├── ic_launcher.png (96x96)
│   └── ic_launcher_round.png (96x96)
├── mipmap-xxhdpi/
│   ├── ic_launcher.png (144x144)
│   └── ic_launcher_round.png (144x144)
└── mipmap-xxxhdpi/
    ├── ic_launcher.png (192x192)
    └── ic_launcher_round.png (192x192)
```

## 🍎 iOS Icon Placement

Place icons in: `ios/MahaaTailorsApp/Images.xcassets/AppIcon.appiconset/`

Required files:
- `AppIcon-20x20@1x.png` (20x20)
- `AppIcon-20x20@2x.png` (40x40)
- `AppIcon-20x20@3x.png` (60x60)
- `AppIcon-29x29@1x.png` (29x29)
- `AppIcon-29x29@2x.png` (58x58)
- `AppIcon-29x29@3x.png` (87x87)
- `AppIcon-40x40@1x.png` (40x40)
- `AppIcon-40x40@2x.png` (80x80)
- `AppIcon-40x40@3x.png` (120x120)
- `AppIcon-60x60@2x.png` (120x120)
- `AppIcon-60x60@3x.png` (180x180)
- `AppIcon-76x76@1x.png` (76x76)
- `AppIcon-76x76@2x.png` (152x152)
- `AppIcon-83.5x83.5@2x.png` (167x167)
- `AppIcon-1024x1024@1x.png` (1024x1024)

## 🔧 After Installation

1. **Clean and rebuild** your project:
   ```bash
   # React Native
   npx react-native clean
   
   # Android
   cd android && ./gradlew clean && cd ..
   
   # iOS
   cd ios && xcodebuild clean && cd ..
   ```

2. **Rebuild the app**:
   ```bash
   npx react-native run-android
   npx react-native run-ios
   ```

3. **Test on device/simulator** to verify icons appear correctly

## 🎨 Customization

To modify the icon design:

1. Edit `app-icon-design.svg` with any SVG editor
2. Key elements to customize:
   - Background gradient colors
   - Letter "M" styling
   - Accent color (currently golden)
   - Decorative elements

3. Regenerate all sizes after making changes

## 🔍 Troubleshooting

**Icons not showing:**
- Ensure file names match exactly
- Check file permissions
- Clean and rebuild project
- Restart Metro bundler

**Icons appear blurry:**
- Verify you're using the correct pixel dimensions
- Ensure source image is high quality (1024x1024)
- Check that icons aren't being compressed

**Build errors:**
- Verify all required icon sizes are present
- Check that file paths are correct
- Ensure no special characters in filenames

## ✅ Verification Checklist

- [ ] SVG design looks good at 1024x1024
- [ ] All Android icon sizes generated (5 densities × 2 variants = 10 files)
- [ ] All iOS icon sizes generated (15+ files)
- [ ] Icons placed in correct directories
- [ ] Project cleaned and rebuilt
- [ ] Icons appear correctly on home screen
- [ ] Icons appear correctly in app switcher
- [ ] Icons work in both light and dark themes

## 🎯 Brand Consistency

This icon design maintains consistency with the Mahaa Tailors brand:
- Uses the signature "M" from the logo component
- Incorporates the golden accent color (`#d4af37`)
- Professional color scheme matching the app theme
- Tailoring-specific iconography for industry recognition
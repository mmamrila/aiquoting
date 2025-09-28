# 🚀 Android Studio Setup Guide

## ✅ Build Issues Fixed
- ✅ Removed deprecated `wakelock` package
- ✅ Added modern `wakelock_plus` replacement
- ✅ Updated Android NDK version to 27.0.12077973
- ✅ Updated minSdk to 23 (required for record package)
- ✅ Updated record package to version 6.1.0

## 📱 Opening in Android Studio

### Step 1: Open Project
1. Launch **Android Studio**
2. Click **"Open an Existing Project"**
3. Navigate to: `C:\Users\mmamr\quoting\pitchhelper_app`
4. Select the **pitchhelper_app** folder
5. Click **"OK"**

### Step 2: Setup Emulator
1. In Android Studio, go to **Tools > AVD Manager**
2. Click **"Create Virtual Device"**
3. Choose **Phone > Pixel 7** (recommended)
4. Select **API Level 34** (Android 14)
5. Click **"Next"** and then **"Finish"**

### Step 3: Run the App
1. Wait for project to sync (bottom status bar)
2. Click the **green play button** ▶️ in the toolbar
3. Select your emulator from the device dropdown
4. The app should launch in the emulator

## 🔧 Alternative: Command Line Testing

If Android Studio has issues, use command line:
```bash
cd pitchhelper_app

# Check devices
flutter devices

# Run on emulator (if one is running)
flutter run

# Or build APK
flutter build apk --debug
```

## 📋 App Features to Test

### 🏠 Dashboard Tab
- View user stats and quick actions
- Test navigation between tabs

### 🎤 Practice Tab
- Browse **Recommended** scenarios
- Test **Browse** by conversation type
- Try starting a practice session

### 📊 Progress Tab
- View **Overview** with performance metrics
- Check **Skills** breakdown
- Browse **History** of sessions

### 👤 Profile Tab
- View user profile information
- Test logout functionality

## ⚠️ Known Limitations

### Firebase Setup Required
- **Authentication** won't work without Firebase config
- **Data storage** will use local Hive database only
- **AI Features** need OpenAI API key

### Voice Features
- **Speech-to-text** needs microphone permission
- **Text-to-speech** should work in emulator
- **Recording** may need physical device for best results

## 🔑 Adding API Keys (Optional)

To test AI features, create:
`lib/config/api_keys.dart`
```dart
class ApiKeys {
  static const String openaiApiKey = 'your-openai-api-key-here';
}
```

## 🛠️ Troubleshooting

### Sync Issues
- **File > Invalidate Caches and Restart**
- Wait for Gradle sync to complete

### Build Errors
- **Build > Clean Project**
- **Build > Rebuild Project**

### Emulator Issues
- Ensure **Hardware Acceleration** is enabled
- Try **Cold Boot** the emulator

## ✨ App Architecture Overview

The app follows **Clean Architecture** with:
- **Services**: Voice, AI, Auth, Scenarios, Gamification
- **Models**: User, Conversation, Scoring with Hive storage
- **UI**: Material 3 design with 4 main tabs
- **State Management**: Provider pattern

Ready to test! 🎉
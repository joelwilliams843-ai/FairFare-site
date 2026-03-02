# FairFare Android Build Guide

## Prerequisites

1. **macOS/Windows/Linux** with Android Studio installed
2. **Java JDK 17+**
3. **Node.js 18+** and **Yarn**

## Project Configuration

The Android project is already configured with:
- **Package Name**: `com.fairfare.app`
- **App Name**: `FairFare`
- **Version**: 1.0 (versionCode 1)
- **Target SDK**: 34 (Android 14)
- **Min SDK**: 22 (Android 5.1)

## Build Steps

### 1. Install Dependencies
```bash
cd /app/frontend
yarn install
```

### 2. Build Web App
```bash
yarn build
```

### 3. Sync to Android
```bash
npx cap sync android
```

### 4. Open in Android Studio
```bash
npx cap open android
```

### 5. Generate Release Keystore
If you haven't already, generate a release keystore:
```bash
cd android
keytool -genkey -v -keystore fairfare-release.keystore -alias fairfare \
  -keyalg RSA -keysize 2048 -validity 10000
```

### 6. Configure Signing (Already Done)
The `app/build.gradle` is already configured for signing:
```groovy
signingConfigs {
    release {
        storeFile file('../fairfare-release.keystore')
        storePassword 'fairfare123'  // Change this!
        keyAlias 'fairfare'
        keyPassword 'fairfare123'    // Change this!
    }
}
```

**IMPORTANT**: Before release, change the keystore password to a secure value!

### 7. Build Release AAB
In Android Studio:
1. **Build** → **Generate Signed Bundle/APK**
2. Select **Android App Bundle**
3. Choose your keystore
4. Select **release** build variant
5. Click **Create**

Or via command line:
```bash
cd android
./gradlew bundleRelease
```

The AAB file will be at:
`android/app/build/outputs/bundle/release/app-release.aab`

## Play Store Configuration

### Permissions Used
The app uses only Play Store compliant permissions:
- `INTERNET` - Required for API calls
- `ACCESS_NETWORK_STATE` - Check network connectivity
- `ACCESS_COARSE_LOCATION` - Approximate location for nearby rides
- `ACCESS_FINE_LOCATION` - Precise location for pickup

### Deep Linking
The app is configured to query for Uber and Lyft apps:
```xml
<queries>
    <package android:name="com.ubercab" />
    <package android:name="me.lyft.android" />
</queries>
```

### App Store Information
- **Name**: FairFare
- **Short Description**: Smart ride decisions. Know when to book or wait.
- **Category**: Travel & Local
- **Content Rating**: Everyone

### Screenshots Needed
- Phone (1080 x 1920)
- 7" Tablet (1200 x 1920)
- 10" Tablet (1800 x 2560)

### Feature Graphic
- Size: 1024 x 500

## Keystore Backup

**CRITICAL**: Back up your keystore file and credentials!
- Store `fairfare-release.keystore` securely
- Document the password in a password manager
- You need the same keystore for ALL future updates

## Files Reference

| File | Purpose |
|------|---------|
| `capacitor.config.json` | Capacitor configuration |
| `android/app/build.gradle` | Android build config |
| `android/app/src/main/AndroidManifest.xml` | Permissions & deep links |
| `android/app/src/main/res/values/strings.xml` | App name strings |
| `android/fairfare-release.keystore` | Signing keystore |

## Testing Before Upload

1. **Internal Testing**: Upload AAB to Internal Testing track first
2. **Verify Deep Links**: Test "Continue in Uber/Lyft" buttons
3. **Location Permission**: Test location request flow
4. **Offline Behavior**: Test with network disabled

## Common Issues

### Build Fails
- Ensure Android SDK 34 is installed
- Clean project: `./gradlew clean`
- Invalidate caches in Android Studio

### Signing Issues
- Verify keystore path is correct
- Check password matches
- Ensure key alias is correct

### Deep Links Not Working
- Verify Uber/Lyft apps are installed
- Check `<queries>` in AndroidManifest.xml
- Test on physical device (not emulator)

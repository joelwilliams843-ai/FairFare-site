# FairFare iOS Build Guide

## Prerequisites

1. **macOS** with Xcode 15+ installed
2. **Apple Developer Account** (paid) for App Store submission
3. **Node.js 18+** and **Yarn**
4. **CocoaPods** (`sudo gem install cocoapods`)

## Project Setup

The frontend is already configured with Capacitor 6. The configuration is in:
- `/app/frontend/capacitor.config.json` - Capacitor configuration
- `/app/frontend/package.json` - Build scripts

## Build Steps

### 1. Install Dependencies
```bash
cd /app/frontend
yarn install
```

### 2. Build the Web App
```bash
yarn build
```

### 3. Initialize iOS Project (First Time Only)
```bash
npx cap add ios
```

### 4. Sync Web Build to iOS
```bash
npx cap sync ios
```

### 5. Open in Xcode
```bash
npx cap open ios
```

## Xcode Configuration

### Bundle Identifier
`com.fairfare.app`

### App Name
`FairFare`

### Version
`1.0.0` (Build 1)

### Deployment Target
iOS 14.0+

### Required Capabilities
- Location Services (When In Use)
- Background Modes: None required

### Info.plist Keys
Add these to your Info.plist:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>FairFare needs your location to help you find rides nearby.</string>

<key>LSApplicationQueriesSchemes</key>
<array>
    <string>uber</string>
    <string>lyft</string>
</array>
```

## App Icons

### Required Sizes (AppIcon.appiconset)
Generate from `/app/frontend/public/app-icon.svg`:

| Size | Usage |
|------|-------|
| 20x20 @2x, @3x | Notification |
| 29x29 @2x, @3x | Settings |
| 40x40 @2x, @3x | Spotlight |
| 60x60 @2x, @3x | App Icon |
| 1024x1024 | App Store |

Use a tool like [App Icon Generator](https://appicon.co/) to generate all sizes.

## Splash Screen

The splash screen is configured in `capacitor.config.json`:
- Background Color: `#0A1628` (Dark Navy)
- Duration: 2000ms
- Auto-hide: Yes

For iOS, create Launch Screen storyboard in Xcode or use Capacitor's splash screen plugin.

## Deep Linking Configuration

### URL Schemes
FairFare uses custom URL schemes to open Uber and Lyft apps:
- `uber://` - Opens Uber app
- `lyft://` - Opens Lyft app

The app automatically falls back to web URLs if native apps aren't installed.

### LSApplicationQueriesSchemes
Add `uber` and `lyft` to Info.plist to allow checking if apps are installed.

## TestFlight Submission

### 1. Archive the App
In Xcode: Product → Archive

### 2. Upload to App Store Connect
Use Xcode Organizer or Transporter

### 3. TestFlight Setup
1. Go to App Store Connect
2. Create new app with bundle ID `com.fairfare.app`
3. Fill in app information
4. Add TestFlight testers

## App Store Submission Checklist

### Required Screenshots
- iPhone 6.7" (1290 × 2796)
- iPhone 6.5" (1242 × 2688)
- iPhone 5.5" (1242 × 2208)
- iPad Pro 12.9" 6th gen (2048 × 2732)
- iPad Pro 12.9" 2nd gen (2048 × 2732)

### App Information
- **Name**: FairFare
- **Subtitle**: Mobility Intelligence
- **Description**: Smart ride decisions. Know when to book, wait, or switch providers.
- **Keywords**: ride, uber, lyft, compare, taxi, travel, mobility, decision
- **Category**: Travel (Primary), Utilities (Secondary)
- **Privacy Policy URL**: https://fairfare.app/privacy
- **Support URL**: https://fairfare.app/support

### Content Rights
- No third-party content requiring attribution
- Text-only references to Uber/Lyft (no logos)

### Age Rating
- 4+ (No objectionable content)

### App Review Notes
```
FairFare is a mobility decision assistant that helps users decide when to book rides.

Key points for review:
1. We do NOT provide actual ride prices - only guidance on demand levels
2. We redirect to Uber/Lyft apps for actual booking
3. No user accounts or payment processing
4. Location is only used when requested by user

Test the app:
1. Enter "Times Square, NYC" as pickup
2. Enter "Central Park, NYC" as destination
3. Tap "Compare Rides"
4. See demand guidance and tap "Continue in Uber" to open Uber app
```

## Known Limitations (V1)

- **Mocked Data**: Backend uses time-based heuristics, not real Uber/Lyft APIs
- **No User Accounts**: All data stored locally
- **Features Hidden for V1**:
  - "Ride for Someone Else" (P1)
  - "Surge Guard" monitoring (P2)

## Files Reference

| File | Purpose |
|------|---------|
| `capacitor.config.json` | Capacitor configuration |
| `public/app-icon.svg` | App icon (1024x1024 source) |
| `public/splash.svg` | Splash screen design |
| `public/manifest.json` | PWA manifest |
| `src/PrivacyPolicy.js` | Privacy Policy page |
| `src/Terms.js` | Terms of Service page |

## Support

For issues with the build, contact: dev@fairfare.app

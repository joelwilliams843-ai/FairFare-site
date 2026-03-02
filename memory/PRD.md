# FairFare - Mobility Decision Assistant

## Original Problem Statement
Build a lightweight, mobile-first PWA called "FairFare" to help users decide when to book a ride. The app answers: **"Should I book now, wait, or choose a different provider?"**

**Product Vision:** FairFare is a decision layer, NOT a fare comparison scraper. We provide guidance, not price predictions.

**Status:** Production Readiness V1 - Preparing for iOS App Store submission

## User Personas
- Commuters who want to quickly decide between Uber and Lyft
- Travelers looking for the best time to book
- Users who frequently travel the same routes (weekend rides)

## V1 Release Features (App Store Ready)

### Core Decision Engine (COMPLETED)
- ✅ Traveler-friendly demand labels:
  - "Good time to ride" (green)
  - "Normal demand" (blue)
  - "Busy — expect delays" (orange)
  - "High demand — consider waiting" (red)
- ✅ Recommendation banner with actionable advice
- ✅ Surge likelihood indicators
- ✅ "Live price shown in app" messaging
- ✅ No fake numerical pricing

### Route Validation (COMPLETED)
- ✅ Coordinate validation before comparison
- ✅ Long trip confirmation modal (> 150 miles)
- ✅ Sanity check rejection (> 1000 miles)
- ✅ Auto-geocode for recent locations

### Deep Linking (COMPLETED)
- ✅ App-first approach with fallback timer
- ✅ "Opening [Provider]..." micro-loader
- ✅ Works for both Uber and Lyft
- ✅ Web fallback for desktop/no app installed

### iOS Native Build (COMPLETED)
- ✅ Capacitor 6 configured
- ✅ Bundle ID: `com.fairfare.app`
- ✅ iOS-specific settings configured
- ✅ Splash screen and status bar setup

### Legal Pages (COMPLETED)
- ✅ Privacy Policy at /privacy
- ✅ Terms of Service at /terms
- ✅ "No Affiliation" disclaimer for App Store compliance
- ✅ Footer with legal links

### App Branding (COMPLETED)
- ✅ Premium app icon (stylized F with signal lines)
- ✅ Deep blue gradient theme (#1E6BFF → #6366F1)
- ✅ Dark navy background (#0A1628)
- ✅ No Uber/Lyft logos (text-only references)
- ✅ Splash screen design

### App Store Compliance (COMPLETED)
- ✅ No third-party logos
- ✅ Text-only references to Uber/Lyft
- ✅ Privacy Policy and Terms pages
- ✅ "No Affiliation" disclaimer

## Technical Stack
- **Frontend:** React.js, Capacitor 6, PWA
- **Backend:** FastAPI (Python), Pydantic
- **Geocoding:** OpenStreetMap Nominatim
- **Native:** Capacitor for iOS

## Files Structure
```
/app
├── backend/
│   └── server.py
├── frontend/
│   ├── capacitor.config.json  # iOS native config
│   ├── src/
│   │   ├── App.js            # Main app
│   │   ├── PrivacyPolicy.js  # Legal page
│   │   ├── Terms.js          # Legal page
│   │   └── index.js          # Router
│   └── public/
│       ├── app-icon.svg      # 1024x1024 icon
│       ├── splash.svg        # Splash screen
│       └── manifest.json
├── IOS_BUILD_GUIDE.md        # Build instructions
└── memory/
    └── PRD.md
```

## Hidden for V1 (Post-Approval)
- [ ] "Ride for someone else" feature (P1)
- [ ] "Surge Guard" monitoring (P2)
- [ ] Real Uber/Lyft API integration

## Known Limitations (V1)
- **MOCKED:** Backend uses time-based heuristics, not real APIs
- **No User Accounts:** All data stored locally
- **Decision guidance only:** No actual price predictions

## App Store Information
- **Name:** FairFare
- **Subtitle:** Mobility Intelligence
- **Bundle ID:** com.fairfare.app
- **Category:** Travel (Primary), Utilities (Secondary)
- **Age Rating:** 4+
- **Privacy Policy:** /privacy
- **Terms:** /terms

## Test Reports
- `/app/test_reports/iteration_7.json` - Production readiness tests passing
- All 39+ tests passing

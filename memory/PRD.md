# FairFare - Mobility Decision Assistant

## Original Problem Statement
Build a lightweight, mobile-first PWA called "FairFare" to help users decide when to book a ride. The app answers: **"Should I book now, wait, or choose a different provider?"**

**Product Vision:** FairFare is a decision layer, NOT a fare comparison scraper. We provide guidance, not price predictions.

**Status:** Production Readiness V1 - Android Play Store & iOS App Store preparation

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

### Address Search & Autocomplete (COMPLETED - March 2025)
- ✅ **POI Recognition:** 100+ brand keywords (Publix, McDonalds, Target, Starbucks, CVS, Tanger, etc.)
- ✅ **Location Biasing:** Results biased to user's current location
- ✅ **Distance-Based Sorting:** Nearest POI results shown first
- ✅ **Distance Badges:** Green distance indicators (e.g., "0.7 mi", "2.5 mi")
- ✅ **Airport Code Recognition:** 40+ US airports with instant matching
- ✅ **Search Caching:** Faster repeated queries
- ✅ **POI Categories:** Grocery, fast food, retail, hotels, pharmacies, gas stations, banks, fitness
- ✅ **Favorites:** Save frequently visited locations for one-tap selection

### Ride Comparison & Handoff (COMPLETED - March 2025)
- ✅ **Savings Moment**: Shows "Save $X by choosing [Provider]" with prominent CTA
- ✅ **Cheapest Badge**: Green "CHEAPEST" badge on lowest-priced option
- ✅ **Price Display**: Shows "Est. $XX" with "Final price in app" disclaimer
- ✅ **Open Cheapest Button**: Primary "Open [Provider] — Best Fare" CTA
- ✅ **Deep Link Error Handling**: Shows "Opening..." overlay, fallback to web if app not installed
- ✅ **Savings Tracking**: Tracks cumulative savings in localStorage
- ✅ **Auto-Geocoding**: Typed addresses auto-geocode if coordinates missing
- ✅ **Less Strict Validation**: Users can type addresses without selecting from dropdown
- ✅ **Address Preservation**: User-typed street numbers preserved when selecting suggestions
- ✅ **Coordinates for Handoff**: Deep links use lat/lng coordinates, not text addresses

### Error Handling & Loading States (COMPLETED - March 2025)
- ✅ **Loading State**: Animated spinner with "Finding the best fares..." message
- ✅ **Error State**: User-friendly error display with retry/back options
- ✅ **Validation Messages**: Clear prompts when coordinates are missing
- ✅ **Error Logging**: Comprehensive console logs for debugging (geocoding, API, routing errors)
- ✅ **Button State**: Dynamic button text shows required action ("Select pickup from suggestions")
- ✅ **Prevents blank screens**: Validates coordinates before rendering results view
- ✅ **Network Status**: Online/offline detection with user notification
- ✅ **Retry Logic**: Automatic retry for failed searches (up to 2 retries with exponential backoff)
- ✅ **Nearby Labels**: Blue "NEARBY" badge for locations within 5 miles

### Share My Savings (COMPLETED)
- ✅ Generate shareable "savings card" image
- ✅ Native Web Share API integration
- ✅ Social media ready format

### Price Alerts / Watch This Route (COMPLETED)
- ✅ Watch routes for price changes
- ✅ Browser Notifications API for alerts
- ✅ localStorage persistence
- ✅ Price drop notifications

### iOS Native Build (COMPLETED)
- ✅ Capacitor 6 configured
- ✅ Bundle ID: `com.fairfare.app`
- ✅ iOS-specific settings configured
- ✅ Splash screen and status bar setup

### Android Native Build (COMPLETED)
- ✅ Capacitor Android configured
- ✅ Package ID: `com.tryfairfare.app`
- ✅ Dark splash screen (#0A1628)
- ✅ targetSdkVersion: 35
- ✅ compileSdkVersion: 35
- ✅ Signed release keystore ready
- ✅ GitHub Actions CI/CD workflow

### Legal Pages (COMPLETED)
- ✅ Privacy Policy at /privacy
- ✅ Terms of Service at /terms
- ✅ "No Affiliation" disclaimer for App Store compliance
- ✅ Footer with legal links

### App Branding (COMPLETED)
- ✅ Custom "F" logo with emerald green accent
- ✅ Dark theme (#0F172A background - Slate 900)
- ✅ Emerald green accent (#10B981)
- ✅ No Uber/Lyft logos (text-only references)
- ✅ Splash screen design
- ✅ **Visual Polish (March 2025):** Reduced neon/techy feel, cleaner consumer-friendly appearance

### Crash-Proof Handoff System (COMPLETED - March 2025)
- ✅ **Handoff Modal:** Always shows "Opening [Provider]..." before any navigation
- ✅ **Deep Link Logic:** Uses Capacitor App plugin for `lyft://` and `uber://` schemes
- ✅ **Web Fallback:** Uses Capacitor Browser plugin for `https://` fallback URLs
- ✅ **Timeout Safety:** 3-second timeout shows error state with options
- ✅ **Fallback Buttons:** "Open [Provider] App" retry and "Open [Provider] Website" buttons
- ✅ **Back Button:** User can always close modal and return to results
- ✅ **Blank Screen Prevention:** Modal always visible during handoff process
- ✅ **Logging:** Comprehensive handoff event logging for debugging

## Technical Stack
- **Frontend:** React.js, Capacitor 6, PWA
- **Backend:** FastAPI (Python), Pydantic
- **Geocoding:** OpenStreetMap Nominatim
- **Native:** Capacitor for iOS & Android
- **CI/CD:** GitHub Actions for Android builds

## Files Structure
```
/app
├── backend/
│   └── server.py
├── frontend/
│   ├── android/                    # Android native project
│   │   ├── app/build.gradle       # Version 5, SDK 35
│   │   ├── variables.gradle       # SDK versions
│   │   └── fairfare-release-v2.keystore
│   ├── capacitor.config.json      # Native config
│   ├── src/
│   │   ├── App.js                 # Main app (2300+ lines)
│   │   ├── App.css                # Main styles
│   │   ├── PrivacyPolicy.js       # Legal page
│   │   ├── Terms.js               # Legal page
│   │   └── index.js               # Router
│   └── public/
│       ├── icon-512.png           # Play Store icon
│       ├── feature-graphic.png    # Play Store graphic
│       └── manifest.json
├── .github/
│   └── workflows/
│       └── build-android.yml      # CI/CD for Android
├── IOS_BUILD_GUIDE.md
└── memory/
    └── PRD.md
```

## Known Limitations (V1)
- **MOCKED:** Backend uses time-based heuristics, not real APIs
- **No User Accounts:** All data stored locally
- **Decision guidance only:** No actual price predictions

## Pending Tasks

### P0 - Critical (Blocker)
- [ ] **Native Handoff Testing:** Deep linking (`lyft://`, `uber://`) requires testing on native build, NOT web preview. User must build and test on physical device.
- [ ] **Android Build Workflow:** User must click "Save to GitHub" BEFORE running CI/CD pipeline to sync version changes

### P1 - Important
- [ ] "Ride for someone else" feature
- [ ] Real map integration (pending Mapbox API key)
- [ ] Cumulative savings counter across all users

### P2 - Backlog
- [ ] Intermittent "Failed to load" error investigation
- [ ] Refactor App.js (3400+ lines - urgently needs component breakdown)
- [ ] "FairFare Plus - Surge Guard" premium feature

## App Store Information
- **Name:** FairFare
- **Subtitle:** Mobility Intelligence
- **Android Package:** com.tryfairfare.app
- **iOS Bundle ID:** com.fairfare.app
- **Category:** Travel (Primary), Utilities (Secondary)
- **Age Rating:** 4+
- **Privacy Policy:** /privacy
- **Terms:** /terms

## Changelog
- **March 2025:** Visual polish - reduced neon/techy feel, more consumer-friendly appearance
- **March 2025:** Crash-proof handoff system with modal, timeout safety, and fallback buttons
- **March 2025:** Enhanced address search with POI recognition, location biasing, distance sorting

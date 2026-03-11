# FairFare - Mobility Decision Assistant

## Original Problem Statement
Build a lightweight, mobile-first PWA called "FairFare" to help users decide when to book a ride. The app answers: **"Should I book now, wait, or choose a different provider?"**

**Product Vision:** FairFare is a decision layer, NOT a fare comparison scraper. We provide guidance, not price predictions.

**Status:** Production Readiness V1.1 - Google Places API Integration Complete

## User Personas
- Commuters who want to quickly decide between Uber and Lyft
- Travelers looking for the best time to book
- Users who frequently travel the same routes (weekend rides)

## V1.1 Production Features (March 2025)

### Google Places API Integration (COMPLETED - March 2025)
- ✅ **Verified Addresses:** All addresses verified via Google Places API with place_id
- ✅ **Accurate Coordinates:** Latitude/longitude fetched from Google Place Details API
- ✅ **POI Search:** Schools, businesses, airports all searchable with accurate results
- ✅ **Location Biasing:** Results biased to user's current location (25km radius)
- ✅ **Strict Validation:** Users must select from verified suggestions
- ✅ **Session Tokens:** Billing-optimized with Google Places session tokens

### Price Range Display with Surge Buffer (COMPLETED - March 2025)
- ✅ **Range Format:** Shows "Estimated $48–69" instead of single price
- ✅ **Surge Buffer:** 30% buffer added to high estimate
- ✅ **Time-of-Day:** Rush hour (1.3x) and late night (1.15x) multipliers
- ✅ **Disclaimer:** "Final price shown in Uber/Lyft app" visible on all cards

### Passenger Context (COMPLETED - March 2025)
- ✅ **Rider Type:** Me / My Child / Family / Guest options
- ✅ **Passenger Count:** 1, 2, 3, 4+ selection
- ✅ **Future-Ready:** Data stored for safety features

### Post-Ride Feedback Loop (COMPLETED - March 2025)
- ✅ **Return Detection:** Detects when user returns from Uber/Lyft app
- ✅ **Confirmation Prompt:** "Did you book this ride?"
- ✅ **Savings Tracking:** "You saved approximately $X using FairFare"
- ✅ **Habit Building:** Reinforces app usage

### Core Decision Engine (COMPLETED)
- ✅ Traveler-friendly demand labels:
  - "Good time to ride" (green)
  - "Normal demand" (blue)
  - "Busy — expect delays" (orange)
  - "High demand — consider waiting" (red)
- ✅ Recommendation banner with actionable advice
- ✅ Surge likelihood indicators
- ✅ CHEAPEST and FASTEST badges only

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

### iOS Native Build (COMPLETED - March 2025)
- ✅ Capacitor 5 configured (`@capacitor/ios@5.7.8`)
- ✅ Bundle ID: `com.tryfairfare.app`
- ✅ iOS-specific Info.plist configurations:
  - Location permissions configured
  - URL scheme `fairfare://` for deep linking
  - `LSApplicationQueriesSchemes` for Uber/Lyft app detection
  - App Transport Security configured
- ✅ App icon updated with FairFare logo (1024x1024)
- ✅ Splash screen with FairFare branding
- ✅ GitHub Actions CI/CD workflow (`.github/workflows/build-ios.yml`)

### Android Native Build (COMPLETED - March 2025)
- ✅ Capacitor Android configured (`@capacitor/android@5.7.8`)
- ✅ Package ID: `com.tryfairfare.app`
- ✅ Dark splash screen (#0A1628)
- ✅ targetSdkVersion: 35 (Google Play requirement)
- ✅ compileSdkVersion: 35
- ✅ Signed release keystore ready (`fairfare-upload.keystore`)
- ✅ GitHub Actions CI/CD workflow (`.github/workflows/build-android.yml`)
- ✅ Current version: 1.0.11 (versionCode 11)

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
- **March 2025:** Google Places API integration for verified addresses and accurate coordinates
- **March 2025:** Price range display with surge buffer ($48–69 format)
- **March 2025:** Passenger context fields (Who is riding? / Passengers)
- **March 2025:** Post-ride feedback loop ("Did you book this ride?")
- **March 2025:** Strict address validation (require verified place_id selection)
- **March 2025:** Simplified badges - only CHEAPEST and FASTEST, removed FairFare Pick
- **March 2025:** Reduced neon glow on cards by 40% for consumer-friendly feel
- **March 2025:** Visual polish - reduced neon/techy feel, more consumer-friendly appearance
- **March 2025:** Crash-proof handoff system with modal, timeout safety, and fallback buttons

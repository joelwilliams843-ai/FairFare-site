# FairFare - Mobility Decision Engine

## Original Problem Statement
Build a lightweight, mobile-first PWA called "FairFare" to compare ride prices and wait times between Uber and Lyft. The app should feature a single input screen for pickup and destination, a comparison results screen, deep linking to provider apps, and the ability to save one route to local storage.

**Key Pivot (March 2026):** Transform from a "fare calculator" to a "Mobility Decision Engine" - remove all fake numerical pricing and show qualitative indicators instead to build user trust.

## User Personas
- Commuters who want to quickly decide between Uber and Lyft
- Price-conscious riders looking for the best time to book
- Users who frequently travel the same routes (weekend rides)

## Core Requirements

### Route Validation Layer (P0 - COMPLETED)
- ✅ Both pickup AND destination must have valid lat/lng before comparison
- ✅ Distance > 150 miles shows confirmation modal (not hard rejection)
- ✅ Distance > 1000 miles rejected (geocoding sanity check)
- ✅ Frontend disables "Compare" button until coordinates are validated
- ✅ Auto-geocode when selecting from recent locations

### Decision Engine (P0 - COMPLETED)
- ✅ No fake numerical pricing - removed all dollar amounts
- ✅ Premium demand labels: "Favorable", "Balanced", "Elevated", "Peak"
- ✅ Surge likelihood: "Low", "Moderate", "High" (separate line)
- ✅ "Demand estimate" labeling to indicate data is estimated
- ✅ Contextual decision hints based on time of day
- ✅ "Live price shown in app" messaging
- ✅ Color-coded indicators (green/yellow/orange/red)

### Deep Link Improvements (P0 - COMPLETED)
- ✅ App-first deep linking: Try native scheme first (lyft://...)
- ✅ Short fallback timer (1.5s) to web if app not detected
- ✅ "Opening [Provider]..." micro-loader on button tap
- ✅ Visibility change detection for app open success

### Long Trip Handling (P0 - COMPLETED)
- ✅ Routes > 150 miles show confirmation modal
- ✅ "Long Trip Detected" with distance/duration
- ✅ "Yes, Continue" and "Go Back" buttons
- ✅ Routes > 1000 miles still rejected (geocoding error protection)

### Core Features (COMPLETED)
- ✅ Address autocomplete via OpenStreetMap Nominatim
- ✅ Current location detection via Geolocation API
- ✅ Recent locations history (localStorage)
- ✅ Save one "Weekend Ride" to localStorage
- ✅ Deep links to Uber and Lyft apps with pre-filled coordinates
- ✅ Web fallback links for desktop users
- ✅ PWA - fully installable

### FairFare Pick (COMPLETED)
- ✅ Recommended option based on availability + arrival time
- ✅ "Best Right Now" badge
- ✅ Demand and surge indicators

## Technical Stack
- **Frontend:** React.js, PWA, Browser Geolocation API, localStorage
- **Backend:** FastAPI (Python), Pydantic
- **Geocoding:** OpenStreetMap Nominatim (free, no API key)
- **Database:** None (no user accounts)

## Architecture
```
/app
├── backend/
│   ├── server.py         # FastAPI with Decision Engine logic
│   ├── tests/            # pytest tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js        # Main React component
│   │   └── App.css       # Styles
│   └── public/
│       ├── manifest.json # PWA config
│       └── service-worker.js
└── memory/
    └── PRD.md            # This file
```

## API Endpoints
- `POST /api/compare-rides` - Returns Decision Engine data (no prices)
  - Response includes: `requires_confirmation: true` for routes > 150 miles
- `GET /api/` - Health check

## What's Implemented (March 2026)

### P0 Complete - Premium Brand Polish
1. **Premium Labels:** Favorable/Balanced/Elevated/Peak (removed "Cheap")
2. **Long Trip Modal:** Confirmation for > 150 miles, still rejects > 1000 miles
3. **Deep Link Fix:** App-first with "Opening..." loader
4. **Demand Estimate Label:** Clearly marks data as estimated

### Previous Work
- Decision Engine Pivot (no fake prices)
- Route Validation Layer
- Coordinate validation before comparison
- Auto-geocode for recent locations

## Backlog

### P1 - Next Up
- [ ] "Ride for someone else" feature (partially started)
  - Add passenger name/phone fields
  - Post-click helper card
  - SMS sharing

### P2 - Future
- [ ] "Best Time to Book" feature with safe framing
  - Generalized insights (time-of-day, day-of-week)
  - "Tends to be calmer after 9pm (estimate)"
  - Confidence indicators: Low/Med/High
- [ ] "FairFare Plus - Surge Guard" feature
  - Price monitoring
  - Surge detection alerts
- [ ] Real Uber/Lyft API integration (when available)
- [ ] Refactor App.js into smaller components
- [ ] Error boundary for graceful error handling
- [ ] Investigate intermittent "Failed to load" errors

## Known Limitations
- **MOCKED:** Backend is entirely mocked - no real Uber/Lyft API calls
- Decision engine uses time-based heuristics (not real demand data)
- Geocoding depends on OpenStreetMap Nominatim availability

## Test Reports
- `/app/test_reports/iteration_5.json` - P0 features all passing
- `/app/backend/tests/test_decision_engine.py` - pytest tests

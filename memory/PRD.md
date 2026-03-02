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
- ✅ Distance must be < 150 miles (reject with clear error message if exceeded)
- ✅ Frontend disables "Compare" button until coordinates are validated
- ✅ Auto-geocode when selecting from recent locations

### Decision Engine (P0 - COMPLETED)
- ✅ No fake numerical pricing - removed all dollar amounts
- ✅ Qualitative demand indicators: "Cheap", "Moderate", "Busy"
- ✅ Surge likelihood: "Low", "Moderate", "High"
- ✅ Contextual decision hints based on time of day
- ✅ "Live price shown in app" messaging
- ✅ Color-coded indicators (green=good, yellow=moderate, red=busy)

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
- `GET /api/` - Health check

## What's Implemented (March 2026)

### Decision Engine Pivot
- Removed all fake pricing logic from backend
- Added time-based heuristics for demand/surge indicators
- Backend rejects routes > 150 miles
- Frontend validates coordinates before enabling Compare

### Route Validation
- Frontend disables Compare button until both coords valid
- Shows validation message: "Enter pickup location", "Select pickup from suggestions", etc.
- Recent location selection now auto-geocodes

### UI Updates
- Demand levels with color coding (Cheap=green, Moderate=yellow, Busy=red)
- Surge likelihood indicators
- "Live price shown in app" messaging
- "Best Right Now" instead of "Best Value"

## Backlog

### P1 - Next Up
- [ ] "Ride for someone else" feature (partially started)
  - Add passenger name/phone fields
  - Post-click helper card
  - SMS sharing

### P2 - Future
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
- `/app/test_reports/iteration_4.json` - All Decision Engine tests passing
- `/app/backend/tests/test_decision_engine.py` - pytest tests

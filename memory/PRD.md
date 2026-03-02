# FairFare - Mobility Decision Assistant

## Original Problem Statement
Build a lightweight, mobile-first PWA called "FairFare" to help users decide when to book a ride. The app answers: **"Should I book now, wait, or choose a different provider?"**

**Product Vision:** FairFare is a decision layer, NOT a fare comparison scraper. We provide guidance, not price predictions.

## User Personas
- Commuters who want to quickly decide between Uber and Lyft
- Travelers looking for the best time to book
- Users who frequently travel the same routes (weekend rides)

## Core Requirements

### Route Validation Layer (COMPLETED)
- ✅ Both pickup AND destination must have valid lat/lng before comparison
- ✅ Distance > 150 miles shows confirmation modal (not hard rejection)
- ✅ Distance > 1000 miles rejected (geocoding sanity check)
- ✅ Frontend disables "Compare" button until coordinates are validated
- ✅ Auto-geocode when selecting from recent locations

### Decision Engine (COMPLETED)
- ✅ No fake numerical pricing - guidance only
- ✅ Traveler-friendly demand labels:
  - "Good time to ride" (green)
  - "Normal demand" (blue)
  - "Busy — expect delays" (orange)
  - "High demand — consider waiting" (red)
- ✅ Surge likelihood: "Low", "Moderate", "High" (separate line)
- ✅ **Recommendation banner** with actionable advice:
  - "Recommended: Book now for standard rates and quick pickup."
  - "Tip: Waiting 20–30 minutes may reduce wait times and surge likelihood."
- ✅ Decision hint with situational context
- ✅ "Live price shown in app" messaging
- ✅ No abstract "Demand Estimate" labels

### Deep Link Improvements (COMPLETED)
- ✅ App-first deep linking: Try native scheme first (lyft://...)
- ✅ Short fallback timer (1.5s) to web if app not detected
- ✅ "Opening [Provider]..." micro-loader on button tap
- ✅ Visibility change detection for app open success

### Long Trip Handling (COMPLETED)
- ✅ Routes > 150 miles show confirmation modal
- ✅ "Long Trip Detected" with distance/duration
- ✅ "Yes, Continue" and "Go Back" buttons
- ✅ Long trip recommendation: "Recommended: Book now and confirm driver before starting."

### Core Features (COMPLETED)
- ✅ Address autocomplete via OpenStreetMap Nominatim
- ✅ Current location detection via Geolocation API
- ✅ Recent locations history (localStorage)
- ✅ Save one "Weekend Ride" to localStorage
- ✅ Deep links to Uber and Lyft apps with pre-filled coordinates
- ✅ Web fallback links for desktop users
- ✅ PWA - fully installable

## Technical Stack
- **Frontend:** React.js, PWA, Browser Geolocation API, localStorage
- **Backend:** FastAPI (Python), Pydantic
- **Geocoding:** OpenStreetMap Nominatim (free, no API key)
- **Database:** None (no user accounts)

## API Endpoints
- `POST /api/compare-rides` - Returns Decision Engine data
  - Response includes: `recommendation`, `decision_hint`, `requires_confirmation`
- `GET /api/` - Health check

## What's Implemented (March 2026)

### Traveler-Friendly Language
- Demand labels that users understand (Good time to ride, Normal demand, etc.)
- Recommendation banner with actionable advice at top of results
- Decision hint providing situational context
- Wait time shows "X min away" format

### Previous Work
- Premium brand polish (removed "Cheap" terminology)
- Long trip confirmation modal
- Deep link improvements with loader
- Route validation layer
- Coordinate validation before comparison

## Backlog

### P1 - Next Up
- [ ] **"Ride for someone else" feature** (major differentiator)
  - Add passenger name/phone fields
  - Post-click helper card
  - SMS sharing

### P2 - Future
- [ ] **"Surge Guard" monitoring** (premium feature candidate)
  - Price monitoring
  - Surge detection alerts
- [ ] Real Uber/Lyft API integration (when available)
- [ ] Refactor App.js into smaller components
- [ ] Error boundary for graceful error handling

## Known Limitations
- **MOCKED:** Backend is entirely mocked - no real Uber/Lyft API calls
- Decision engine uses time-based heuristics (not real demand data)
- Will NOT introduce price estimates without official API partnerships

## Test Reports
- `/app/test_reports/iteration_6.json` - All features passing
- `/app/backend/tests/test_decision_engine.py` - pytest tests

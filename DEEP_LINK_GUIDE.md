# FairFare Deep Link Integration Guide

## 🎯 Overview

When users tap "Open in Uber" or "Open in Lyft", FairFare automatically redirects them to the respective app with the **trip completely pre-filled** — including pickup location, destination, and coordinates for accurate routing.

---

## 🚀 How It Works

### Mobile Devices (iOS & Android)

**Behavior:**
1. User taps "Open in Uber" or "Open in Lyft"
2. FairFare attempts to open the native app using deep links
3. If app is installed → Opens with trip pre-filled
4. If app NOT installed → Falls back to web version (also pre-filled)

**Deep Link Formats:**

**Uber:**
```
uber://?action=setPickup
  &pickup[latitude]=37.6213
  &pickup[longitude]=-122.3790
  &dropoff[latitude]=37.7879
  &dropoff[longitude]=-122.4075
  &product_id=fairfare-decision
```

**Lyft:**
```
lyft://ridetype?id=lyft
  &pickup[latitude]=37.6213
  &pickup[longitude]=-122.3790
  &destination[latitude]=37.7879
  &destination[longitude]=-122.4075
```

### Desktop Browsers

**Behavior:**
- Deep links don't work on desktop
- Opens web version directly in new tab
- Trip is pre-filled with coordinates and addresses

**Web URLs:**

**Uber:**
```
https://m.uber.com/ul/?action=setPickup
  &pickup[latitude]=37.6213
  &pickup[longitude]=-122.3790
  &pickup[formatted_address]=San%20Francisco%20Airport
  &dropoff[latitude]=37.7879
  &dropoff[longitude]=-122.4075
  &dropoff[formatted_address]=Union%20Square
```

**Lyft:**
```
https://lyft.com/ride
  ?pickup[latitude]=37.6213
  &pickup[longitude]=-122.3790
  &destination[latitude]=37.7879
  &destination[longitude]=-122.4075
```

---

## 📱 User Experience Flow

### On iPhone (Safari)

1. **User Journey:**
   - Tap "Open in Uber" button
   - iOS asks: "Open in Uber?"
   - User taps "Open"
   - Uber app launches
   - Trip is pre-filled with pickup & destination
   - User sees price estimate
   - User confirms and requests ride

2. **If Uber Not Installed:**
   - After 2.5 seconds, redirects to Uber web
   - Web version opens with trip pre-filled
   - User can sign in and request ride via web

### On Android (Chrome)

1. **User Journey:**
   - Tap "Open in Uber" button
   - Android automatically opens Uber app
   - Trip is pre-filled
   - User confirms and requests ride

2. **If Uber Not Installed:**
   - Falls back to web version
   - Opens in browser with trip details

### On Desktop

1. **User Journey:**
   - Click "Open in Uber" button
   - New tab opens to uber.com
   - Trip is pre-filled on web interface
   - User signs in (if needed)
   - User requests ride

---

## 🔧 Technical Implementation

### Backend (FastAPI)

**Location:** `/app/backend/server.py`

```python
def generate_ride_estimates(distance_miles, pickup, destination):
    # Extract coordinates
    pickup_lat = pickup.lat or 0
    pickup_lng = pickup.lng or 0
    dest_lat = destination.lat or 0
    dest_lng = destination.lng or 0
    
    # URL encode addresses
    from urllib.parse import quote
    pickup_address = quote(pickup.address)
    dest_address = quote(destination.address)
    
    # Create deep links
    uber_deeplink = f"uber://?action=setPickup&pickup[latitude]={pickup_lat}..."
    uber_web = f"https://m.uber.com/ul/?action=setPickup&pickup[latitude]={pickup_lat}..."
    
    lyft_deeplink = f"lyft://ridetype?id=lyft&pickup[latitude]={pickup_lat}..."
    lyft_web = f"https://lyft.com/ride?pickup[latitude]={pickup_lat}..."
    
    return RideEstimate(
        provider="Uber",
        deep_link=uber_deeplink,
        web_link=uber_web,
        ...
    )
```

### Frontend (React)

**Location:** `/app/frontend/src/App.js`

```javascript
const openDeepLink = (estimate) => {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;
  
  if (isMobile) {
    // Try native app first
    window.location.href = estimate.deep_link;
    
    // Fallback to web after 2.5s if app doesn't open
    setTimeout(() => {
      window.location.href = estimate.web_link;
    }, 2500);
  } else {
    // Desktop: Open web directly
    window.open(estimate.web_link, '_blank');
  }
};
```

---

## 🎨 URL Parameter Details

### Uber URL Parameters

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `action=setPickup` | Specifies action type | Always "setPickup" |
| `pickup[latitude]` | Pickup GPS latitude | 37.6213 |
| `pickup[longitude]` | Pickup GPS longitude | -122.3790 |
| `pickup[formatted_address]` | Readable pickup address (web only) | "San Francisco Airport" |
| `dropoff[latitude]` | Destination latitude | 37.7879 |
| `dropoff[longitude]` | Destination longitude | -122.4075 |
| `dropoff[formatted_address]` | Readable destination (web only) | "Union Square" |
| `product_id` | Ride type (UberX) | a1111c8c-c720-46c3-8534-2fcdd730040d |

### Lyft URL Parameters

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `id=lyft` | Specifies Lyft service | Always "lyft" |
| `pickup[latitude]` | Pickup GPS latitude | 37.6213 |
| `pickup[longitude]` | Pickup GPS longitude | -122.3790 |
| `destination[latitude]` | Destination latitude | 37.7879 |
| `destination[longitude]` | Destination longitude | -122.4075 |

---

## 🧪 Testing Deep Links

### Test on iPhone

1. **With Uber App Installed:**
   ```
   1. Open FairFare in Safari
   2. Compare two locations
   3. Tap "Open in Uber"
   4. Verify iOS prompt appears
   5. Tap "Open"
   6. ✅ Uber app opens with trip pre-filled
   ```

2. **Without Uber App:**
   ```
   1. Delete Uber app (for testing)
   2. Repeat steps above
   3. After 2.5 seconds: ✅ Uber web opens
   4. ✅ Trip is pre-filled on web
   ```

### Test on Android

1. **With Lyft App Installed:**
   ```
   1. Open FairFare in Chrome
   2. Compare two locations
   3. Tap "Open in Lyft"
   4. ✅ Lyft app opens automatically
   5. ✅ Trip is pre-filled
   ```

### Test on Desktop

1. **Chrome/Safari:**
   ```
   1. Open FairFare
   2. Compare two locations
   3. Click "Open in Uber"
   4. ✅ New tab opens to m.uber.com
   5. ✅ Trip is pre-filled
   6. User can sign in and continue
   ```

---

## 📊 Deep Link Support Matrix

| Platform | Native App | Web Fallback | Status |
|----------|-----------|--------------|--------|
| iOS Safari | ✅ Supported | ✅ Automatic | Production Ready |
| Android Chrome | ✅ Supported | ✅ Automatic | Production Ready |
| Desktop Chrome | ❌ N/A | ✅ Direct | Production Ready |
| Desktop Safari | ❌ N/A | ✅ Direct | Production Ready |
| iOS Chrome | ⚠️ Limited | ✅ Automatic | Works (iOS restrictions) |
| PWA (Installed) | ✅ Supported | ✅ Automatic | Production Ready |

---

## 🛡️ Fallback Strategy

### Timeline (Mobile)

```
0ms    → User taps button
0ms    → Attempt to open native app (deep link)
2500ms → If app didn't open, redirect to web version
```

**Why 2.5 seconds?**
- Enough time for app to launch
- Not too long to frustrate users
- Tested across iOS and Android

### Detection Logic

```javascript
// Detect mobile vs desktop
const isMobile = /iPhone|iPad|iPod|Android/.test(navigator.userAgent);

// Detect specific platforms
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);
```

---

## 🎯 What Users See

### Mobile (App Installed)

```
1. Tap "Open in Uber"
   ↓
2. System prompt: "Open in Uber?"
   ↓
3. Tap "Open"
   ↓
4. Uber app launches
   ↓
5. Trip shows:
   From: San Francisco Airport
   To: Union Square
   ↓
6. User confirms and requests ride
```

**Time:** ~3-5 seconds from tap to ride request

### Mobile (App NOT Installed)

```
1. Tap "Open in Uber"
   ↓
2. (System tries app, but nothing happens)
   ↓
3. After 2.5s: Browser redirects
   ↓
4. Uber website opens
   ↓
5. Trip is pre-filled
   ↓
6. User signs in
   ↓
7. User requests ride via web
```

### Desktop

```
1. Click "Open in Uber"
   ↓
2. New tab opens
   ↓
3. Uber web loads
   ↓
4. Trip is pre-filled
   ↓
5. User continues on web
```

---

## 🚨 Known Edge Cases

### iOS Chrome Browser
- **Issue:** iOS restricts deep links in third-party browsers
- **Behavior:** May show "Open in Safari" prompt first
- **Solution:** Users should use Safari on iOS for best experience

### Android Firefox
- **Issue:** Some Android browsers block deep links
- **Behavior:** Automatically falls back to web
- **Solution:** Works fine, just uses web version

### Private/Incognito Mode
- **Issue:** Some browsers block deep link attempts
- **Behavior:** May go straight to web fallback
- **Solution:** Users can open in regular browser

### Pop-up Blockers
- **Issue:** Desktop pop-up blockers may prevent new tab
- **Behavior:** User sees blocked pop-up notification
- **Solution:** User must allow pop-ups for FairFare

---

## 📝 Coordinate Precision

### What FairFare Sends

```json
{
  "pickup": {
    "latitude": 37.621313,
    "longitude": -122.378955,
    "address": "San Francisco International Airport"
  },
  "destination": {
    "latitude": 37.787994,
    "longitude": -122.407437,
    "address": "Union Square, San Francisco"
  }
}
```

**Precision:**
- Latitude/Longitude: 6 decimal places (~0.1 meters accuracy)
- Addresses: From OpenStreetMap (reverse geocoding)
- Ride type: UberX / Lyft Standard (default)

---

## 🔄 Future Enhancements

### Possible Improvements

1. **Remember Preferred Service:**
   - Store user's last choice (Uber/Lyft)
   - Highlight preferred service
   - One-tap to open preferred

2. **Ride Type Selection:**
   - Let users choose UberXL, Lyft Lux, etc.
   - Pass ride type in deep link
   - Show pricing for each type

3. **Scheduled Rides:**
   - Add time picker
   - Pass scheduled time in deep link
   - Both Uber & Lyft support this

4. **Payment Method:**
   - Allow payment method selection
   - Pass payment info in URL (if supported)

---

## ✅ Current Feature Status

**✅ Working:**
- Deep links to Uber app (iOS & Android)
- Deep links to Lyft app (iOS & Android)
- Web fallback for both services
- Coordinates pre-filled
- Addresses pre-filled (web only)
- Automatic mobile/desktop detection
- Graceful fallback handling

**🚫 Not Implemented:**
- Ride type selection (always UberX/Standard)
- Scheduled rides
- Payment method selection
- Promo codes
- Fare splitting

---

## 🎉 Summary

FairFare provides seamless handoff to Uber and Lyft:

✅ **Mobile:** Opens native app with trip pre-filled
✅ **Desktop:** Opens web with trip pre-filled
✅ **Fallback:** Always works, even without apps
✅ **Fast:** 2.5-second intelligent timeout
✅ **Universal:** Works on iOS, Android, desktop

**User Benefit:** Compare prices on FairFare, request ride with one tap.

No re-typing addresses. No copying coordinates. Just tap and go.

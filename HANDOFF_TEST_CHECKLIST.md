# FairFare Handoff Self-Test Checklist

## Pre-Test Requirements

### Device Setup
- [ ] Physical Android device (not emulator)
- [ ] Android 8.0+ recommended
- [ ] FairFare app installed from Play Store (latest build with versionCode 7+)

### App Installation Status
For **full testing**, you need:
- [ ] **Uber app installed** — to test Uber deep link handoff
- [ ] **Lyft app installed** — to test Lyft deep link handoff

For **fallback testing**, intentionally uninstall one or both apps.

---

## Test Scenarios

### Test 1: Uber Handoff (App Installed)

**Preconditions:**
- Uber app IS installed on device
- FairFare app open

**Steps:**
1. Enter a pickup address (e.g., "123 Main St, Atlanta, GA")
2. Enter a destination address (e.g., "Hartsfield-Jackson Atlanta Airport")
3. Tap "Compare Fares"
4. Wait for results to load
5. Tap the Uber "Open Uber" button

**Expected Results:**
| Step | What Should Happen |
|------|-------------------|
| Immediately | Handoff modal appears with "Opening Uber..." message and spinner |
| Within 1-3 seconds | Uber app opens |
| Uber app state | Pickup and destination should be pre-populated with your addresses |
| FairFare state | Modal should auto-dismiss after successful handoff |

**Pass Criteria:**
- [ ] Handoff modal appeared (no blank screen)
- [ ] Uber app opened
- [ ] Pickup location was pre-filled
- [ ] Destination was pre-filled
- [ ] No crash occurred

---

### Test 2: Lyft Handoff (App Installed)

**Preconditions:**
- Lyft app IS installed on device
- FairFare app open

**Steps:**
1. Enter a pickup address
2. Enter a destination address  
3. Tap "Compare Fares"
4. Wait for results to load
5. Tap the Lyft "Open Lyft" button

**Expected Results:**
| Step | What Should Happen |
|------|-------------------|
| Immediately | Handoff modal appears with "Opening Lyft..." message and spinner |
| Within 1-3 seconds | Lyft app opens |
| Lyft app state | Pickup and destination should be pre-populated |
| FairFare state | Modal should auto-dismiss after successful handoff |

**Pass Criteria:**
- [ ] Handoff modal appeared (no blank screen)
- [ ] Lyft app opened
- [ ] Pickup location was pre-filled
- [ ] Destination was pre-filled
- [ ] No crash occurred

---

### Test 3: Browser Fallback (App NOT Installed)

**Preconditions:**
- Uninstall either Uber OR Lyft app (your choice)
- FairFare app open

**Steps:**
1. Enter pickup and destination addresses
2. Tap "Compare Fares"
3. Tap the button for the **uninstalled** provider

**Expected Results:**
| Step | What Should Happen |
|------|-------------------|
| Immediately | Handoff modal appears with "Opening [Provider]..." |
| Within 3 seconds | Modal shows: "[Provider] app may not be installed" message |
| Modal state | Two buttons appear: "Open [Provider] App" and "Open [Provider] Website" |
| Tap "Open Website" | Browser opens with provider's mobile website |
| Website state | Should show the ride request with addresses pre-filled |

**Pass Criteria:**
- [ ] Handoff modal appeared (no blank screen)
- [ ] Error message appeared (not stuck on spinner)
- [ ] "Open Website" button was visible
- [ ] Tapping "Open Website" opened the browser
- [ ] Provider website loaded successfully

---

### Test 4: Blank Screen Prevention

**Purpose:** Verify the app NEVER shows a blank screen during handoff.

**Steps:**
1. Complete a fare comparison
2. Rapidly tap a provider button multiple times
3. While modal is showing, press the device back button
4. While modal is showing, switch to another app and return

**Expected Results:**
| Scenario | What Should Happen |
|----------|-------------------|
| Rapid tapping | Only one modal opens; button becomes disabled |
| Back button | Modal closes, returns to results screen |
| App switch + return | Modal persists OR results screen is visible |

**Pass Criteria:**
- [ ] No blank/white screen at any point
- [ ] No app crash
- [ ] Always returned to a usable state

---

### Test 5: Back to FairFare Button

**Steps:**
1. Start a handoff (tap Uber or Lyft button)
2. When modal appears, tap "Back to FairFare" (X button or back link)

**Expected Results:**
- Modal closes immediately
- Results screen is fully visible
- Can tap another provider button

**Pass Criteria:**
- [ ] Modal dismissed cleanly
- [ ] Results still visible
- [ ] App remains responsive

---

## Deep Link URL Formats (Reference)

The backend generates these URLs:

**Uber Deep Link:**
```
uber://?action=setPickup&pickup[latitude]=33.749&pickup[longitude]=-84.388&dropoff[latitude]=33.636&dropoff[longitude]=-84.428
```

**Uber Web Fallback:**
```
https://m.uber.com/ul/?action=setPickup&pickup[latitude]=33.749&pickup[longitude]=-84.388&dropoff[latitude]=33.636&dropoff[longitude]=-84.428
```

**Lyft Deep Link:**
```
lyft://ridetype?id=lyft&pickup[latitude]=33.749&pickup[longitude]=-84.388&destination[latitude]=33.636&destination[longitude]=-84.428
```

**Lyft Web Fallback:**
```
https://ride.lyft.com/?pickup[latitude]=33.749&pickup[longitude]=-84.388&destination[latitude]=33.636&destination[longitude]=-84.428
```

---

## Known Limitations

### 1. Web Preview Does NOT Support Deep Links
- Testing in a browser (including the Emergent preview URL) will ALWAYS fail for deep links
- Browsers do not understand `uber://` or `lyft://` URL schemes
- This is expected behavior, not a bug
- **You MUST test on a native Android build**

### 2. Address Pre-fill Depends on Provider App
- The deep link passes coordinates and addresses
- How the Uber/Lyft app interprets them varies by app version
- If addresses don't appear exactly right, the coordinates are still correct

### 3. Timeout Behavior
- If the deep link doesn't trigger within 3 seconds, the modal shows a timeout message
- This does NOT mean failure — the app may have opened successfully
- The timeout is a safety mechanism to prevent infinite loading states

### 4. First-Time Permission Prompts
- Android may ask "Open with [App]?" the first time
- This is normal OS behavior
- After allowing once, subsequent handoffs should be instant

---

## Troubleshooting

### Handoff Opens App Store Instead of App
**Cause:** The provider app is not installed, OR the deep link scheme is not registered.
**Solution:** Verify the Uber/Lyft app is actually installed. Try opening the app manually first.

### Handoff Shows "Taking longer than expected"
**Cause:** The 3-second safety timeout triggered.
**Solution:** 
1. Tap "Open [Provider] App" to retry
2. If still fails, tap "Open [Provider] Website" for web fallback

### Handoff Modal Stuck on Spinner
**Cause:** Should not happen — there's a 3-second timeout failsafe.
**If it does happen:** Tap "Back to FairFare" and report the issue.

### Addresses Not Pre-filled in Provider App
**Cause:** Provider app's deep link handling varies.
**Note:** Coordinates are always passed. The provider app should show the correct route even if address text differs.

---

## Test Results Template

Copy and fill out after testing:

```
Device: ________________
Android Version: ________________
FairFare Version: ________________
Uber App Installed: Yes / No
Lyft App Installed: Yes / No

Test 1 (Uber Handoff): PASS / FAIL
  - Notes: 

Test 2 (Lyft Handoff): PASS / FAIL
  - Notes:

Test 3 (Browser Fallback): PASS / FAIL
  - Notes:

Test 4 (Blank Screen Prevention): PASS / FAIL
  - Notes:

Test 5 (Back to FairFare): PASS / FAIL
  - Notes:

Overall Result: READY FOR TESTERS / NEEDS FIXES
```

---

## Summary: What Makes a Successful Handoff

1. **Modal ALWAYS appears first** — prevents blank screens
2. **Deep link attempt made** — `uber://` or `lyft://` URL opened via native API
3. **Success path:** Provider app opens with ride pre-populated
4. **Failure path:** Timeout message + "Open Website" fallback button
5. **User always has control** — can close modal and return to results

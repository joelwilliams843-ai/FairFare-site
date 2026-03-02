# FairFare Android Production Build

## Build Status
The cloud environment runs on ARM64 architecture, but Android's AAPT2 tool only supports x86_64.

## Complete Package for Remote Build

### Option 1: GitHub Actions (Recommended)

1. Push this repository to GitHub
2. Add these repository secrets:
   - `KEYSTORE_BASE64`: (see below)
   - `KEYSTORE_PASSWORD`: `AW0qs26Y4PqlXD4svLCNYUlO`

3. Go to Actions → "Build Android AAB" → "Run workflow"

**KEYSTORE_BASE64** (copy entire block):
```
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
```

### Option 2: Download Project & Build Locally

Download this project and run:
```bash
cd frontend
yarn install
yarn build
npx cap sync android
cd android
./gradlew bundleRelease
```

### Keystore Details

| Property | Value |
|----------|-------|
| File | `fairfare-upload.keystore` |
| Alias | `fairfare-upload` |
| Password | `AW0qs26Y4PqlXD4svLCNYUlO` |
| Validity | 10,000 days |
| Algorithm | RSA 2048-bit |

### Certificate Fingerprints
```
SHA-1:   DA:32:41:94:94:2D:89:0B:A3:C7:F2:42:19:63:D6:AC:9A:91:1F:15
SHA-256: DB:71:AF:01:6C:2E:0B:55:BF:C1:88:AB:53:32:3D:A3:91:CF:4F:B6:69:18:6A:15:5A:EF:6B:0E:1A:17:D2:E5
```

### Play App Signing
If you enable Play App Signing:
1. Google will manage the app signing key
2. Use the upload keystore above to sign uploads
3. The SHA-256 above is your upload certificate fingerprint

### Build Configuration
- Package: `com.fairfare.app`
- Version Name: `1.0`
- Version Code: `1`
- Min SDK: 22 (Android 5.1)
- Target SDK: 34 (Android 14)
- Signed: Yes (release build)

### AAB Output Location
After build: `frontend/android/app/build/outputs/bundle/release/app-release.aab`

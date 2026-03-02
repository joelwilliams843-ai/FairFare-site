# Uber & Lyft API Application Guide

## Quick Start Checklist

### Uber API Application
- [ ] Create developer account at https://developer.uber.com
- [ ] Register FairFare app
- [ ] Apply for production access
- [ ] Provide required documentation
- [ ] Receive and configure API keys

### Lyft API Application  
- [ ] Create developer account at https://developer.lyft.com
- [ ] Register FairFare app
- [ ] Apply for production access
- [ ] Submit business justification
- [ ] Receive and configure API keys

---

## Uber API Application

### Step 1: Create Developer Account

1. **Visit:** https://developer.uber.com
2. **Click:** "Get Started" or "Register"
3. **Sign Up:**
   - Use business email (not personal Gmail)
   - Verify email address
   - Complete profile

### Step 2: Create Application

1. **Dashboard:** https://developer.uber.com/dashboard
2. **Click:** "Create App"
3. **App Details:**
   ```
   App Name: FairFare
   Description: Real-time ride price comparison assistant
   App Type: Ride Requests
   Redirect URI: https://www.tryfairfareapp.com/auth/callback
   Privacy Policy URL: https://www.tryfairfareapp.com/privacy
   Terms of Service URL: https://www.tryfairfareapp.com/terms
   ```

### Step 3: Sandbox Access (Immediate)

**You'll receive:**
- Client ID
- Client Secret
- Server Token

**Sandbox Limitations:**
- Test data only
- Limited to specific locations
- Not for production use

**Test Coordinates:**
```
San Francisco: 37.7749, -122.4194
Los Angeles: 34.0522, -118.2437
New York: 40.7128, -74.0060
```

### Step 4: Production Access Application

**Requirements:**

1. **Working OAuth Implementation**
   - Implement 3-legged OAuth flow
   - Handle token refresh
   - Secure token storage

2. **Privacy Policy**
   - How you collect data
   - What data you store
   - How you use Uber data
   - User rights and controls
   - Data retention policy

3. **Terms of Service**
   - User agreement
   - Service limitations
   - Liability terms

4. **App Screenshots**
   - Homepage with search
   - Results comparison screen
   - Uber deep link flow
   - Mobile screenshots required

5. **Use Case Description**
   ```
   FairFare is a ride comparison assistant that helps users make 
   informed decisions by comparing real-time pricing and wait times 
   between ride services. Users can see Uber pricing alongside 
   alternatives, then seamlessly launch the Uber app to complete 
   their booking. We do not process payments or facilitate rides - 
   we only display pricing information and redirect to Uber's app.
   ```

6. **Business Information**
   - Company name
   - Business address
   - Contact information
   - Website URL

### Step 5: Submit for Review

1. **Go to:** Dashboard → Your App → "Request Production Access"
2. **Fill out form:**
   - Upload screenshots
   - Provide URLs
   - Describe use case
   - Accept terms
3. **Submit**

**Review Timeline:** 1-2 weeks

### Step 6: Production Credentials

**After approval, you'll receive:**
- Production Client ID
- Production Client Secret
- Production Server Token

**Configure in `.env`:**
```bash
UBER_CLIENT_ID=your_production_client_id
UBER_CLIENT_SECRET=your_production_client_secret
UBER_SERVER_TOKEN=your_production_server_token
```

---

## Uber API Details

### Endpoints You'll Use:

**1. Price Estimates**
```
GET https://api.uber.com/v1.2/estimates/price
```

**Parameters:**
- `start_latitude`: Pickup lat
- `start_longitude`: Pickup lng  
- `end_latitude`: Destination lat
- `end_longitude`: Destination lng

**Response:**
```json
{
  "prices": [
    {
      "product_id": "a1111c8c-c720-46c3-8534-2fcdd730040d",
      "localized_display_name": "UberX",
      "low_estimate": 15.0,
      "high_estimate": 22.0,
      "currency_code": "USD",
      "estimate": "15-22",
      "surge_multiplier": 1.0
    }
  ]
}
```

**2. Time Estimates**
```
GET https://api.uber.com/v1.2/estimates/time
```

**Response:**
```json
{
  "times": [
    {
      "product_id": "a1111c8c-c720-46c3-8534-2fcdd730040d",
      "localized_display_name": "UberX",
      "estimate": 120
    }
  ]
}
```

### Rate Limits:
- **Free Tier:** 2,000 requests/hour
- **Paid Tier:** Contact sales for higher limits

### Documentation:
- **API Reference:** https://developer.uber.com/docs/riders/references/api/v1.2/estimates-price-get
- **OAuth Guide:** https://developer.uber.com/docs/riders/guides/authentication

---

## Lyft API Application

### Step 1: Create Developer Account

1. **Visit:** https://developer.lyft.com
2. **Click:** "Get Started"
3. **Sign Up:**
   - Business email recommended
   - Verify email
   - Complete profile

### Step 2: Create Application

1. **Dashboard:** https://developer.lyft.com/dashboard
2. **Click:** "Create App"
3. **App Details:**
   ```
   App Name: FairFare
   Description: Intelligent ride comparison and booking assistant
   Redirect URI: https://www.tryfairfareapp.com/auth/callback
   Privacy Policy: https://www.tryfairfareapp.com/privacy
   Terms of Service: https://www.tryfairfareapp.com/terms
   ```

### Step 3: Sandbox Access (Immediate)

**You'll receive:**
- Client ID
- Client Secret

**Test with sandbox mode:**
```bash
LYFT_SANDBOX_MODE=true
```

### Step 4: Production Access Application

**Requirements:**

1. **OAuth Implementation**
   - Working authentication flow
   - Token management
   - Secure credential storage

2. **Privacy Policy**
   - Data collection practices
   - Lyft data usage
   - User privacy rights
   - Compliance with regulations

3. **Terms of Service**
   - Service agreement
   - Limitations
   - User responsibilities

4. **Business Justification**
   ```
   FairFare provides users with transparent, real-time ride pricing 
   comparisons to make informed travel decisions. By displaying Lyft 
   pricing alongside competitors, we help users find the best value 
   and seamlessly redirect them to the Lyft app to complete bookings. 
   FairFare does not handle payments, store user payment information, 
   or facilitate rides directly.
   ```

5. **App Branding**
   - Logo (256x256 PNG)
   - Screenshots (mobile & desktop)
   - Color scheme
   - App icon

6. **Contact Information**
   - Company details
   - Technical contact
   - Support email

### Step 5: Submit for Review

1. **Dashboard → Settings → Production Access**
2. **Submit application with:**
   - All required documentation
   - Screenshots
   - Business details
3. **Wait for review**

**Review Timeline:** 2-3 weeks

### Step 6: Production Credentials

**After approval:**
```bash
LYFT_CLIENT_ID=your_production_client_id
LYFT_CLIENT_SECRET=your_production_client_secret
```

---

## Lyft API Details

### Endpoints You'll Use:

**1. Cost Estimates**
```
GET https://api.lyft.com/v1/cost
```

**Parameters:**
- `start_lat`: Pickup latitude
- `start_lng`: Pickup longitude
- `end_lat`: Destination latitude
- `end_lng`: Destination longitude

**Response:**
```json
{
  "cost_estimates": [
    {
      "ride_type": "lyft",
      "display_name": "Lyft",
      "estimated_cost_cents_min": 1500,
      "estimated_cost_cents_max": 2200,
      "currency": "USD",
      "primetime_percentage": "0%"
    }
  ]
}
```

**2. ETA Estimates**
```
GET https://api.lyft.com/v1/eta
```

**Response:**
```json
{
  "eta_estimates": [
    {
      "ride_type": "lyft",
      "display_name": "Lyft",
      "eta_seconds": 180
    }
  ]
}
```

### Rate Limits:
- **Free Tier:** 300 requests/minute
- **Production:** Higher limits available

### Documentation:
- **API Reference:** https://developer.lyft.com/reference/cost-estimates
- **OAuth Guide:** https://developer.lyft.com/docs/authentication

---

## Required Legal Documents

### Privacy Policy (Minimum Requirements)

**Must include:**
1. What data you collect (locations, search history)
2. How you use data (comparison, analytics)
3. Third-party sharing (Uber, Lyft)
4. User rights (access, deletion)
5. Data retention (how long you keep data)
6. Security measures
7. Contact information

**Template:** https://www.termsfeed.com/privacy-policy-generator/

### Terms of Service (Minimum Requirements)

**Must include:**
1. Service description
2. User responsibilities
3. Prohibited uses
4. Intellectual property
5. Liability limitations
6. Dispute resolution
7. Termination clauses

**Template:** https://www.termsfeed.com/terms-service-generator/

---

## Testing Before Production

### Sandbox Testing Checklist:

- [ ] Test OAuth authentication flow
- [ ] Fetch price estimates for multiple locations
- [ ] Handle API errors gracefully
- [ ] Test rate limiting
- [ ] Verify data normalization
- [ ] Test with invalid coordinates
- [ ] Simulate network failures
- [ ] Test token expiration/refresh

### Sample Test Script:
```python
import asyncio
from services.uber_service import UberService
from services.lyft_service import LyftService

async def test_apis():
    # Initialize with sandbox credentials
    uber = UberService(
        client_id=os.getenv('UBER_CLIENT_ID'),
        client_secret=os.getenv('UBER_CLIENT_SECRET')
    )
    
    lyft = LyftService(
        client_id=os.getenv('LYFT_CLIENT_ID'),
        client_secret=os.getenv('LYFT_CLIENT_SECRET')
    )
    
    # Test SF Airport to Downtown
    results = await asyncio.gather(
        uber.get_price_estimate(37.6213, -122.3790, 37.7879, -122.4075),
        lyft.get_price_estimate(37.6213, -122.3790, 37.7879, -122.4075)
    )
    
    print("Uber:", results[0])
    print("Lyft:", results[1])

asyncio.run(test_apis())
```

---

## Common Rejection Reasons

### Uber:
1. ❌ Incomplete OAuth implementation
2. ❌ Missing or inadequate privacy policy
3. ❌ No clear use case description
4. ❌ Insufficient app screenshots
5. ❌ Terms of service too generic

### Lyft:
1. ❌ Weak business justification
2. ❌ Privacy policy doesn't address Lyft data
3. ❌ Missing branding assets
4. ❌ Unclear value proposition
5. ❌ No working OAuth flow

**Solution:** Address all requirements thoroughly before submitting.

---

## Timeline & Cost

### Application Timeline:
```
Week 1: Create accounts, register apps
Week 2: Implement OAuth, test sandbox
Week 3: Submit production applications
Week 4-5: Wait for approval
Week 6: Receive credentials, deploy
```

### Costs:
- **Application Fee:** Free
- **API Usage:** Free (within limits)
- **Development Time:** ~20-40 hours
- **Maintenance:** ~2-4 hours/month

---

## After Approval

### Immediate Actions:
1. ✅ Add production credentials to `.env`
2. ✅ Update backend to use real APIs
3. ✅ Deploy with feature flag enabled
4. ✅ Monitor API usage
5. ✅ Set up error alerts
6. ✅ Track costs

### Update FairFare UI:
- Add "Live Prices" badge
- Show last update timestamp
- Indicate when using cached data
- Display API status

---

## Support & Resources

### Uber:
- **Developer Forums:** https://developer.uber.com/community
- **Support Email:** developer-support@uber.com
- **Status Page:** https://status.uber.com

### Lyft:
- **Developer Forums:** https://developer.lyft.com/discuss
- **Support Email:** api-support@lyft.com
- **Documentation:** https://developer.lyft.com/docs

---

## Next Steps

1. **Start Applications:**
   - [ ] Register on Uber developer platform
   - [ ] Register on Lyft developer platform

2. **Prepare Documentation:**
   - [ ] Write privacy policy
   - [ ] Write terms of service
   - [ ] Take app screenshots
   - [ ] Prepare use case description

3. **Development:**
   - [ ] Implement OAuth flow
   - [ ] Build service layer (already architected)
   - [ ] Test with sandbox APIs

4. **Submit:**
   - [ ] Uber production access request
   - [ ] Lyft production access request

5. **Deploy:**
   - [ ] Configure production credentials
   - [ ] Enable feature flag
   - [ ] Monitor and optimize

**Good luck with your applications! 🚀**

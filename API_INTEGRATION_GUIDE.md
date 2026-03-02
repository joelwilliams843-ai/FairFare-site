# FairFare API Integration Architecture

## Overview

This document outlines the architecture for integrating real Uber and Lyft APIs into FairFare, transitioning from mock data to live ride pricing.

---

## Current Architecture (Mock Data)

### Backend (`/app/backend/server.py`)
```python
# Current mock implementation
def generate_ride_estimates(distance_miles, pickup, destination):
    # Calculates mock prices based on distance
    # Random variance to simulate live pricing
    # Returns RideEstimate objects
```

**Limitations:**
- Not real-time data
- No actual Uber/Lyft pricing
- Cannot reflect surge pricing accurately
- No real wait times

---

## Target Architecture (Real API Integration)

### 1. Backend API Layer

#### New Structure:
```
/app/backend/
├── server.py              # Main FastAPI routes
├── config.py              # Configuration management
├── services/
│   ├── __init__.py
│   ├── uber_service.py    # Uber API integration
│   ├── lyft_service.py    # Lyft API integration
│   └── base_service.py    # Shared API utilities
├── models/
│   ├── __init__.py
│   └── ride.py            # Pydantic models
└── utils/
    ├── __init__.py
    └── encryption.py      # API key encryption
```

#### Key Components:

**A. Configuration Management (`config.py`)**
```python
from pydantic import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Uber API
    uber_client_id: Optional[str] = None
    uber_client_secret: Optional[str] = None
    uber_server_token: Optional[str] = None
    
    # Lyft API
    lyft_client_id: Optional[str] = None
    lyft_client_secret: Optional[str] = None
    
    # MongoDB for caching
    mongo_url: str
    db_name: str
    
    # Feature flags
    use_mock_data: bool = True  # Toggle for testing
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

**B. Base Service (`services/base_service.py`)**
```python
import httpx
from abc import ABC, abstractmethod
from typing import Dict, Any

class RideService(ABC):
    """Base class for ride service integrations"""
    
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.token_expiry = None
    
    @abstractmethod
    async def get_price_estimate(self, start_lat, start_lng, end_lat, end_lng):
        """Get price estimate for a ride"""
        pass
    
    @abstractmethod
    async def get_time_estimate(self, start_lat, start_lng):
        """Get pickup time estimate"""
        pass
    
    async def authenticate(self):
        """OAuth authentication"""
        pass
```

**C. Uber Service (`services/uber_service.py`)**
```python
import httpx
from .base_service import RideService

class UberService(RideService):
    BASE_URL = "https://api.uber.com/v1.2"
    
    async def get_price_estimate(self, start_lat, start_lng, end_lat, end_lng):
        """
        Uber Price Estimates API
        Endpoint: /estimates/price
        """
        headers = {
            "Authorization": f"Token {self.access_token}",
            "Accept-Language": "en_US",
            "Content-Type": "application/json"
        }
        
        params = {
            "start_latitude": start_lat,
            "start_longitude": start_lng,
            "end_latitude": end_lat,
            "end_longitude": end_lng
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/estimates/price",
                headers=headers,
                params=params
            )
            return response.json()
    
    async def get_time_estimate(self, start_lat, start_lng):
        """
        Uber Time Estimates API
        Endpoint: /estimates/time
        """
        # Similar implementation
        pass
    
    def normalize_response(self, raw_data):
        """Convert Uber API response to FairFare format"""
        return {
            "provider": "Uber",
            "ride_type": raw_data.get("localized_display_name", "UberX"),
            "price_min": raw_data.get("low_estimate"),
            "price_max": raw_data.get("high_estimate"),
            "wait_time": raw_data.get("estimate", 0) // 60,  # seconds to minutes
            "currency": raw_data.get("currency_code", "USD"),
            "surge_multiplier": raw_data.get("surge_multiplier", 1.0)
        }
```

**D. Lyft Service (`services/lyft_service.py`)**
```python
class LyftService(RideService):
    BASE_URL = "https://api.lyft.com/v1"
    
    async def get_price_estimate(self, start_lat, start_lng, end_lat, end_lng):
        """
        Lyft Cost Estimates API
        Endpoint: /cost
        """
        # Similar to Uber implementation
        pass
    
    def normalize_response(self, raw_data):
        """Convert Lyft API response to FairFare format"""
        # Normalize Lyft response format
        pass
```

**E. Updated Server Route (`server.py`)**
```python
from fastapi import FastAPI, HTTPException
from services.uber_service import UberService
from services.lyft_service import LyftService
from config import settings

@api_router.post("/compare-rides", response_model=CompareResponse)
async def compare_rides(request: CompareRequest):
    """Compare ride estimates with real API data"""
    
    if settings.use_mock_data:
        # Fallback to mock data
        return generate_mock_estimates(request)
    
    try:
        # Initialize services
        uber = UberService(
            settings.uber_client_id,
            settings.uber_client_secret
        )
        lyft = LyftService(
            settings.lyft_client_id,
            settings.lyft_client_secret
        )
        
        # Fetch real data in parallel
        uber_data, lyft_data = await asyncio.gather(
            uber.get_price_estimate(
                request.pickup.lat, request.pickup.lng,
                request.destination.lat, request.destination.lng
            ),
            lyft.get_price_estimate(
                request.pickup.lat, request.pickup.lng,
                request.destination.lat, request.destination.lng
            )
        )
        
        # Normalize responses
        estimates = [
            uber.normalize_response(uber_data),
            lyft.normalize_response(lyft_data)
        ]
        
        return CompareResponse(
            estimates=estimates,
            distance_miles=calculate_distance(...),
            timestamp=datetime.now(timezone.utc)
        )
        
    except Exception as e:
        # Log error and fallback to mock
        logger.error(f"API error: {e}")
        return generate_mock_estimates(request)
```

---

## 2. Secure API Key Storage

### Environment Variables (`.env`)
```bash
# Never commit to git
# Add to .gitignore

# Uber API Credentials
UBER_CLIENT_ID=your_uber_client_id
UBER_CLIENT_SECRET=your_uber_client_secret
UBER_SERVER_TOKEN=your_uber_server_token

# Lyft API Credentials
LYFT_CLIENT_ID=your_lyft_client_id
LYFT_CLIENT_SECRET=your_lyft_client_secret

# Feature Flags
USE_MOCK_DATA=false  # Set to true for development
```

### Production Secret Management

**For Emergent Deployment:**
1. Use Emergent's secret management
2. Never hardcode keys in code
3. Access via environment variables
4. Rotate keys periodically

**Best Practices:**
- Use different keys for dev/staging/prod
- Implement rate limiting
- Monitor API usage
- Set up alerts for quota limits

---

## 3. Normalized Response Format

### Standard Response Model
```python
class RideEstimate(BaseModel):
    provider: str                    # "Uber" or "Lyft"
    ride_type: str                   # "UberX", "Standard", etc.
    price_min: float                 # Low estimate in USD
    price_max: float                 # High estimate in USD
    wait_time: int                   # Pickup ETA in minutes
    currency: str = "USD"            # Currency code
    surge_multiplier: float = 1.0    # Surge pricing (1.0 = no surge)
    deep_link: str                   # App deep link
    web_link: str                    # Web fallback
    
class CompareResponse(BaseModel):
    estimates: List[RideEstimate]
    distance_miles: float
    timestamp: datetime              # When data was fetched
    fairfare_pick: Optional[str]     # Recommended option
```

---

## 4. API Application Process

### Uber API Access

#### Step 1: Register Application
1. Go to: https://developer.uber.com
2. Sign up for developer account
3. Create new app: "FairFare"
4. Set redirect URI: `https://www.tryfairfareapp.com/auth/callback`

#### Step 2: Request Production Access
**Requirements:**
- Completed app with working OAuth
- Privacy policy URL
- Terms of service URL
- App description and screenshots
- Use case explanation

**Approval Timeline:**
- Sandbox: Immediate
- Production: 1-2 weeks review

#### Credentials Needed:
- Client ID
- Client Secret
- Server Token (for price estimates)

**API Endpoints:**
- Price Estimates: `/v1.2/estimates/price`
- Time Estimates: `/v1.2/estimates/time`
- Rate Limit: 2000 requests/hour

**Documentation:**
https://developer.uber.com/docs/riders/ride-requests/tutorials/api/introduction

---

### Lyft API Access

#### Step 1: Register Application
1. Go to: https://developer.lyft.com
2. Create developer account
3. Create new app: "FairFare"
4. Set redirect URI: `https://www.tryfairfareapp.com/auth/callback`

#### Step 2: Request Production Access
**Requirements:**
- Working OAuth implementation
- Privacy policy
- Terms of service
- App branding assets
- Business justification

**Approval Timeline:**
- Sandbox: Immediate
- Production: 2-3 weeks review

#### Credentials Needed:
- Client ID
- Client Secret

**API Endpoints:**
- Cost Estimates: `/v1/cost`
- ETA Estimates: `/v1/eta`
- Rate Limit: 300 requests/minute

**Documentation:**
https://developer.lyft.com/docs/ride-cost-estimates

---

## 5. Caching Strategy

### Why Cache?
- Reduce API costs
- Improve response times
- Handle rate limits
- Provide fallback data

### Implementation:
```python
import redis
from datetime import timedelta

class CacheService:
    def __init__(self):
        self.redis = redis.Redis(host='localhost', port=6379)
        self.ttl = 60  # Cache for 60 seconds
    
    def get_cached_estimate(self, pickup, destination):
        key = f"estimate:{pickup}:{destination}"
        cached = self.redis.get(key)
        if cached:
            return json.loads(cached)
        return None
    
    def cache_estimate(self, pickup, destination, data):
        key = f"estimate:{pickup}:{destination}"
        self.redis.setex(
            key,
            timedelta(seconds=self.ttl),
            json.dumps(data)
        )
```

**Cache Strategy:**
- TTL: 60 seconds for price estimates
- TTL: 30 seconds for ETA estimates
- Invalidate on user refresh
- Store in MongoDB for analytics

---

## 6. Error Handling & Fallbacks

### Graceful Degradation:
```python
async def get_estimates_with_fallback(request):
    try:
        # Try real API
        return await fetch_real_estimates(request)
    except RateLimitError:
        # Return cached data
        cached = get_cached_estimate(request)
        if cached:
            return cached
        # Fallback to mock
        return generate_mock_estimates(request)
    except APIError as e:
        logger.error(f"API Error: {e}")
        return generate_mock_estimates(request)
```

### User Communication:
- Show "Live Prices" badge when using real API
- Show "Estimated Prices" when using mock/cache
- Display last update timestamp
- Allow manual refresh

---

## 7. Monitoring & Analytics

### Track:
- API success rate
- Response times
- Error rates
- Cost per request
- Popular routes
- Peak usage times

### Implementation:
```python
from prometheus_client import Counter, Histogram

api_requests = Counter('api_requests_total', 'Total API requests', ['provider', 'status'])
api_duration = Histogram('api_duration_seconds', 'API request duration', ['provider'])

async def fetch_with_monitoring(service, *args):
    start_time = time.time()
    try:
        result = await service.get_price_estimate(*args)
        api_requests.labels(provider=service.name, status='success').inc()
        return result
    except Exception as e:
        api_requests.labels(provider=service.name, status='error').inc()
        raise
    finally:
        duration = time.time() - start_time
        api_duration.labels(provider=service.name).observe(duration)
```

---

## 8. Testing Strategy

### Unit Tests:
```python
@pytest.mark.asyncio
async def test_uber_price_estimate():
    service = UberService(mock_id, mock_secret)
    result = await service.get_price_estimate(37.7749, -122.4194, 37.8044, -122.2712)
    assert result['provider'] == 'Uber'
    assert 'price_min' in result
```

### Integration Tests:
- Test with sandbox APIs
- Mock API responses
- Test error scenarios
- Test rate limiting

### E2E Tests:
- Full flow with real coordinates
- Compare mock vs real data
- Verify deep links
- Test caching

---

## 9. Migration Plan

### Phase 1: Preparation (Week 1)
- [ ] Apply for Uber API access
- [ ] Apply for Lyft API access
- [ ] Set up backend architecture
- [ ] Implement services layer
- [ ] Add environment variable management

### Phase 2: Sandbox Testing (Week 2-3)
- [ ] Receive sandbox credentials
- [ ] Implement OAuth flow
- [ ] Test API integrations
- [ ] Add error handling
- [ ] Implement caching

### Phase 3: Production Approval (Week 3-4)
- [ ] Submit production access requests
- [ ] Provide required documentation
- [ ] Complete security review
- [ ] Receive production credentials

### Phase 4: Deployment (Week 5)
- [ ] Deploy with feature flag (USE_MOCK_DATA=true)
- [ ] Test with production APIs
- [ ] Monitor error rates
- [ ] Gradually enable real API (10% → 50% → 100%)
- [ ] Update frontend to show "Live Prices"

### Phase 5: Monitoring (Ongoing)
- [ ] Track API costs
- [ ] Monitor success rates
- [ ] Optimize caching
- [ ] Add more ride types
- [ ] Expand to more cities

---

## 10. Cost Estimation

### Uber API Pricing:
- Price Estimates: $0.00 (free tier)
- Rate limit: 2000 requests/hour
- Overage: Contact sales

### Lyft API Pricing:
- Cost Estimates: $0.00 (free tier)
- Rate limit: 300 requests/minute
- Overage: Throttled

### Estimated Monthly Costs:
- **1,000 users:** ~$0 (within free tier)
- **10,000 users:** ~$0-50 (depending on usage)
- **100,000 users:** Need enterprise pricing

### Optimization:
- Cache aggressively (60s TTL)
- Batch requests when possible
- Use webhooks for updates
- Monitor and alert on quotas

---

## Summary

**Current State:** Mock data generation
**Target State:** Real-time API integration
**Timeline:** 4-5 weeks for full integration
**Cost:** $0-50/month for initial scale
**Complexity:** Moderate (OAuth, API management, caching)

**Next Steps:**
1. Apply for Uber & Lyft developer access
2. Implement backend services layer
3. Add secure credential management
4. Test with sandbox APIs
5. Deploy with feature flags
6. Monitor and optimize

**Ready for production with real APIs after approval!**

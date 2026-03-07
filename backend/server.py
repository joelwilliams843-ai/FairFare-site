from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import math
import random
import httpx


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Google Places API key
GOOGLE_PLACES_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY', '')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class Location(BaseModel):
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None

class CompareRequest(BaseModel):
    pickup: Location
    destination: Location

class RideEstimate(BaseModel):
    provider: str
    ride_type: str
    eta_minutes: int  # Pickup time estimate
    price_level: str  # "Cheap", "Moderate", "Busy"
    surge_likelihood: str  # "Low", "Moderate", "High"
    availability: str  # "Good", "Limited", "Busy"
    deep_link: str
    web_link: str

class CompareResponse(BaseModel):
    estimates: List[RideEstimate]
    distance_miles: float
    duration_minutes: int
    pickup_coords: dict
    destination_coords: dict
    route_status: str  # "valid", "long_trip", "too_short"
    decision_hint: str  # Contextual situation info
    recommendation: str  # Actionable advice for the user
    requires_confirmation: bool = False  # True if user should confirm long trip


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in miles using Haversine formula"""
    
    # Validate coordinates
    if not (-90 <= lat1 <= 90) or not (-90 <= lat2 <= 90):
        raise ValueError(f"Invalid latitude: pickup={lat1}, destination={lat2}")
    if not (-180 <= lng1 <= 180) or not (-180 <= lng2 <= 180):
        raise ValueError(f"Invalid longitude: pickup={lng1}, destination={lng2}")
    
    R = 3959  # Earth's radius in miles
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    
    distance = R * c
    
    # Log the calculation
    logging.info(f"Distance calculation: ({lat1}, {lng1}) to ({lat2}, {lng2}) = {distance:.2f} miles")
    
    return distance


def estimate_duration(distance_miles: float) -> int:
    """Estimate trip duration in minutes based on distance"""
    # Assume average speed of 25 mph in city, 45 mph for longer trips
    if distance_miles < 10:
        avg_speed = 25  # City driving
    elif distance_miles < 50:
        avg_speed = 35  # Mix of city and highway
    else:
        avg_speed = 45  # Mostly highway
    
    duration_hours = distance_miles / avg_speed
    duration_minutes = int(duration_hours * 60)
    
    return max(duration_minutes, 5)  # Minimum 5 minutes


def get_time_context():
    """Get current time context for decision making"""
    now = datetime.now(timezone.utc)
    hour = now.hour
    weekday = now.weekday()  # 0=Monday, 6=Sunday
    
    is_weekend = weekday >= 5
    is_rush_hour = (7 <= hour <= 9) or (17 <= hour <= 19)
    is_late_night = hour >= 22 or hour <= 5
    is_midday = 10 <= hour <= 16
    
    return {
        "is_weekend": is_weekend,
        "is_rush_hour": is_rush_hour,
        "is_late_night": is_late_night,
        "is_midday": is_midday,
        "hour": hour,
        "weekday": weekday
    }


def generate_decision_estimates(distance_miles: float, pickup: Location, destination: Location) -> tuple[List[RideEstimate], str, str]:
    """Generate decision-based ride estimates - Mobility Decision Assistant"""
    
    time_ctx = get_time_context()
    
    # Traveler-friendly demand levels
    # Good time to ride | Normal demand | Busy — expect delays | High demand — consider waiting
    if time_ctx["is_rush_hour"]:
        uber_price_level = "High demand — consider waiting"
        lyft_price_level = "High demand — consider waiting"
        uber_surge = "High"
        lyft_surge = "High"
        uber_availability = "Limited"
        lyft_availability = "Limited"
        decision_hint = "Rush hour traffic ahead. Rides may take longer to arrive."
        recommendation = "Tip: Waiting 20–30 minutes may reduce wait times and surge likelihood."
    elif time_ctx["is_late_night"]:
        uber_price_level = "Normal demand"
        lyft_price_level = "Normal demand"
        uber_surge = "Moderate"
        lyft_surge = "Low"
        uber_availability = "Limited"
        lyft_availability = "Limited"
        decision_hint = "Late night — fewer drivers available."
        recommendation = "Recommended: Book now. Driver availability decreases after midnight."
    elif time_ctx["is_weekend"] and not time_ctx["is_midday"]:
        uber_price_level = "Busy — expect delays"
        lyft_price_level = "Normal demand"
        uber_surge = "Moderate"
        lyft_surge = "Moderate"
        uber_availability = "Good"
        lyft_availability = "Good"
        decision_hint = "Weekend evening — moderate activity."
        recommendation = "Recommended: Book within 5 minutes for fastest pickup."
    else:
        uber_price_level = "Good time to ride"
        lyft_price_level = "Good time to ride"
        uber_surge = "Low"
        lyft_surge = "Low"
        uber_availability = "Good"
        lyft_availability = "Good"
        decision_hint = "Low traffic period — drivers readily available."
        recommendation = "Recommended: Book now for standard rates and quick pickup."
    
    # Adjust for longer distances
    if distance_miles > 20:
        decision_hint += " Longer trip — consider comfort options."
    
    # Wait times based on availability
    if uber_availability == "Good":
        uber_wait = random.randint(2, 6)
    elif uber_availability == "Limited":
        uber_wait = random.randint(6, 12)
    else:
        uber_wait = random.randint(10, 18)
    
    if lyft_availability == "Good":
        lyft_wait = random.randint(2, 6)
    elif lyft_availability == "Limited":
        lyft_wait = random.randint(6, 12)
    else:
        lyft_wait = random.randint(10, 18)
    
    # Create deep links with coordinates
    pickup_lat = pickup.lat or 0
    pickup_lng = pickup.lng or 0
    dest_lat = destination.lat or 0
    dest_lng = destination.lng or 0
    
    from urllib.parse import quote
    pickup_address = quote(pickup.address)
    dest_address = quote(destination.address)
    
    # Uber deep link format
    uber_deeplink = f"uber://?action=setPickup&pickup[latitude]={pickup_lat}&pickup[longitude]={pickup_lng}&dropoff[latitude]={dest_lat}&dropoff[longitude]={dest_lng}"
    uber_web = f"https://m.uber.com/ul/?action=setPickup&pickup[latitude]={pickup_lat}&pickup[longitude]={pickup_lng}&pickup[formatted_address]={pickup_address}&dropoff[latitude]={dest_lat}&dropoff[longitude]={dest_lng}&dropoff[formatted_address]={dest_address}"
    
    # Lyft deep link format
    lyft_deeplink = f"lyft://ridetype?id=lyft&pickup[latitude]={pickup_lat}&pickup[longitude]={pickup_lng}&destination[latitude]={dest_lat}&destination[longitude]={dest_lng}"
    lyft_web = f"https://ride.lyft.com/?pickup[latitude]={pickup_lat}&pickup[longitude]={pickup_lng}&destination[latitude]={dest_lat}&destination[longitude]={dest_lng}"
    
    estimates = [
        RideEstimate(
            provider="Uber",
            ride_type="UberX",
            eta_minutes=uber_wait,
            price_level=uber_price_level,
            surge_likelihood=uber_surge,
            availability=uber_availability,
            deep_link=uber_deeplink,
            web_link=uber_web
        ),
        RideEstimate(
            provider="Lyft",
            ride_type="Standard",
            eta_minutes=lyft_wait,
            price_level=lyft_price_level,
            surge_likelihood=lyft_surge,
            availability=lyft_availability,
            deep_link=lyft_deeplink,
            web_link=lyft_web
        )
    ]
    
    return estimates, decision_hint, recommendation


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "FairFare API"}

@api_router.post("/compare-rides", response_model=CompareResponse)
async def compare_rides(request: CompareRequest):
    """Compare ride estimates between Uber and Lyft - Decision Engine"""
    
    # Validate that we have coordinates
    if not request.pickup.lat or not request.pickup.lng:
        logging.warning(f"Missing pickup coordinates for: {request.pickup.address}")
        raise HTTPException(
            status_code=400,
            detail=f"Could not determine coordinates for pickup location: {request.pickup.address}"
        )
    
    if not request.destination.lat or not request.destination.lng:
        logging.warning(f"Missing destination coordinates for: {request.destination.address}")
        raise HTTPException(
            status_code=400,
            detail=f"Could not determine coordinates for destination: {request.destination.address}"
        )
    
    pickup_lat = request.pickup.lat
    pickup_lng = request.pickup.lng
    dest_lat = request.destination.lat
    dest_lng = request.destination.lng
    
    # Log the request
    logging.info(f"Compare request: {request.pickup.address} ({pickup_lat}, {pickup_lng}) -> {request.destination.address} ({dest_lat}, {dest_lng})")
    
    # Calculate distance
    try:
        distance = calculate_distance(pickup_lat, pickup_lng, dest_lat, dest_lng)
    except ValueError as e:
        logging.error(f"Distance calculation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    
    # ROUTE VALIDATION: Flag (don't reject) long routes
    route_status = "valid"
    requires_confirmation = False
    
    # Sanity check: Reject obviously bad coordinates (> 1000 miles likely geocoding error)
    if distance > 1000:
        logging.error(f"Route appears invalid: {distance:.2f} miles. Likely geocoding error.")
        raise HTTPException(
            status_code=400,
            detail=f"Route distance ({distance:.0f} miles) appears incorrect. Please verify your pickup and destination locations."
        )
    
    # Long trip (> 150 miles) - allow but flag for confirmation
    if distance > 150:
        logging.info(f"Long trip detected: {distance:.2f} miles. Flagging for confirmation.")
        route_status = "long_trip"
        requires_confirmation = True
    
    if distance < 0.1:
        logging.warning(f"Very short distance: {distance:.2f} miles.")
        route_status = "too_short"
    
    # Calculate estimated duration
    duration = estimate_duration(distance)
    
    # Generate decision-based estimates (no fake prices)
    estimates, decision_hint, recommendation = generate_decision_estimates(distance, request.pickup, request.destination)
    
    # Adjust decision hint for edge cases
    if route_status == "too_short":
        decision_hint = "Very short trip — consider walking or biking."
        recommendation = "Tip: Save money and time by walking this short distance."
    elif route_status == "long_trip":
        decision_hint = f"Long trip ({distance:.0f} miles) — plan for extended travel time."
        recommendation = "Recommended: Book now and confirm driver before starting."
    
    return CompareResponse(
        estimates=estimates,
        distance_miles=round(distance, 2),
        duration_minutes=duration,
        pickup_coords={
            "lat": pickup_lat,
            "lng": pickup_lng,
            "address": request.pickup.address
        },
        destination_coords={
            "lat": dest_lat,
            "lng": dest_lng,
            "address": request.destination.address
        },
        route_status=route_status,
        decision_hint=decision_hint,
        recommendation=recommendation,
        requires_confirmation=requires_confirmation
    )

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# ============== Google Places API Endpoints ==============

class PlacesAutocompleteRequest(BaseModel):
    input: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    session_token: Optional[str] = None

class PlaceSuggestion(BaseModel):
    place_id: str
    main_text: str
    secondary_text: str
    full_address: str
    types: List[str] = []

class PlacesAutocompleteResponse(BaseModel):
    suggestions: List[PlaceSuggestion]
    session_token: str

class PlaceDetailsRequest(BaseModel):
    place_id: str
    session_token: Optional[str] = None

class PlaceDetailsResponse(BaseModel):
    place_id: str
    formatted_address: str
    latitude: float
    longitude: float
    name: Optional[str] = None
    types: List[str] = []

@api_router.post("/places/autocomplete", response_model=PlacesAutocompleteResponse)
async def places_autocomplete(request: PlacesAutocompleteRequest):
    """Google Places Autocomplete for address search"""
    
    if not GOOGLE_PLACES_API_KEY:
        raise HTTPException(status_code=500, detail="Google Places API key not configured")
    
    if len(request.input) < 2:
        return PlacesAutocompleteResponse(suggestions=[], session_token=request.session_token or str(uuid.uuid4()))
    
    session_token = request.session_token or str(uuid.uuid4())
    
    # Build request for Google Places API (New)
    payload = {
        "input": request.input,
        "includedRegionCodes": ["us"],
        "languageCode": "en",
        "sessionToken": session_token,
    }
    
    # Add location bias if provided (15km radius)
    if request.location_lat and request.location_lng:
        payload["locationBias"] = {
            "circle": {
                "center": {
                    "latitude": request.location_lat,
                    "longitude": request.location_lng
                },
                "radius": 25000.0  # 25km radius for better local results
            }
        }
    
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                "https://places.googleapis.com/v1/places:autocomplete",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
                    "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types"
                },
                timeout=10.0
            )
            
            if response.status_code != 200:
                logger.error(f"Google Places API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=502, detail="Failed to get suggestions from Google Places API")
            
            data = response.json()
            suggestions = []
            
            for suggestion in data.get("suggestions", []):
                if "placePrediction" in suggestion:
                    place = suggestion["placePrediction"]
                    structured = place.get("structuredFormat", {})
                    
                    suggestions.append(PlaceSuggestion(
                        place_id=place.get("placeId", ""),
                        main_text=structured.get("mainText", {}).get("text", ""),
                        secondary_text=structured.get("secondaryText", {}).get("text", ""),
                        full_address=place.get("text", {}).get("text", ""),
                        types=place.get("types", [])
                    ))
            
            return PlacesAutocompleteResponse(
                suggestions=suggestions,
                session_token=session_token
            )
            
    except httpx.TimeoutException:
        logger.error("Google Places API timeout")
        raise HTTPException(status_code=504, detail="Google Places API request timed out")
    except Exception as e:
        logger.error(f"Google Places API error: {e}")
        raise HTTPException(status_code=500, detail="Error communicating with Google Places API")

@api_router.post("/places/details", response_model=PlaceDetailsResponse)
async def get_place_details(request: PlaceDetailsRequest):
    """Get detailed place information including exact coordinates"""
    
    if not GOOGLE_PLACES_API_KEY:
        raise HTTPException(status_code=500, detail="Google Places API key not configured")
    
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                f"https://places.googleapis.com/v1/places/{request.place_id}",
                headers={
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
                    "X-Goog-FieldMask": "id,displayName,formattedAddress,location,types"
                },
                timeout=10.0
            )
            
            if response.status_code != 200:
                logger.error(f"Google Places Details API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=502, detail="Failed to get place details from Google Places API")
            
            data = response.json()
            location = data.get("location", {})
            
            return PlaceDetailsResponse(
                place_id=data.get("id", request.place_id),
                formatted_address=data.get("formattedAddress", ""),
                latitude=location.get("latitude", 0.0),
                longitude=location.get("longitude", 0.0),
                name=data.get("displayName", {}).get("text"),
                types=data.get("types", [])
            )
            
    except httpx.TimeoutException:
        logger.error("Google Places Details API timeout")
        raise HTTPException(status_code=504, detail="Google Places API request timed out")
    except Exception as e:
        logger.error(f"Google Places Details API error: {e}")
        raise HTTPException(status_code=500, detail="Error getting place details")


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
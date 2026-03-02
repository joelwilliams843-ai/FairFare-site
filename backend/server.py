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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    decision_hint: str  # Contextual advice for the user
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


def generate_decision_estimates(distance_miles: float, pickup: Location, destination: Location) -> tuple[List[RideEstimate], str]:
    """Generate decision-based ride estimates without fake prices"""
    
    time_ctx = get_time_context()
    
    # Determine demand level and surge based on time context (real signals)
    # Premium labels: Favorable, Balanced, Elevated, Peak
    if time_ctx["is_rush_hour"]:
        uber_price_level = "Peak"
        lyft_price_level = "Peak"
        uber_surge = "High"
        lyft_surge = "High"
        uber_availability = "Limited"
        lyft_availability = "Limited"
        decision_hint = "Peak demand period. Consider waiting 30-60 min for more favorable rates."
    elif time_ctx["is_late_night"]:
        uber_price_level = "Balanced"
        lyft_price_level = "Balanced"
        uber_surge = "Moderate"
        lyft_surge = "Low"
        uber_availability = "Limited"
        lyft_availability = "Limited"
        decision_hint = "Late night - fewer drivers available. Rides may take longer to arrive."
    elif time_ctx["is_weekend"] and not time_ctx["is_midday"]:
        uber_price_level = "Elevated"
        lyft_price_level = "Balanced"
        uber_surge = "Moderate"
        lyft_surge = "Moderate"
        uber_availability = "Good"
        lyft_availability = "Good"
        decision_hint = "Weekend evening - moderate demand. Generally a good time to book."
    else:
        uber_price_level = "Favorable"
        lyft_price_level = "Favorable"
        uber_surge = "Low"
        lyft_surge = "Low"
        uber_availability = "Good"
        lyft_availability = "Good"
        decision_hint = "Low demand period - typically a good time to book at standard rates."
    
    # Longer distances may have better highway rates
    if distance_miles > 20:
        decision_hint += " Longer trip - highway rates often apply."
    
    # Wait times based on availability (realistic estimates)
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
    
    return estimates, decision_hint


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
    estimates, decision_hint = generate_decision_estimates(distance, request.pickup, request.destination)
    
    # Adjust decision hint for edge cases
    if route_status == "too_short":
        decision_hint = "Very short trip - consider walking or biking. " + decision_hint
    elif route_status == "long_trip":
        decision_hint = f"Long trip ({distance:.0f} miles). " + decision_hint
    
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
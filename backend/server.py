from fastapi import FastAPI, APIRouter
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
    price_min: float
    price_max: float
    wait_time: int
    deep_link: str
    web_link: str

class CompareResponse(BaseModel):
    estimates: List[RideEstimate]
    distance_miles: float
    duration_minutes: int
    pickup_coords: dict
    destination_coords: dict


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


def generate_ride_estimates(distance_miles: float, pickup: Location, destination: Location) -> List[RideEstimate]:
    """Generate mock ride estimates based on distance"""
    
    # Base prices and per-mile rates
    uber_base = 2.50
    uber_per_mile = 1.75
    lyft_base = 2.00
    lyft_per_mile = 1.85
    
    # Add realistic variance (±8-12% to simulate live pricing movement)
    uber_variance = random.uniform(0.88, 1.12)
    lyft_variance = random.uniform(0.88, 1.12)
    
    # Add surge factor (1.0 to 1.5x)
    surge_factor = random.uniform(1.0, 1.5)
    
    # Calculate base prices with variance
    uber_price = (uber_base + distance_miles * uber_per_mile) * surge_factor * uber_variance
    lyft_price = (lyft_base + distance_miles * lyft_per_mile) * surge_factor * lyft_variance
    
    # Wait times (2-12 minutes, inversely related to surge)
    uber_wait = random.randint(2, 8) if surge_factor < 1.3 else random.randint(6, 12)
    lyft_wait = random.randint(2, 8) if surge_factor < 1.3 else random.randint(6, 12)
    
    # Create deep links with coordinates properly structured
    pickup_lat = pickup.lat or 0
    pickup_lng = pickup.lng or 0
    dest_lat = destination.lat or 0
    dest_lng = destination.lng or 0
    
    # URL encode addresses for web fallback
    from urllib.parse import quote
    pickup_address = quote(pickup.address)
    dest_address = quote(destination.address)
    
    # Uber deep link format (mobile app)
    uber_deeplink = f"uber://?action=setPickup&pickup[latitude]={pickup_lat}&pickup[longitude]={pickup_lng}&dropoff[latitude]={dest_lat}&dropoff[longitude]={dest_lng}&product_id=a1111c8c-c720-46c3-8534-2fcdd730040d"
    
    # Uber web fallback with pre-filled trip
    uber_web = f"https://m.uber.com/ul/?action=setPickup&pickup[latitude]={pickup_lat}&pickup[longitude]={pickup_lng}&pickup[formatted_address]={pickup_address}&dropoff[latitude]={dest_lat}&dropoff[longitude]={dest_lng}&dropoff[formatted_address]={dest_address}"
    
    # Lyft deep link format (mobile app)
    lyft_deeplink = f"lyft://ridetype?id=lyft&pickup[latitude]={pickup_lat}&pickup[longitude]={pickup_lng}&destination[latitude]={dest_lat}&destination[longitude]={dest_lng}"
    
    # Lyft web fallback with pre-filled trip
    lyft_web = f"https://ride.lyft.com/?action=ride&pickup[latitude]={pickup_lat}&pickup[longitude]={pickup_lng}&destination[latitude]={dest_lat}&destination[longitude]={dest_lng}"
    
    estimates = [
        RideEstimate(
            provider="Uber",
            ride_type="UberX",
            price_min=round(uber_price * 0.92, 2),
            price_max=round(uber_price * 1.08, 2),
            wait_time=uber_wait,
            deep_link=uber_deeplink,
            web_link=uber_web
        ),
        RideEstimate(
            provider="Lyft",
            ride_type="Standard",
            price_min=round(lyft_price * 0.92, 2),
            price_max=round(lyft_price * 1.08, 2),
            wait_time=lyft_wait,
            deep_link=lyft_deeplink,
            web_link=lyft_web
        )
    ]
    
    return estimates


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "FairFare API"}

@api_router.post("/compare-rides", response_model=CompareResponse)
async def compare_rides(request: CompareRequest):
    """Compare ride estimates between Uber and Lyft"""
    
    # Use provided coordinates or mock coordinates based on address
    pickup_lat = request.pickup.lat or 37.7749
    pickup_lng = request.pickup.lng or -122.4194
    dest_lat = request.destination.lat or 37.8044
    dest_lng = request.destination.lng or -122.2712
    
    # Calculate distance
    distance = calculate_distance(pickup_lat, pickup_lng, dest_lat, dest_lng)
    
    # Generate estimates
    estimates = generate_ride_estimates(distance, request.pickup, request.destination)
    
    return CompareResponse(
        estimates=estimates,
        distance_miles=round(distance, 2)
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
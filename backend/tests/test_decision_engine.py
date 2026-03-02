"""
Backend tests for FairFare Decision Engine
Tests: Route validation (150 mile limit), Decision Engine responses (price_level, surge_likelihood, decision_hint)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "FairFare API"
        print("✓ API root endpoint working")


class TestRouteValidation:
    """Test route validation - 150 mile limit"""
    
    def test_valid_short_route(self):
        """Test valid short route (Times Square to Central Park ~2 miles)"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "Times Square, NYC",
                "lat": 40.7580,
                "lng": -73.9855
            },
            "destination": {
                "address": "Central Park, NYC",
                "lat": 40.7829,
                "lng": -73.9654
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["distance_miles"] < 10
        assert data["route_status"] == "valid"
        print(f"✓ Short route accepted: {data['distance_miles']:.2f} miles")
    
    def test_valid_medium_route(self):
        """Test valid medium route (NYC to Philadelphia ~95 miles)"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "New York City",
                "lat": 40.7128,
                "lng": -74.0060
            },
            "destination": {
                "address": "Philadelphia, PA",
                "lat": 39.9526,
                "lng": -75.1652
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["distance_miles"] < 150
        assert data["route_status"] == "valid"
        print(f"✓ Medium route accepted: {data['distance_miles']:.2f} miles")
    
    def test_reject_route_over_150_miles(self):
        """Test that routes > 150 miles are rejected with 400 error"""
        # NYC to Boston is ~215 miles
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "New York City",
                "lat": 40.7128,
                "lng": -74.0060
            },
            "destination": {
                "address": "Boston, MA",
                "lat": 42.3601,
                "lng": -71.0589
            }
        })
        assert response.status_code == 400
        data = response.json()
        assert "150 miles" in data["detail"]
        print(f"✓ Route > 150 miles rejected: {data['detail']}")
    
    def test_reject_very_long_route(self):
        """Test that very long routes (NYC to LA) are rejected"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "New York City",
                "lat": 40.7128,
                "lng": -74.0060
            },
            "destination": {
                "address": "Los Angeles, CA",
                "lat": 34.0522,
                "lng": -118.2437
            }
        })
        assert response.status_code == 400
        data = response.json()
        assert "150 miles" in data["detail"] or "exceeds" in data["detail"].lower()
        print(f"✓ Very long route rejected: {data['detail']}")
    
    def test_missing_pickup_coordinates(self):
        """Test that missing pickup coordinates returns 400"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "Times Square, NYC",
                "lat": None,
                "lng": None
            },
            "destination": {
                "address": "Central Park, NYC",
                "lat": 40.7829,
                "lng": -73.9654
            }
        })
        assert response.status_code == 400
        data = response.json()
        assert "pickup" in data["detail"].lower() or "coordinates" in data["detail"].lower()
        print(f"✓ Missing pickup coordinates rejected: {data['detail']}")
    
    def test_missing_destination_coordinates(self):
        """Test that missing destination coordinates returns 400"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "Times Square, NYC",
                "lat": 40.7580,
                "lng": -73.9855
            },
            "destination": {
                "address": "Central Park, NYC",
                "lat": None,
                "lng": None
            }
        })
        assert response.status_code == 400
        data = response.json()
        assert "destination" in data["detail"].lower() or "coordinates" in data["detail"].lower()
        print(f"✓ Missing destination coordinates rejected: {data['detail']}")


class TestDecisionEngine:
    """Test Decision Engine responses - qualitative indicators instead of prices"""
    
    def test_response_has_price_level(self):
        """Test that response includes price_level (Cheap/Moderate/Busy)"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "Times Square, NYC",
                "lat": 40.7580,
                "lng": -73.9855
            },
            "destination": {
                "address": "Central Park, NYC",
                "lat": 40.7829,
                "lng": -73.9654
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        for estimate in data["estimates"]:
            assert "price_level" in estimate
            assert estimate["price_level"] in ["Cheap", "Moderate", "Busy"]
            print(f"✓ {estimate['provider']} price_level: {estimate['price_level']}")
    
    def test_response_has_surge_likelihood(self):
        """Test that response includes surge_likelihood (Low/Moderate/High)"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "Times Square, NYC",
                "lat": 40.7580,
                "lng": -73.9855
            },
            "destination": {
                "address": "Central Park, NYC",
                "lat": 40.7829,
                "lng": -73.9654
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        for estimate in data["estimates"]:
            assert "surge_likelihood" in estimate
            assert estimate["surge_likelihood"] in ["Low", "Moderate", "High"]
            print(f"✓ {estimate['provider']} surge_likelihood: {estimate['surge_likelihood']}")
    
    def test_response_has_decision_hint(self):
        """Test that response includes decision_hint with contextual advice"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "Times Square, NYC",
                "lat": 40.7580,
                "lng": -73.9855
            },
            "destination": {
                "address": "Central Park, NYC",
                "lat": 40.7829,
                "lng": -73.9654
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "decision_hint" in data
        assert len(data["decision_hint"]) > 0
        print(f"✓ Decision hint: {data['decision_hint']}")
    
    def test_response_has_availability(self):
        """Test that response includes availability (Good/Limited/Busy)"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "Times Square, NYC",
                "lat": 40.7580,
                "lng": -73.9855
            },
            "destination": {
                "address": "Central Park, NYC",
                "lat": 40.7829,
                "lng": -73.9654
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        for estimate in data["estimates"]:
            assert "availability" in estimate
            assert estimate["availability"] in ["Good", "Limited", "Busy"]
            print(f"✓ {estimate['provider']} availability: {estimate['availability']}")
    
    def test_no_numeric_prices_in_response(self):
        """Test that response does NOT contain numeric price fields"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "Times Square, NYC",
                "lat": 40.7580,
                "lng": -73.9855
            },
            "destination": {
                "address": "Central Park, NYC",
                "lat": 40.7829,
                "lng": -73.9654
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        for estimate in data["estimates"]:
            # Should NOT have numeric price fields
            assert "price_min" not in estimate
            assert "price_max" not in estimate
            assert "price" not in estimate
            print(f"✓ {estimate['provider']} has no numeric prices")
    
    def test_response_has_deep_links(self):
        """Test that response includes deep links for Uber and Lyft"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "Times Square, NYC",
                "lat": 40.7580,
                "lng": -73.9855
            },
            "destination": {
                "address": "Central Park, NYC",
                "lat": 40.7829,
                "lng": -73.9654
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        for estimate in data["estimates"]:
            assert "deep_link" in estimate
            assert "web_link" in estimate
            
            if estimate["provider"] == "Uber":
                assert "uber://" in estimate["deep_link"]
                assert "m.uber.com" in estimate["web_link"]
            elif estimate["provider"] == "Lyft":
                assert "lyft://" in estimate["deep_link"]
                assert "ride.lyft.com" in estimate["web_link"]
            
            print(f"✓ {estimate['provider']} deep links present")
    
    def test_deep_links_contain_coordinates(self):
        """Test that deep links contain pickup and destination coordinates"""
        pickup_lat, pickup_lng = 40.7580, -73.9855
        dest_lat, dest_lng = 40.7829, -73.9654
        
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "Times Square, NYC",
                "lat": pickup_lat,
                "lng": pickup_lng
            },
            "destination": {
                "address": "Central Park, NYC",
                "lat": dest_lat,
                "lng": dest_lng
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        for estimate in data["estimates"]:
            # Check that coordinates are in the deep link
            assert str(pickup_lat) in estimate["deep_link"]
            assert str(dest_lat) in estimate["deep_link"]
            print(f"✓ {estimate['provider']} deep link contains coordinates")


class TestRouteInfo:
    """Test route information in response"""
    
    def test_response_has_distance_and_duration(self):
        """Test that response includes distance_miles and duration_minutes"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "Times Square, NYC",
                "lat": 40.7580,
                "lng": -73.9855
            },
            "destination": {
                "address": "Central Park, NYC",
                "lat": 40.7829,
                "lng": -73.9654
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "distance_miles" in data
        assert "duration_minutes" in data
        assert isinstance(data["distance_miles"], (int, float))
        assert isinstance(data["duration_minutes"], int)
        print(f"✓ Distance: {data['distance_miles']} miles, Duration: {data['duration_minutes']} min")
    
    def test_response_has_route_status(self):
        """Test that response includes route_status"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "Times Square, NYC",
                "lat": 40.7580,
                "lng": -73.9855
            },
            "destination": {
                "address": "Central Park, NYC",
                "lat": 40.7829,
                "lng": -73.9654
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "route_status" in data
        assert data["route_status"] in ["valid", "too_short", "too_long"]
        print(f"✓ Route status: {data['route_status']}")
    
    def test_response_has_coordinate_info(self):
        """Test that response includes pickup and destination coordinate info"""
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "Times Square, NYC",
                "lat": 40.7580,
                "lng": -73.9855
            },
            "destination": {
                "address": "Central Park, NYC",
                "lat": 40.7829,
                "lng": -73.9654
            }
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "pickup_coords" in data
        assert "destination_coords" in data
        assert "lat" in data["pickup_coords"]
        assert "lng" in data["pickup_coords"]
        assert "lat" in data["destination_coords"]
        assert "lng" in data["destination_coords"]
        print(f"✓ Coordinate info present in response")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

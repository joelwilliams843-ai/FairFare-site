"""
Backend tests for FairFare Decision Engine - P0 Features
Tests: Premium labels (Favorable/Balanced/Elevated/Peak), Long trip confirmation modal (>150 miles),
       Route validation (>1000 miles rejected), Decision Engine responses
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


class TestPremiumLabels:
    """Test Premium labels: Favorable/Balanced/Elevated/Peak instead of Cheap/Moderate/Busy"""
    
    def test_price_level_uses_premium_labels(self):
        """Test that price_level uses premium labels (Favorable/Balanced/Elevated/Peak)"""
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
        
        premium_labels = ["Favorable", "Balanced", "Elevated", "Peak"]
        old_labels = ["Cheap", "Moderate", "Busy"]
        
        for estimate in data["estimates"]:
            assert "price_level" in estimate
            # Should use premium labels
            assert estimate["price_level"] in premium_labels, f"Expected premium label, got: {estimate['price_level']}"
            # Should NOT use old labels
            assert estimate["price_level"] not in old_labels, f"Old label found: {estimate['price_level']}"
            print(f"✓ {estimate['provider']} price_level: {estimate['price_level']} (premium label)")
    
    def test_surge_likelihood_values(self):
        """Test that surge_likelihood uses Low/Moderate/High"""
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


class TestLongTripConfirmation:
    """Test Long trip confirmation modal - routes > 150 miles show modal instead of rejection"""
    
    def test_long_trip_returns_requires_confirmation(self):
        """Test that routes > 150 miles return requires_confirmation: true"""
        # NYC to Boston is ~190 miles
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
        # Should return 200, not 400
        assert response.status_code == 200, f"Expected 200 for long trip, got {response.status_code}"
        data = response.json()
        
        # Should have requires_confirmation flag
        assert "requires_confirmation" in data
        assert data["requires_confirmation"] == True, "Long trip should require confirmation"
        
        # Should have route_status = "long_trip"
        assert data["route_status"] == "long_trip"
        
        # Should still have estimates
        assert len(data["estimates"]) >= 2
        
        print(f"✓ Long trip ({data['distance_miles']:.0f} miles) returns requires_confirmation: true")
    
    def test_short_trip_no_confirmation_needed(self):
        """Test that routes < 150 miles do NOT require confirmation"""
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
        
        # Should NOT require confirmation
        assert data.get("requires_confirmation", False) == False
        assert data["route_status"] == "valid"
        
        print(f"✓ Short trip ({data['distance_miles']:.2f} miles) does not require confirmation")
    
    def test_medium_trip_no_confirmation_needed(self):
        """Test that routes ~100 miles do NOT require confirmation"""
        # NYC to Philadelphia is ~95 miles
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
        
        # Should NOT require confirmation (under 150 miles)
        assert data.get("requires_confirmation", False) == False
        assert data["route_status"] == "valid"
        
        print(f"✓ Medium trip ({data['distance_miles']:.0f} miles) does not require confirmation")


class TestVeryLongRouteRejection:
    """Test that routes > 1000 miles are still rejected (sanity check for geocoding errors)"""
    
    def test_reject_route_over_1000_miles(self):
        """Test that routes > 1000 miles are rejected with 400 error"""
        # NYC to LA is ~2450 miles
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
        assert "incorrect" in data["detail"].lower() or "verify" in data["detail"].lower()
        print(f"✓ Very long route (>1000 miles) rejected: {data['detail']}")
    
    def test_reject_cross_country_route(self):
        """Test that cross-country routes are rejected"""
        # NYC to Seattle is ~2400 miles
        response = requests.post(f"{BASE_URL}/api/compare-rides", json={
            "pickup": {
                "address": "New York City",
                "lat": 40.7128,
                "lng": -74.0060
            },
            "destination": {
                "address": "Seattle, WA",
                "lat": 47.6062,
                "lng": -122.3321
            }
        })
        assert response.status_code == 400
        print("✓ Cross-country route rejected")


class TestRouteValidation:
    """Test route validation - coordinate validation"""
    
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
    """Test Decision Engine responses - qualitative indicators"""
    
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
        assert data["route_status"] in ["valid", "too_short", "long_trip"]
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

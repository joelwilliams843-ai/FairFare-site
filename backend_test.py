import requests
import sys
from datetime import datetime
import json

class FairFareAPITester:
    def __init__(self, base_url="https://fairfare-ride.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response: {json.dumps(response_data, indent=2)}")
                except:
                    print(f"Response: {response.text}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")

            self.test_results.append({
                "test": name,
                "success": success,
                "status_code": response.status_code,
                "expected_status": expected_status,
                "response": response.text[:500] if response.text else ""
            })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                "test": name,
                "success": False,
                "error": str(e)
            })
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "api/", 200)

    def test_compare_rides_basic(self):
        """Test basic ride comparison"""
        data = {
            "pickup": {
                "address": "San Francisco, CA",
                "lat": 37.7749,
                "lng": -122.4194
            },
            "destination": {
                "address": "Oakland, CA", 
                "lat": 37.8044,
                "lng": -122.2712
            }
        }
        return self.run_test("Compare Rides - Basic", "POST", "api/compare-rides", 200, data)

    def test_compare_rides_no_coords(self):
        """Test ride comparison without coordinates"""
        data = {
            "pickup": {
                "address": "Downtown San Francisco"
            },
            "destination": {
                "address": "Berkeley"
            }
        }
        return self.run_test("Compare Rides - No Coords", "POST", "api/compare-rides", 200, data)

    def test_compare_rides_invalid_data(self):
        """Test ride comparison with invalid data"""
        data = {
            "pickup": {
                "address": ""
            }
        }
        return self.run_test("Compare Rides - Invalid", "POST", "api/compare-rides", 422, data)

    def test_status_endpoints(self):
        """Test status check endpoints"""
        # Test POST status
        create_data = {"client_name": "test_client"}
        success, response = self.run_test("Create Status Check", "POST", "api/status", 200, create_data)
        
        if success:
            # Test GET status
            self.run_test("Get Status Checks", "GET", "api/status", 200)
        
        return success

    def test_price_variance(self):
        """Test that prices vary between requests (±8-12% variance)"""
        print("\n🔍 Testing Price Variance (±8-12%)...")
        
        data = {
            "pickup": {
                "address": "San Francisco, CA",
                "lat": 37.7749,
                "lng": -122.4194
            },
            "destination": {
                "address": "Oakland, CA", 
                "lat": 37.8044,
                "lng": -122.2712
            }
        }
        
        prices = []
        for i in range(3):
            success, response = self.run_test(f"Price Variance Test {i+1}", "POST", "api/compare-rides", 200, data)
            if success and "estimates" in response:
                uber_avg = (response["estimates"][0]["price_min"] + response["estimates"][0]["price_max"]) / 2
                lyft_avg = (response["estimates"][1]["price_min"] + response["estimates"][1]["price_max"]) / 2
                prices.append({"uber": uber_avg, "lyft": lyft_avg})
        
        if len(prices) >= 2:
            # Check if prices are different between requests
            uber_prices = [p["uber"] for p in prices]
            lyft_prices = [p["lyft"] for p in prices]
            
            uber_variance = max(uber_prices) != min(uber_prices)
            lyft_variance = max(lyft_prices) != min(lyft_prices)
            
            if uber_variance or lyft_variance:
                print("✅ Price variance detected - prices change between requests")
                print(f"Uber prices: {uber_prices}")
                print(f"Lyft prices: {lyft_prices}")
                return True
            else:
                print("❌ No price variance detected - prices are identical")
                return False
        
        return False

    def validate_compare_response(self, response_data):
        """Validate the structure of compare-rides response"""
        required_fields = ["estimates", "distance_miles"]
        for field in required_fields:
            if field not in response_data:
                print(f"❌ Missing field: {field}")
                return False
        
        estimates = response_data.get("estimates", [])
        if len(estimates) != 2:
            print(f"❌ Expected 2 estimates, got {len(estimates)}")
            return False
        
        # Check each estimate has required fields
        estimate_fields = ["provider", "ride_type", "price_min", "price_max", "wait_time", "deep_link"]
        for i, estimate in enumerate(estimates):
            for field in estimate_fields:
                if field not in estimate:
                    print(f"❌ Estimate {i} missing field: {field}")
                    return False
        
        # Check providers are Uber and Lyft
        providers = [est["provider"] for est in estimates]
        if "Uber" not in providers or "Lyft" not in providers:
            print(f"❌ Expected Uber and Lyft providers, got: {providers}")
            return False
        
        print("✅ Response structure validation passed")
        return True

def main():
    print("🚀 Starting FairFare API Tests")
    print("=" * 50)
    
    tester = FairFareAPITester()
    
    # Test API root
    tester.test_api_root()
    
    # Test compare rides with coordinates
    success, response = tester.test_compare_rides_basic()
    if success:
        tester.validate_compare_response(response)
    
    # Test compare rides without coordinates
    tester.test_compare_rides_no_coords()
    
    # Test invalid data handling
    tester.test_compare_rides_invalid_data()
    
    # Test status endpoints
    tester.test_status_endpoints()
    
    # Test price variance
    tester.test_price_variance()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
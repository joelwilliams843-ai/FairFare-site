import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { MapPin, Navigation, Star, Clock } from "lucide-react";
import { toast, Toaster } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [view, setView] = useState("input");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [savedRoute, setSavedRoute] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("weekendRide");
    if (saved) {
      setSavedRoute(JSON.parse(saved));
    }
    
    // Auto-detect location on load
    detectLocation();
  }, []);

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setPickupCoords({ lat, lng });
          setPickup(`Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          toast.success("Location detected!");
        },
        (error) => {
          // Silently fail on initial load, only show error if user clicks button
          if (error.code !== error.PERMISSION_DENIED) {
            console.log("Geolocation not available, manual entry enabled");
          }
        }
      );
    }
  };

  const compareRides = async () => {
    if (!pickup || !destination) {
      toast.error("Please enter both pickup and destination");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/compare-rides`, {
        pickup: {
          address: pickup,
          lat: pickupCoords?.lat || null,
          lng: pickupCoords?.lng || null,
        },
        destination: {
          address: destination,
          lat: destCoords?.lat || null,
          lng: destCoords?.lng || null,
        },
      });
      setResults(response.data);
      setView("results");
    } catch (error) {
      console.error("Error comparing rides:", error);
      toast.error("Failed to compare rides. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const refreshPrices = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/compare-rides`, {
        pickup: {
          address: pickup,
          lat: pickupCoords?.lat || null,
          lng: pickupCoords?.lng || null,
        },
        destination: {
          address: destination,
          lat: destCoords?.lat || null,
          lng: destCoords?.lng || null,
        },
      });
      setResults(response.data);
      toast.success("Prices refreshed!");
    } catch (error) {
      console.error("Error refreshing prices:", error);
      toast.error("Failed to refresh prices.");
    } finally {
      setLoading(false);
    }
  };

  const getBestPrice = () => {
    if (!results || !results.estimates) return null;
    const estimates = results.estimates;
    if (estimates.length < 2) return null;
    
    const uber = estimates[0];
    const lyft = estimates[1];
    const uberAvg = (uber.price_min + uber.price_max) / 2;
    const lyftAvg = (lyft.price_min + lyft.price_max) / 2;
    
    return uberAvg < lyftAvg ? "Uber" : "Lyft";
  };

  const saveWeekendRide = () => {
    if (!pickup || !destination) {
      toast.error("Enter a route to save");
      return;
    }
    const route = {
      pickup,
      destination,
      pickupCoords,
      destCoords,
    };
    localStorage.setItem("weekendRide", JSON.stringify(route));
    setSavedRoute(route);
    toast.success("Weekend Ride saved!");
  };

  const loadWeekendRide = () => {
    if (savedRoute) {
      setPickup(savedRoute.pickup);
      setDestination(savedRoute.destination);
      setPickupCoords(savedRoute.pickupCoords);
      setDestCoords(savedRoute.destCoords);
      toast.success("Weekend Ride loaded!");
    }
  };

  const openDeepLink = (deepLink) => {
    window.location.href = deepLink;
    
    setTimeout(() => {
      if (deepLink.startsWith("uber://")) {
        window.open("https://m.uber.com/looking", "_blank");
      } else if (deepLink.startsWith("lyft://")) {
        window.open("https://www.lyft.com/ride", "_blank");
      }
    }, 2000);
  };

  return (
    <div className="app-container">
      <Toaster position="top-center" richColors />
      
      {view === "input" && (
        <div className="input-view">
          <div className="header">
            <h1 className="app-title">FairFare</h1>
            <p className="app-subtitle">Compare rides instantly</p>
          </div>

          <div className="input-section">
            <div className="input-group">
              <label className="input-label">PICKUP</label>
              <div className="input-wrapper">
                <MapPin className="input-icon" size={20} />
                <input
                  type="text"
                  data-testid="pickup-input"
                  placeholder="Enter pickup location"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="location-input"
                />
                <button
                  data-testid="detect-location-btn"
                  onClick={detectLocation}
                  className="gps-button"
                  aria-label="Detect location"
                >
                  <Navigation size={18} />
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">DESTINATION</label>
              <div className="input-wrapper">
                <MapPin className="input-icon" size={20} />
                <input
                  type="text"
                  data-testid="dest-input"
                  placeholder="Enter destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="location-input"
                />
              </div>
            </div>

            {savedRoute && (
              <button
                data-testid="load-weekend-ride-btn"
                onClick={loadWeekendRide}
                className="saved-route-btn"
              >
                <Star size={18} className="star-icon" />
                <span>Weekend Ride</span>
              </button>
            )}

            <button
              data-testid="compare-btn"
              onClick={compareRides}
              disabled={loading}
              className="compare-button"
            >
              {loading ? "Comparing..." : "Compare Rides"}
            </button>

            {pickup && destination && !savedRoute && (
              <button
                data-testid="save-weekend-ride-btn"
                onClick={saveWeekendRide}
                className="save-route-btn"
              >
                Save as Weekend Ride
              </button>
            )}
          </div>
        </div>
      )}

      {view === "results" && results && (
        <div className="results-view">
          <div className="results-header">
            <button
              data-testid="back-btn"
              onClick={() => setView("input")}
              className="back-button"
            >
              ← Back
            </button>
            <div className="results-info">
              <h2 className="results-title">Comparison Results</h2>
              <p className="distance-text">{results.distance_miles} miles</p>
            </div>
          </div>

          <div className="estimates-list">
            {results.estimates.map((estimate, idx) => (
              <div
                key={idx}
                data-testid={`${estimate.provider.toLowerCase()}-card`}
                className={`estimate-card ${estimate.provider.toLowerCase()}`}
              >
                <div className="estimate-header">
                  <h3 className="provider-name">{estimate.provider}</h3>
                  <span className="ride-type">{estimate.ride_type}</span>
                </div>

                <div className="estimate-details">
                  <div className="detail-item">
                    <span className="detail-label">Price</span>
                    <span className="price-range">
                      ${estimate.price_min} - ${estimate.price_max}
                    </span>
                  </div>
                  <div className="detail-item">
                    <Clock size={16} className="clock-icon" />
                    <span className="wait-time">{estimate.wait_time} min</span>
                  </div>
                </div>

                <button
                  data-testid={`${estimate.provider.toLowerCase()}-open-btn`}
                  onClick={() => openDeepLink(estimate.deep_link)}
                  className={`open-app-button ${estimate.provider.toLowerCase()}`}
                >
                  Open in {estimate.provider}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

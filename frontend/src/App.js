import { useState, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { MapPin, Navigation, Star, Clock, X } from "lucide-react";
import { toast, Toaster } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Nominatim API (OpenStreetMap) - Free, no API key
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

function App() {
  const [view, setView] = useState("input");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [savedRoute, setSavedRoute] = useState(null);
  
  // Autocomplete states
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [recentLocations, setRecentLocations] = useState([]);
  const [activeField, setActiveField] = useState(null);
  
  const pickupRef = useRef(null);
  const destRef = useRef(null);
  const autocompleteTimer = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("weekendRide");
    if (saved) {
      setSavedRoute(JSON.parse(saved));
    }
    
    // Load recent locations
    const recent = localStorage.getItem("recentLocations");
    if (recent) {
      setRecentLocations(JSON.parse(recent));
    }
    
    // Auto-detect location on load
    detectLocation();
  }, []);

  // Save to recent locations
  const saveToRecent = (location) => {
    if (!location || location.length < 3) return;
    
    const recent = [...recentLocations];
    // Remove if already exists
    const filtered = recent.filter(loc => loc !== location);
    // Add to beginning
    filtered.unshift(location);
    // Keep only last 5
    const updated = filtered.slice(0, 5);
    
    setRecentLocations(updated);
    localStorage.setItem("recentLocations", JSON.stringify(updated));
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await axios.get(`${NOMINATIM_BASE}/reverse`, {
        params: {
          lat,
          lon: lng,
          format: 'json'
        },
        headers: {
          'User-Agent': 'FairFare/1.0'
        }
      });
      
      if (response.data && response.data.display_name) {
        return response.data.display_name;
      }
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
  };

  // Search for address suggestions
  const searchAddress = async (query, isPickup) => {
    if (!query || query.length < 3) {
      if (isPickup) setPickupSuggestions([]);
      else setDestSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(`${NOMINATIM_BASE}/search`, {
        params: {
          q: query,
          format: 'json',
          limit: 5,
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'FairFare/1.0'
        }
      });

      const suggestions = response.data.map(item => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon)
      }));

      if (isPickup) {
        setPickupSuggestions(suggestions);
      } else {
        setDestSuggestions(suggestions);
      }
    } catch (error) {
      console.error("Address search error:", error);
    }
  };

  const detectLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setPickupCoords({ lat, lng });
          
          // Reverse geocode to get address
          const address = await reverseGeocode(lat, lng);
          setPickup(address);
          toast.success("Location detected!");
        },
        (error) => {
          // Silently fail on initial load
          if (error.code !== error.PERMISSION_DENIED) {
            console.log("Geolocation not available, manual entry enabled");
          }
        }
      );
    }
  };

  const handlePickupChange = (value) => {
    setPickup(value);
    setPickupCoords(null); // Clear coords when manually typing
    
    // Debounce autocomplete search
    if (autocompleteTimer.current) {
      clearTimeout(autocompleteTimer.current);
    }
    
    autocompleteTimer.current = setTimeout(() => {
      searchAddress(value, true);
    }, 300);
  };

  const handleDestChange = (value) => {
    setDestination(value);
    setDestCoords(null);
    
    if (autocompleteTimer.current) {
      clearTimeout(autocompleteTimer.current);
    }
    
    autocompleteTimer.current = setTimeout(() => {
      searchAddress(value, false);
    }, 300);
  };

  const selectSuggestion = (suggestion, isPickup) => {
    if (isPickup) {
      setPickup(suggestion.display_name);
      setPickupCoords({ lat: suggestion.lat, lng: suggestion.lon });
      setPickupSuggestions([]);
      setShowPickupSuggestions(false);
      saveToRecent(suggestion.display_name);
    } else {
      setDestination(suggestion.display_name);
      setDestCoords({ lat: suggestion.lat, lng: suggestion.lon });
      setDestSuggestions([]);
      setShowDestSuggestions(false);
      saveToRecent(suggestion.display_name);
    }
  };

  const selectRecentLocation = (location, isPickup) => {
    if (isPickup) {
      setPickup(location);
      setShowPickupSuggestions(false);
    } else {
      setDestination(location);
      setShowDestSuggestions(false);
    }
  };

  const compareRides = async () => {
    if (!pickup || !destination) {
      toast.error("Please enter both pickup and destination");
      return;
    }

    // Save locations to recent
    saveToRecent(pickup);
    saveToRecent(destination);

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

  const openDeepLink = (estimate) => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;
    
    if (isMobile) {
      // Try to open native app
      window.location.href = estimate.deep_link;
      
      // Fallback to web after 2.5 seconds if app doesn't open
      setTimeout(() => {
        window.location.href = estimate.web_link;
      }, 2500);
    } else {
      // Desktop: Open web version directly in new tab
      window.open(estimate.web_link, '_blank');
    }
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
              <div className="input-wrapper-container">
                <div className="input-wrapper">
                  <MapPin className="input-icon" size={20} />
                  <input
                    type="text"
                    data-testid="pickup-input"
                    ref={pickupRef}
                    placeholder="Enter pickup location"
                    value={pickup}
                    onChange={(e) => handlePickupChange(e.target.value)}
                    onFocus={() => {
                      setActiveField('pickup');
                      setShowPickupSuggestions(true);
                    }}
                    onBlur={() => {
                      // Delay to allow click on suggestion
                      setTimeout(() => setShowPickupSuggestions(false), 200);
                    }}
                    className="location-input"
                  />
                  {pickup && (
                    <button
                      onClick={() => {
                        setPickup('');
                        setPickupCoords(null);
                        setPickupSuggestions([]);
                      }}
                      className="clear-button"
                      aria-label="Clear"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    data-testid="detect-location-btn"
                    onClick={detectLocation}
                    className="gps-button"
                    aria-label="Detect location"
                  >
                    <Navigation size={18} />
                  </button>
                </div>
                
                {/* Autocomplete suggestions */}
                {showPickupSuggestions && (activeField === 'pickup') && (
                  <div className="autocomplete-dropdown" data-testid="pickup-suggestions">
                    {recentLocations.length > 0 && !pickup && (
                      <>
                        <div className="suggestions-header">Recent Locations</div>
                        {recentLocations.map((loc, idx) => (
                          <div
                            key={`recent-${idx}`}
                            className="suggestion-item recent"
                            onClick={() => selectRecentLocation(loc, true)}
                          >
                            <Clock size={16} className="suggestion-icon" />
                            <span className="suggestion-text">{loc}</span>
                          </div>
                        ))}
                      </>
                    )}
                    
                    {pickupSuggestions.length > 0 && (
                      <>
                        {recentLocations.length > 0 && !pickup && <div className="suggestions-divider" />}
                        {pickupSuggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            className="suggestion-item"
                            onClick={() => selectSuggestion(suggestion, true)}
                          >
                            <MapPin size={16} className="suggestion-icon" />
                            <span className="suggestion-text">{suggestion.display_name}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">DESTINATION</label>
              <div className="input-wrapper-container">
                <div className="input-wrapper">
                  <MapPin className="input-icon" size={20} />
                  <input
                    type="text"
                    data-testid="dest-input"
                    ref={destRef}
                    placeholder="Enter destination"
                    value={destination}
                    onChange={(e) => handleDestChange(e.target.value)}
                    onFocus={() => {
                      setActiveField('destination');
                      setShowDestSuggestions(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowDestSuggestions(false), 200);
                    }}
                    className="location-input"
                  />
                  {destination && (
                    <button
                      onClick={() => {
                        setDestination('');
                        setDestCoords(null);
                        setDestSuggestions([]);
                      }}
                      className="clear-button"
                      aria-label="Clear"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                {/* Autocomplete suggestions */}
                {showDestSuggestions && (activeField === 'destination') && (
                  <div className="autocomplete-dropdown" data-testid="dest-suggestions">
                    {recentLocations.length > 0 && !destination && (
                      <>
                        <div className="suggestions-header">Recent Locations</div>
                        {recentLocations.map((loc, idx) => (
                          <div
                            key={`recent-${idx}`}
                            className="suggestion-item recent"
                            onClick={() => selectRecentLocation(loc, false)}
                          >
                            <Clock size={16} className="suggestion-icon" />
                            <span className="suggestion-text">{loc}</span>
                          </div>
                        ))}
                      </>
                    )}
                    
                    {destSuggestions.length > 0 && (
                      <>
                        {recentLocations.length > 0 && !destination && <div className="suggestions-divider" />}
                        {destSuggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            className="suggestion-item"
                            onClick={() => selectSuggestion(suggestion, false)}
                          >
                            <MapPin size={16} className="suggestion-icon" />
                            <span className="suggestion-text">{suggestion.display_name}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
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
                {getBestPrice() === estimate.provider && (
                  <div className="best-price-badge" data-testid="best-price-badge">
                    Best Price
                  </div>
                )}
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

          <button
            data-testid="refresh-prices-btn"
            onClick={refreshPrices}
            disabled={loading}
            className="refresh-button"
          >
            {loading ? "Refreshing..." : "↻ Refresh Prices"}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

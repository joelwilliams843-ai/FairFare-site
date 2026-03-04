import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "@/App.css";
import axios from "axios";
import { MapPin, Navigation, Star, Clock, X, Sparkles, TrendingDown, AlertTriangle, Loader2, DollarSign, BarChart3 } from "lucide-react";
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
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Long trip confirmation modal
  const [showLongTripModal, setShowLongTripModal] = useState(false);
  const [pendingResults, setPendingResults] = useState(null);
  
  // Deep link loading state
  const [openingApp, setOpeningApp] = useState(null); // "Uber" | "Lyft" | null
  
  // Ride for someone else
  const [rideForOther, setRideForOther] = useState(false);
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [pickupNote, setPickupNote] = useState("");
  const [frequentRiders, setFrequentRiders] = useState([]);
  const [showHelperCard, setShowHelperCard] = useState(false);
  
  // Autocomplete states
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [recentLocations, setRecentLocations] = useState([]);
  const [activeField, setActiveField] = useState(null);
  
  // Savings tracking
  const [savingsData, setSavingsData] = useState({
    totalSaved: 0,
    ridesCompared: 0,
    avgSavedPerRide: 0,
    bestProvider: 'Lyft',
    bestProviderPercent: 0
  });
  
  const pickupRef = useRef(null);
  const destRef = useRef(null);
  const autocompleteTimer = useRef(null);
  const updateTimer = useRef(null);

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
    
    // Load frequent riders
    const riders = localStorage.getItem("frequentRiders");
    if (riders) {
      setFrequentRiders(JSON.parse(riders));
    }
    
    // Load savings data
    const savings = localStorage.getItem("fairfareSavings");
    if (savings) {
      setSavingsData(JSON.parse(savings));
    }
    
    // Auto-detect location on load
    detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update timestamp periodically
  useEffect(() => {
    if (lastUpdated) {
      updateTimer.current = setInterval(() => {
        setLastUpdated(new Date(lastUpdated));
      }, 10000); // Update every 10 seconds
      
      return () => clearInterval(updateTimer.current);
    }
  }, [lastUpdated]);

  // Calculate time ago
  const getTimeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  };

  // Get FairFare Pick (best availability with good wait time)
  const getFairFarePick = () => {
    if (!results || !results.estimates) return null;
    
    const estimates = results.estimates;
    // Calculate value score based on availability and wait time
    const availabilityScore = { "Good": 0, "Limited": 10, "Busy": 20 };
    const surgeLikelihoodScore = { "Low": 0, "Moderate": 5, "High": 15 };
    
    const scored = estimates.map(est => ({
      ...est,
      score: (availabilityScore[est.availability] || 10) + 
             (surgeLikelihoodScore[est.surge_likelihood] || 5) + 
             (est.eta_minutes * 0.5)
    }));
    
    scored.sort((a, b) => a.score - b.score);
    return scored[0];
  };

  // Get demand level color class (Traveler-friendly language)
  const getDemandLevelClass = (level) => {
    switch(level) {
      case "Good time to ride": return "demand-good";
      case "Normal demand": return "demand-normal";
      case "Busy — expect delays": return "demand-busy";
      case "High demand — consider waiting": return "demand-high";
      default: return "";
    }
  };

  // Get surge indicator color
  const getSurgeClass = (surge) => {
    switch(surge) {
      case "Low": return "surge-low";
      case "Moderate": return "surge-moderate";
      case "High": return "surge-high";
      default: return "";
    }
  };

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
      console.log('Pickup selected:', {
        address: suggestion.display_name,
        lat: suggestion.lat,
        lng: suggestion.lon
      });
    } else {
      setDestination(suggestion.display_name);
      setDestCoords({ lat: suggestion.lat, lng: suggestion.lon });
      setDestSuggestions([]);
      setShowDestSuggestions(false);
      saveToRecent(suggestion.display_name);
      console.log('Destination selected:', {
        address: suggestion.display_name,
        lat: suggestion.lat,
        lng: suggestion.lon
      });
    }
  };

  // Geocode an address to get coordinates
  const geocodeAddress = async (address) => {
    try {
      const response = await axios.get(`${NOMINATIM_BASE}/search`, {
        params: {
          q: address,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'FairFare/1.0'
        }
      });
      
      if (response.data && response.data.length > 0) {
        return {
          lat: parseFloat(response.data[0].lat),
          lng: parseFloat(response.data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  const selectRecentLocation = async (location, isPickup) => {
    if (isPickup) {
      setPickup(location);
      setPickupCoords(null);
      setShowPickupSuggestions(false);
      
      // Auto-geocode the recent location
      toast.info("Getting location coordinates...");
      const coords = await geocodeAddress(location);
      if (coords) {
        setPickupCoords(coords);
        console.log('Pickup geocoded:', { address: location, ...coords });
      } else {
        toast.error("Could not find coordinates. Please select from suggestions.");
      }
    } else {
      setDestination(location);
      setDestCoords(null);
      setShowDestSuggestions(false);
      
      // Auto-geocode the recent location
      toast.info("Getting location coordinates...");
      const coords = await geocodeAddress(location);
      if (coords) {
        setDestCoords(coords);
        console.log('Destination geocoded:', { address: location, ...coords });
      } else {
        toast.error("Could not find coordinates. Please select from suggestions.");
      }
    }
  };

  // Check if we have valid coordinates for comparison
  const canCompare = () => {
    return (
      pickup &&
      destination &&
      pickupCoords?.lat &&
      pickupCoords?.lng &&
      destCoords?.lat &&
      destCoords?.lng
    );
  };

  // Get validation message for the compare button
  const getValidationMessage = () => {
    if (!pickup) return "Enter pickup location";
    if (!destination) return "Enter destination";
    if (!pickupCoords?.lat || !pickupCoords?.lng) return "Select pickup from suggestions";
    if (!destCoords?.lat || !destCoords?.lng) return "Select destination from suggestions";
    return null;
  };

  const compareRides = async () => {
    if (!pickup || !destination) {
      toast.error("Please enter both pickup and destination");
      return;
    }

    // Validate that we have coordinates
    if (!pickupCoords?.lat || !pickupCoords?.lng) {
      toast.error("Could not determine pickup location. Please select from suggestions.");
      return;
    }

    if (!destCoords?.lat || !destCoords?.lng) {
      toast.error("Could not determine destination. Please select from suggestions.");
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
          lat: pickupCoords.lat,
          lng: pickupCoords.lng,
        },
        destination: {
          address: destination,
          lat: destCoords.lat,
          lng: destCoords.lng,
        },
      });
      
      // Log coordinates for debugging
      console.log('Request coordinates:', {
        pickup: { address: pickup, ...pickupCoords },
        destination: { address: destination, ...destCoords }
      });
      console.log('Response:', response.data);
      
      // Check if long trip requires confirmation
      if (response.data.requires_confirmation) {
        setPendingResults(response.data);
        setShowLongTripModal(true);
        setLoading(false);
        return;
      }
      
      setResults(response.data);
      setLastUpdated(new Date());
      setView("results");
    } catch (error) {
      console.error("Error comparing rides:", error);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Failed to compare rides. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Confirm long trip and proceed to results
  const confirmLongTrip = () => {
    if (pendingResults) {
      setResults(pendingResults);
      setLastUpdated(new Date());
      setPendingResults(null);
      setShowLongTripModal(false);
      setView("results");
    }
  };

  // Cancel long trip confirmation
  const cancelLongTrip = () => {
    setPendingResults(null);
    setShowLongTripModal(false);
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
      setLastUpdated(new Date());
      toast.success("Prices refreshed!");
    } catch (error) {
      console.error("Error refreshing prices:", error);
      toast.error("Failed to refresh prices.");
    } finally {
      setLoading(false);
    }
  };

  // Best option based on current conditions (not price)
  const getBestOption = () => {
    if (!results || !results.estimates) return null;
    const estimates = results.estimates;
    if (estimates.length < 2) return null;
    
    const uber = estimates[0];
    const lyft = estimates[1];
    
    // Compare by surge likelihood and availability
    const uberScore = (uber.surge_likelihood === "Low" ? 0 : uber.surge_likelihood === "Moderate" ? 1 : 2);
    const lyftScore = (lyft.surge_likelihood === "Low" ? 0 : lyft.surge_likelihood === "Moderate" ? 1 : 2);
    
    if (uberScore < lyftScore) return "Uber";
    if (lyftScore < uberScore) return "Lyft";
    
    // If tied, use wait time
    return uber.eta_minutes <= lyft.eta_minutes ? "Uber" : "Lyft";
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

  const openDeepLink = async (estimate) => {
    try {
      // Show helper card if ride is for someone else
      if (rideForOther && passengerName && passengerPhone) {
        setShowHelperCard(true);
      }
      
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isMobile = isIOS || isAndroid;
      
      console.log('Opening:', estimate.provider);
      console.log('Deep link:', estimate.deep_link);
      console.log('Web link:', estimate.web_link);
      
      // Show "Opening..." loader
      setOpeningApp(estimate.provider);
      
      if (isMobile) {
        // Mobile: App-first deep linking with fallback
        let appOpened = false;
        
        // Track visibility change to detect if app opened
        const handleVisibilityChange = () => {
          if (document.hidden) {
            appOpened = true;
            setOpeningApp(null);
          }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Try native app scheme first via window.location
        // This is more reliable than iframe for modern mobile browsers
        window.location.href = estimate.deep_link;
        
        // Short fallback timer - if app doesn't open within 1.5s, fall back to web
        const fallbackTimeout = setTimeout(() => {
          if (!appOpened && !document.hidden) {
            console.log(`${estimate.provider} app not detected, opening web link`);
            // Use location.replace to avoid back button issues
            window.location.href = estimate.web_link;
          }
          setOpeningApp(null);
        }, 1500);
        
        // Cleanup after 3 seconds
        setTimeout(() => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          clearTimeout(fallbackTimeout);
          setOpeningApp(null);
        }, 3000);
        
      } else {
        // Desktop: Open web version in new tab
        setOpeningApp(null);
        const newWindow = window.open(estimate.web_link, '_blank', 'noopener,noreferrer');
        
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          // Pop-up blocked - try clipboard fallback
          await copyRouteToClipboard();
        }
      }
    } catch (error) {
      console.error('Deep link error:', error);
      setOpeningApp(null);
      // Fallback: Copy route to clipboard
      await copyRouteToClipboard();
    }
  };

  const copyRouteToClipboard = async () => {
    try {
      const routeText = `Pickup: ${pickup}\nDestination: ${destination}`;
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(routeText);
        toast.success(`📋 Route copied! Paste into ${results?.estimates?.[0]?.provider || 'app'}.`, {
          duration: 4000
        });
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = routeText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('📋 Route copied to clipboard!', {
          duration: 4000
        });
      }
    } catch (error) {
      console.error('Clipboard error:', error);
      toast.error('Could not copy route. Please enter manually.');
    }
  };

  const copyRiderDetails = async () => {
    try {
      const details = `Your ride is being requested.
Pickup: ${pickup}
Destination: ${destination}${pickupNote ? `\nNote: ${pickupNote}` : ''}
I'll text you when the driver is assigned.`;
      
      await navigator.clipboard.writeText(details);
      toast.success('📋 Rider details copied!', { duration: 4000 });
    } catch (error) {
      toast.error('Could not copy details.');
    }
  };

  const sendSMSToPassenger = () => {
    const message = encodeURIComponent(`Your ride is being requested.
Pickup: ${pickup}
Destination: ${destination}${pickupNote ? `\nNote: ${pickupNote}` : ''}
I'll text you when the driver is assigned.`);
    
    window.location.href = `sms:${passengerPhone}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${message}`;
  };

  const saveFrequentRider = () => {
    if (!passengerName || !passengerPhone) return;
    
    const rider = {
      name: passengerName,
      phone: passengerPhone
    };
    
    const updated = [rider, ...frequentRiders.filter(r => r.phone !== passengerPhone)].slice(0, 5);
    setFrequentRiders(updated);
    localStorage.setItem('frequentRiders', JSON.stringify(updated));
    toast.success('Saved as frequent rider!');
  };

  const loadFrequentRider = (rider) => {
    setPassengerName(rider.name);
    setPassengerPhone(rider.phone);
  };

  // Logo component with glow effect
  const FairFareLogo = ({ size = 40, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" className={`fairfare-logo ${className}`}>
      <defs>
        <filter id="logoGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="logoGreenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FF88"/>
          <stop offset="100%" stopColor="#00CC6A"/>
        </linearGradient>
      </defs>
      <g filter="url(#logoGlow)">
        <path d="M16 8 L16 40" stroke="url(#logoGreenGradient)" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <path d="M16 10 Q28 10 34 10 Q38 10 38 16" stroke="url(#logoGreenGradient)" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <path d="M16 24 L30 24" stroke="url(#logoGreenGradient)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      </g>
      <circle cx="33" cy="24" r="2" fill="#00FF88"/>
      <circle cx="38" cy="24" r="1.5" fill="#00FF88" opacity="0.7"/>
    </svg>
  );

  return (
    <div className="app-container">
      <Toaster position="top-center" richColors />
      
      {view === "input" && (
        <div className="input-view">
          <div className="header">
            <div className="logo-header">
              <FairFareLogo size={48} />
              <h1 className="app-title">FairFare</h1>
            </div>
            <p className="app-subtitle">Compare rides instantly</p>
            {savingsData.ridesCompared > 0 && (
              <button 
                className="savings-badge-btn"
                onClick={() => setView("savings")}
                data-testid="open-savings-btn"
              >
                <DollarSign size={14} />
                <span>${savingsData.totalSaved.toFixed(2)} saved</span>
              </button>
            )}
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
              disabled={loading || !canCompare()}
              className="compare-button"
            >
              {loading ? "Comparing..." : canCompare() ? "Compare Rides" : getValidationMessage()}
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

          {/* App Footer */}
          <footer className="app-footer">
            <div className="footer-links">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </div>
            <p className="footer-copyright">© 2026 FairFare. All rights reserved.</p>
          </footer>
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
              <div className="logo-container">
                <FairFareLogo size={32} />
                <h2 className="results-title">FairFare</h2>
              </div>
              <p className="distance-text">
                {results.distance_miles} miles • {results.duration_minutes} min
              </p>
              {results.decision_hint && (
                <p className="decision-hint" data-testid="decision-hint">
                  {results.decision_hint}
                </p>
              )}
              {lastUpdated && (
                <p className="timestamp-text">
                  <Clock size={14} />
                  Updated {getTimeAgo(lastUpdated)}
                </p>
              )}
            </div>
          </div>

          {/* Recommendation Banner */}
          {results.recommendation && (
            <div className="recommendation-banner" data-testid="recommendation-banner">
              <Sparkles size={16} className="recommendation-icon" />
              <span>{results.recommendation}</span>
            </div>
          )}

          {/* FairFare Pick Card */}
          {getFairFarePick() && (
            <div className="fairfare-pick-card" data-testid="fairfare-pick">
              <div className="pick-header">
                <div className="pick-badge">
                  <Sparkles size={16} />
                  <span>FairFare Pick</span>
                </div>
                <div className="pick-subtitle">
                  <TrendingDown size={14} />
                  Best Right Now
                </div>
              </div>
              <p className="pick-recommendation">
                Recommended based on availability + arrival time
              </p>
              <div className="pick-content">
                <div className="pick-provider-info">
                  <h3 className="pick-provider">{getFairFarePick().provider}</h3>
                  <span className="pick-ride-type">{getFairFarePick().ride_type}</span>
                </div>
                <div className="pick-details">
                  <div className={`pick-demand-level ${getDemandLevelClass(getFairFarePick().price_level)}`}>
                    <span className="demand-value">{getFairFarePick().price_level}</span>
                  </div>
                  <div className="pick-wait">
                    <Clock size={18} />
                    <span>{getFairFarePick().eta_minutes} min</span>
                  </div>
                </div>
                <div className={`surge-indicator ${getSurgeClass(getFairFarePick().surge_likelihood)}`}>
                  Surge Likelihood: {getFairFarePick().surge_likelihood}
                </div>
                <p className="live-price-note">Live price shown in app</p>
                <button
                  data-testid="pick-open-btn"
                  onClick={() => openDeepLink(getFairFarePick())}
                  className="pick-open-button"
                  disabled={openingApp !== null}
                >
                  {openingApp === getFairFarePick().provider ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      Opening {getFairFarePick().provider}...
                    </>
                  ) : (
                    `Continue in ${getFairFarePick().provider}`
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="section-divider">
            <span>All Options</span>
          </div>

          <div className="estimates-list">
            {results.estimates.map((estimate, idx) => (
              <div
                key={idx}
                data-testid={`${estimate.provider.toLowerCase()}-card`}
                className={`estimate-card ${estimate.provider.toLowerCase()}`}
              >
                {getBestOption() === estimate.provider && (
                  <div className="best-option-badge" data-testid="best-option-badge">
                    Best Option
                  </div>
                )}
                <div className="estimate-header">
                  <h3 className="provider-name">{estimate.provider}</h3>
                  <span className="ride-type">{estimate.ride_type}</span>
                </div>

                <div className="estimate-details">
                  <div className={`detail-item demand-level-indicator ${getDemandLevelClass(estimate.price_level)}`}>
                    <span className="demand-level-badge">{estimate.price_level}</span>
                  </div>
                  <div className="detail-item">
                    <Clock size={16} className="clock-icon" />
                    <span className="wait-time">{estimate.eta_minutes} min away</span>
                  </div>
                </div>

                <div className={`surge-status ${getSurgeClass(estimate.surge_likelihood)}`}>
                  <span>Surge Likelihood: {estimate.surge_likelihood}</span>
                </div>
                
                <p className="live-price-note">Live price shown in app</p>

                <button
                  data-testid={`${estimate.provider.toLowerCase()}-open-btn`}
                  onClick={() => openDeepLink(estimate)}
                  className="open-app-button"
                  disabled={openingApp !== null}
                >
                  {openingApp === estimate.provider ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      Opening {estimate.provider}...
                    </>
                  ) : (
                    `Continue in ${estimate.provider}`
                  )}
                </button>
                <button
                  onClick={copyRouteToClipboard}
                  className="copy-route-button"
                  data-testid="copy-route-btn"
                >
                  📋 Copy Route
                </button>
              </div>
            ))}
          </div>

          <button
            data-testid="refresh-btn"
            onClick={refreshPrices}
            disabled={loading}
            className="refresh-button"
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      )}

      {/* Savings Dashboard View */}
      {view === "savings" && (
        <div className="savings-view" data-testid="savings-dashboard">
          <div className="savings-header">
            <button
              data-testid="savings-back-btn"
              onClick={() => setView("input")}
              className="back-button"
            >
              ← Back
            </button>
            <div className="savings-title-section">
              <FairFareLogo size={36} />
              <h2 className="savings-title">Your Savings</h2>
            </div>
          </div>

          <div className="savings-chart-container">
            <div className="savings-circle">
              <svg viewBox="0 0 120 120" className="savings-ring">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="rgba(0, 255, 136, 0.1)"
                  strokeWidth="12"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="url(#savingsGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(savingsData.ridesCompared * 10, 326)} 326`}
                  transform="rotate(-90 60 60)"
                  className="savings-progress"
                />
                <defs>
                  <linearGradient id="savingsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00FF88"/>
                    <stop offset="100%" stopColor="#00CC6A"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="savings-amount">
                <DollarSign size={24} className="savings-dollar-icon" />
                <span className="savings-value">{savingsData.totalSaved.toFixed(2)}</span>
              </div>
            </div>
            <p className="savings-label">Total Saved</p>
          </div>

          <div className="savings-stats">
            <div className="stat-card">
              <BarChart3 size={20} className="stat-icon" />
              <div className="stat-content">
                <span className="stat-value">{savingsData.ridesCompared}</span>
                <span className="stat-label">Rides Compared</span>
              </div>
            </div>
            <div className="stat-card">
              <DollarSign size={20} className="stat-icon" />
              <div className="stat-content">
                <span className="stat-value">${savingsData.avgSavedPerRide.toFixed(2)}</span>
                <span className="stat-label">Avg Saved per Ride</span>
              </div>
            </div>
            <div className="stat-card highlight">
              <TrendingDown size={20} className="stat-icon" />
              <div className="stat-content">
                <span className="stat-value">{savingsData.bestProvider}</span>
                <span className="stat-label">{savingsData.bestProviderPercent}% Best Deals</span>
              </div>
            </div>
          </div>

          <p className="savings-motivation">Keep saving with FairFare!</p>

          <button
            className="compare-button"
            onClick={() => setView("input")}
          >
            Compare New Ride
          </button>
        </div>
      )}

      {/* Long Trip Confirmation Modal */}
      {showLongTripModal && pendingResults && (
        <div className="modal-overlay" data-testid="long-trip-modal">
          <div className="modal-content">
            <div className="modal-icon">
              <AlertTriangle size={48} className="warning-icon" />
            </div>
            <h3 className="modal-title">Long Trip Detected</h3>
            <p className="modal-distance">
              {pendingResults.distance_miles} miles • ~{pendingResults.duration_minutes} min
            </p>
            <p className="modal-message">
              This looks like a long trip. Are you sure you want to continue?
            </p>
            <div className="modal-actions">
              <button
                data-testid="confirm-long-trip-btn"
                onClick={confirmLongTrip}
                className="modal-btn-primary"
              >
                Yes, Continue
              </button>
              <button
                data-testid="cancel-long-trip-btn"
                onClick={cancelLongTrip}
                className="modal-btn-secondary"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opening App Overlay */}
      {openingApp && (
        <div className="opening-app-overlay" data-testid="opening-app-overlay">
          <div className="opening-app-content">
            <Loader2 size={32} className="spinner" />
            <p>Opening {openingApp}...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

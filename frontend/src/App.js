import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import "@/App.css";
import axios from "axios";
import { MapPin, Navigation, Star, Clock, X, Sparkles, TrendingDown, AlertTriangle, Loader2, DollarSign, BarChart3, Share2, Bell, BellRing, Trash2, Store, Coffee, ShoppingBag, Hotel, Dumbbell, Fuel, Building2, Heart, Plus } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { Geolocation } from '@capacitor/geolocation';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [view, setView] = useState("input");
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  
  // UNIFIED LOCATION OBJECTS - Single source of truth
  // Each location MUST be: { lat: number, lng: number, address: string } or null
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [pickupResolving, setPickupResolving] = useState(false);
  const [destinationResolving, setDestinationResolving] = useState(false);
  
  // Legacy state kept for UI compatibility (derived from unified objects)
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null); // Error state for ride comparison
  const [savedRoute, setSavedRoute] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Long trip confirmation modal
  const [showLongTripModal, setShowLongTripModal] = useState(false);
  const [pendingResults, setPendingResults] = useState(null);
  
  // Handoff Modal State - crash-proof provider handoff
  const [handoffState, setHandoffState] = useState({
    isOpen: false,
    provider: null,        // "Uber" | "Lyft"
    status: 'idle',        // 'idle' | 'opening' | 'timeout' | 'error'
    deepLink: null,
    webLink: null,
    errorMessage: null,
    startTime: null
  });
  
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
  const [favoriteLocations, setFavoriteLocations] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [showLocationBanner, setShowLocationBanner] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState(null); // Store original GPS coords
  const [searchLoading, setSearchLoading] = useState(false); // Loading state for address search
  const [isOnline, setIsOnline] = useState(navigator.onLine); // Network status
  
  // Savings tracking
  const [savingsData, setSavingsData] = useState({
    totalSaved: 0,
    ridesCompared: 0,
    avgSavedPerRide: 0,
    bestProvider: 'Lyft',
    bestProviderPercent: 0
  });
  
  // Passenger context (new)
  const [riderType, setRiderType] = useState('me'); // 'me', 'child', 'family', 'guest'
  const [passengerCount, setPassengerCount] = useState(1);
  
  // Post-ride feedback (new)
  const [showPostRideFeedback, setShowPostRideFeedback] = useState(false);
  const [lastBookedRide, setLastBookedRide] = useState(null);
  
  // Place IDs for verified locations (Google Places)
  const [pickupPlaceId, setPickupPlaceId] = useState(null);
  const [destPlaceId, setDestPlaceId] = useState(null);
  
  // Share state
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const shareCanvasRef = useRef(null);
  
  // Price Watch / Alerts state
  const [watchedRoutes, setWatchedRoutes] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const priceCheckInterval = useRef(null);
  
  const pickupRef = useRef(null);
  const destRef = useRef(null);
  const autocompleteTimer = useRef(null);
  const updateTimer = useRef(null);

  // Splash screen timer
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setSplashFading(true);
    }, 1200); // Start fade after 1.2 seconds
    
    const hideTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1500); // Hide completely after 1.5 seconds
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

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
    
    // Load favorite locations
    const favorites = localStorage.getItem("favoriteLocations");
    if (favorites) {
      setFavoriteLocations(JSON.parse(favorites));
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
    
    // Load watched routes
    const watched = localStorage.getItem("watchedRoutes");
    if (watched) {
      setWatchedRoutes(JSON.parse(watched));
    }
    
    // Check notification permission
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
    
    // Network status listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online!');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Some features may not work.');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Silently try IP geolocation for location context (doesn't block UI)
    // This provides fallback location bias for autocomplete even if GPS fails
    const initIPGeolocation = async () => {
      try {
        const response = await axios.get(`${API}/ip-geolocation`, { timeout: 5000 });
        if (response.data.latitude && response.data.longitude && !userLocation.current) {
          userLocation.current = { lat: response.data.latitude, lng: response.data.longitude };
          console.log('[FairFare:Location] IP geolocation initialized:', {
            lat: response.data.latitude, 
            lng: response.data.longitude,
            city: response.data.city,
            region: response.data.region
          });
        }
      } catch (e) {
        console.warn('[FairFare:Location] IP geolocation init failed (non-critical):', e.message);
      }
    };
    initIPGeolocation();
    
    // Auto-detect location on load
    detectLocation();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-geocode addresses that don't have coordinates (handles app updates with cached data)
  useEffect(() => {
    const geocodeIfNeeded = async () => {
      let pickupGeocoded = false;
      let destGeocoded = false;
      
      // Skip auto-geocode for temporary status messages
      const isTemporaryPickup = pickup === "Detecting location..." || pickup === "Resolving address..." || pickupResolving;
      
      // Auto-geocode pickup if we have text but no coordinates
      if (pickup && pickup.length >= 5 && !pickupCoords?.lat && !isTemporaryPickup) {
        console.log('[FairFare] Auto-geocoding pickup:', pickup);
        try {
          const coords = await autoGeocode(pickup);
          if (coords) {
            setPickupCoords({ lat: coords.lat, lng: coords.lng });
            console.log('[FairFare] Pickup geocoded:', coords);
            pickupGeocoded = true;
          }
        } catch (err) {
          console.warn('[FairFare] Pickup geocode failed:', err.message);
        }
      }
      
      // Auto-geocode destination if we have text but no coordinates
      if (destination && destination.length >= 5 && !destCoords?.lat) {
        console.log('[FairFare] Auto-geocoding destination:', destination);
        try {
          const coords = await autoGeocode(destination);
          if (coords) {
            setDestCoords({ lat: coords.lat, lng: coords.lng });
            console.log('[FairFare] Destination geocoded:', coords);
            destGeocoded = true;
          }
        } catch (err) {
          console.warn('[FairFare] Destination geocode failed:', err.message);
        }
      }
      
      // Log status for debugging
      if (pickupGeocoded || destGeocoded) {
        console.log('[FairFare] Auto-geocode completed:', { pickupGeocoded, destGeocoded });
      }
    };
    
    // Debounce to avoid multiple geocode calls - longer delay for stability
    const timer = setTimeout(geocodeIfNeeded, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, destination, pickupCoords?.lat, destCoords?.lat]);

  // Price check simulation for watched routes
  useEffect(() => {
    if (watchedRoutes.length > 0) {
      // Check prices every 5 minutes (simulated)
      priceCheckInterval.current = setInterval(() => {
        checkWatchedRoutePrices();
      }, 300000); // 5 minutes
      
      return () => {
        if (priceCheckInterval.current) {
          clearInterval(priceCheckInterval.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedRoutes]);

  // Simulated price check function
  const checkWatchedRoutePrices = useCallback(() => {
    setWatchedRoutes(prevRoutes => {
      const updatedRoutes = prevRoutes.map(route => {
        // Simulate price fluctuation (±20%)
        const priceChange = (Math.random() - 0.5) * 0.4;
        const newPrice = route.currentPrice * (1 + priceChange);
        const percentChange = ((newPrice - route.originalPrice) / route.originalPrice) * 100;
        
        // Check if price dropped more than 15%
        if (percentChange < -15 && notificationsEnabled) {
          sendPriceDropNotification(route, newPrice, percentChange);
        }
        
        return {
          ...route,
          currentPrice: Math.round(newPrice * 100) / 100,
          lastChecked: new Date().toISOString(),
          percentChange: Math.round(percentChange)
        };
      });
      
      localStorage.setItem('watchedRoutes', JSON.stringify(updatedRoutes));
      return updatedRoutes;
    });
  }, [notificationsEnabled]);

  // Send push notification for price drop
  const sendPriceDropNotification = (route, newPrice, percentChange) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('🎉 Ride price dropped!', {
        body: `${route.pickup.substring(0, 20)}... to ${route.destination.substring(0, 20)}...\nNow $${newPrice.toFixed(2)} (${Math.abs(Math.round(percentChange))}% off)!\nCheck FairFare before it goes back up.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `price-drop-${route.id}`,
        requireInteraction: true
      });
      
      notification.onclick = () => {
        window.focus();
        setView('alerts');
        notification.close();
      };
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        toast.success('Notifications enabled! We\'ll alert you when prices drop.');
      } else {
        toast.error('Please enable notifications to get price drop alerts.');
      }
    } else {
      toast.error('Notifications not supported in this browser.');
    }
  };

  // Watch this route
  const watchRoute = () => {
    if (!pickup || !destination || !pickupCoords || !destCoords) {
      toast.error('Please complete a ride comparison first.');
      return;
    }
    
    // Check if already watching this route
    const existingRoute = watchedRoutes.find(r => 
      r.pickupCoords.lat === (pickupCoords?.lat || detectedCoords?.lat) &&
      r.pickupCoords.lng === (pickupCoords?.lng || detectedCoords?.lng) &&
      r.destCoords.lat === destCoords.lat &&
      r.destCoords.lng === destCoords.lng
    );
    
    if (existingRoute) {
      toast.info('You\'re already watching this route!');
      return;
    }
    
    // Simulated current price
    const basePrice = 15 + Math.random() * 15;
    
    const newRoute = {
      id: Date.now(),
      pickup,
      destination,
      pickupCoords: pickupCoords || detectedCoords,
      destCoords,
      originalPrice: Math.round(basePrice * 100) / 100,
      currentPrice: Math.round(basePrice * 100) / 100,
      bestProvider: 'Lyft',
      createdAt: new Date().toISOString(),
      lastChecked: new Date().toISOString(),
      percentChange: 0
    };
    
    const updatedRoutes = [...watchedRoutes, newRoute];
    setWatchedRoutes(updatedRoutes);
    localStorage.setItem('watchedRoutes', JSON.stringify(updatedRoutes));
    
    // Request notification permission if not already granted
    if (!notificationsEnabled && 'Notification' in window) {
      requestNotificationPermission();
    }
    
    toast.success('Route added to Price Alerts! We\'ll notify you when prices drop.');
  };

  // Remove watched route
  const removeWatchedRoute = (routeId) => {
    const updatedRoutes = watchedRoutes.filter(r => r.id !== routeId);
    setWatchedRoutes(updatedRoutes);
    localStorage.setItem('watchedRoutes', JSON.stringify(updatedRoutes));
    toast.success('Route removed from Price Alerts');
  };

  // Post-ride feedback: Show when user returns to app after booking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && lastBookedRide) {
        // Only show if they left within the last 10 minutes
        const timeSinceBooking = Date.now() - lastBookedRide.timestamp;
        if (timeSinceBooking < 10 * 60 * 1000 && timeSinceBooking > 3000) {
          setShowPostRideFeedback(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lastBookedRide]);

  // Handle post-ride feedback response
  const handlePostRideFeedback = (didBook) => {
    setShowPostRideFeedback(false);
    
    if (didBook && lastBookedRide) {
      // Track the booking
      const newSavings = {
        ...savingsData,
        ridesCompared: savingsData.ridesCompared + 1,
        totalSaved: savingsData.totalSaved + (lastBookedRide.estimatedSavings || 0)
      };
      setSavingsData(newSavings);
      localStorage.setItem('fairfareSavings', JSON.stringify(newSavings));
      
      toast.success(
        `Thanks for booking with ${lastBookedRide.provider}! You saved approximately $${lastBookedRide.estimatedSavings || 0} using FairFare.`,
        { duration: 5000 }
      );
    }
    
    setLastBookedRide(null);
  };

  // Load watched route for comparison
  const loadWatchedRoute = async (route) => {
    setPickup(route.pickup);
    setDestination(route.destination);
    
    // If we have saved coordinates, use them
    if (route.pickupCoords?.lat && route.pickupCoords?.lng) {
      setPickupCoords(route.pickupCoords);
    } else if (route.pickup) {
      // Auto-geocode if no coords saved
      const coords = await autoGeocode(route.pickup);
      if (coords) {
        setPickupCoords({ lat: coords.lat, lng: coords.lng });
      }
    }
    
    if (route.destCoords?.lat && route.destCoords?.lng) {
      setDestCoords(route.destCoords);
    } else if (route.destination) {
      // Auto-geocode if no coords saved
      const coords = await autoGeocode(route.destination);
      if (coords) {
        setDestCoords({ lat: coords.lat, lng: coords.lng });
      }
    }
    
    setView('input');
    toast.info('Route loaded! Tap "Find My Fare" to compare.');
  };

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

  // Add location to favorites
  const addToFavorites = (location, coords, label = null) => {
    if (!location || !coords) return;
    
    // Check if already in favorites
    const exists = favoriteLocations.some(fav => 
      fav.display_name === location || 
      (Math.abs(fav.lat - coords.lat) < 0.001 && Math.abs(fav.lng - (coords.lng || coords.lon)) < 0.001)
    );
    
    if (exists) {
      toast.info('This location is already in your favorites!');
      return;
    }
    
    const newFavorite = {
      id: Date.now(),
      display_name: location,
      label: label || location.split(',')[0], // Use first part as default label
      lat: coords.lat,
      lng: coords.lng || coords.lon,
      addedAt: new Date().toISOString()
    };
    
    const updated = [...favoriteLocations, newFavorite];
    setFavoriteLocations(updated);
    localStorage.setItem("favoriteLocations", JSON.stringify(updated));
    toast.success('Added to favorites!');
  };

  // Remove location from favorites
  const removeFromFavorites = (favoriteId) => {
    const updated = favoriteLocations.filter(fav => fav.id !== favoriteId);
    setFavoriteLocations(updated);
    localStorage.setItem("favoriteLocations", JSON.stringify(updated));
    toast.success('Removed from favorites');
  };

  // Check if a location is in favorites
  const isInFavorites = (location, coords) => {
    if (!location && !coords) return false;
    return favoriteLocations.some(fav => 
      fav.display_name === location || 
      (coords && Math.abs(fav.lat - coords.lat) < 0.001 && Math.abs(fav.lng - (coords.lng || coords.lon)) < 0.001)
    );
  };

  // Select a favorite location
  const selectFavorite = (favorite, isPickup) => {
    const coords = { lat: favorite.lat, lng: favorite.lng };
    
    if (isPickup) {
      setPickup(favorite.display_name);
      setPickupCoords(coords);
      setShowPickupSuggestions(false);
    } else {
      setDestination(favorite.display_name);
      setDestCoords(coords);
      setShowDestSuggestions(false);
    }
    
    toast.success(`Selected: ${favorite.label}`);
  };

  // Airport codes database for instant recognition
  const AIRPORT_CODES = {
    // Major US Airports
    'ATL': { name: 'Hartsfield-Jackson Atlanta International Airport', lat: 33.6407, lon: -84.4277, city: 'Atlanta, GA' },
    'LAX': { name: 'Los Angeles International Airport', lat: 33.9416, lon: -118.4085, city: 'Los Angeles, CA' },
    'ORD': { name: "O'Hare International Airport", lat: 41.9742, lon: -87.9073, city: 'Chicago, IL' },
    'DFW': { name: 'Dallas/Fort Worth International Airport', lat: 32.8998, lon: -97.0403, city: 'Dallas, TX' },
    'DEN': { name: 'Denver International Airport', lat: 39.8561, lon: -104.6737, city: 'Denver, CO' },
    'JFK': { name: 'John F. Kennedy International Airport', lat: 40.6413, lon: -73.7781, city: 'New York, NY' },
    'SFO': { name: 'San Francisco International Airport', lat: 37.6213, lon: -122.3790, city: 'San Francisco, CA' },
    'SEA': { name: 'Seattle-Tacoma International Airport', lat: 47.4502, lon: -122.3088, city: 'Seattle, WA' },
    'LAS': { name: 'Harry Reid International Airport', lat: 36.0840, lon: -115.1537, city: 'Las Vegas, NV' },
    'MCO': { name: 'Orlando International Airport', lat: 28.4312, lon: -81.3081, city: 'Orlando, FL' },
    'MIA': { name: 'Miami International Airport', lat: 25.7959, lon: -80.2870, city: 'Miami, FL' },
    'PHX': { name: 'Phoenix Sky Harbor International Airport', lat: 33.4373, lon: -112.0078, city: 'Phoenix, AZ' },
    'IAH': { name: 'George Bush Intercontinental Airport', lat: 29.9902, lon: -95.3368, city: 'Houston, TX' },
    'BOS': { name: 'Boston Logan International Airport', lat: 42.3656, lon: -71.0096, city: 'Boston, MA' },
    'MSP': { name: 'Minneapolis-Saint Paul International Airport', lat: 44.8848, lon: -93.2223, city: 'Minneapolis, MN' },
    'DTW': { name: 'Detroit Metropolitan Airport', lat: 42.2162, lon: -83.3554, city: 'Detroit, MI' },
    'EWR': { name: 'Newark Liberty International Airport', lat: 40.6895, lon: -74.1745, city: 'Newark, NJ' },
    'LGA': { name: 'LaGuardia Airport', lat: 40.7769, lon: -73.8740, city: 'New York, NY' },
    'PHL': { name: 'Philadelphia International Airport', lat: 39.8729, lon: -75.2437, city: 'Philadelphia, PA' },
    'CLT': { name: 'Charlotte Douglas International Airport', lat: 35.2140, lon: -80.9431, city: 'Charlotte, NC' },
    'SAN': { name: 'San Diego International Airport', lat: 32.7338, lon: -117.1933, city: 'San Diego, CA' },
    'TPA': { name: 'Tampa International Airport', lat: 27.9755, lon: -82.5332, city: 'Tampa, FL' },
    'PDX': { name: 'Portland International Airport', lat: 45.5898, lon: -122.5951, city: 'Portland, OR' },
    'STL': { name: 'St. Louis Lambert International Airport', lat: 38.7487, lon: -90.3700, city: 'St. Louis, MO' },
    'BWI': { name: 'Baltimore/Washington International Airport', lat: 39.1774, lon: -76.6684, city: 'Baltimore, MD' },
    'DCA': { name: 'Ronald Reagan Washington National Airport', lat: 38.8512, lon: -77.0402, city: 'Washington, DC' },
    'IAD': { name: 'Washington Dulles International Airport', lat: 38.9531, lon: -77.4565, city: 'Dulles, VA' },
    'SLC': { name: 'Salt Lake City International Airport', lat: 40.7899, lon: -111.9791, city: 'Salt Lake City, UT' },
    'AUS': { name: 'Austin-Bergstrom International Airport', lat: 30.1975, lon: -97.6664, city: 'Austin, TX' },
    'BNA': { name: 'Nashville International Airport', lat: 36.1263, lon: -86.6774, city: 'Nashville, TN' },
    'RDU': { name: 'Raleigh-Durham International Airport', lat: 35.8801, lon: -78.7880, city: 'Raleigh, NC' },
    'CHS': { name: 'Charleston International Airport', lat: 32.8986, lon: -80.0405, city: 'Charleston, SC' },
    'SAV': { name: 'Savannah/Hilton Head International Airport', lat: 32.1276, lon: -81.2021, city: 'Savannah, GA' },
    'JAX': { name: 'Jacksonville International Airport', lat: 30.4941, lon: -81.6879, city: 'Jacksonville, FL' },
    'MSY': { name: 'Louis Armstrong New Orleans International Airport', lat: 29.9934, lon: -90.2580, city: 'New Orleans, LA' },
    'OAK': { name: 'Oakland International Airport', lat: 37.7126, lon: -122.2197, city: 'Oakland, CA' },
    'SJC': { name: 'San Jose International Airport', lat: 37.3639, lon: -121.9289, city: 'San Jose, CA' },
    'SMF': { name: 'Sacramento International Airport', lat: 38.6954, lon: -121.5908, city: 'Sacramento, CA' },
    'HNL': { name: 'Daniel K. Inouye International Airport', lat: 21.3187, lon: -157.9225, city: 'Honolulu, HI' },
  };

  // Search cache for faster repeated queries
  const searchCache = useRef(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const userLocation = useRef(null); // Store user's current location for biasing

  // Session token for Google Places billing optimization
  const sessionToken = useRef(null);

  // ============================================================
  // UNIFIED LOCATION SYSTEM - Single Source of Truth
  // ============================================================
  
  // Validate a location object has all required fields
  const isValidLocation = (loc) => {
    if (!loc) return false;
    if (typeof loc.lat !== 'number' || isNaN(loc.lat)) return false;
    if (typeof loc.lng !== 'number' || isNaN(loc.lng)) return false;
    if (typeof loc.address !== 'string' || loc.address.length < 3) return false;
    return true;
  };

  // Set pickup with unified object - syncs to legacy state
  const setUnifiedPickup = (locationObj) => {
    console.log('[FairFare:Location] Setting unified pickup:', locationObj);
    
    if (locationObj && isValidLocation(locationObj)) {
      setPickupLocation(locationObj);
      setPickup(locationObj.address);
      setPickupCoords({ lat: locationObj.lat, lng: locationObj.lng });
      userLocation.current = { lat: locationObj.lat, lng: locationObj.lng };
    } else if (locationObj === null) {
      setPickupLocation(null);
      setPickup("");
      setPickupCoords(null);
    } else {
      console.warn('[FairFare:Location] Invalid pickup object:', locationObj);
    }
  };

  // Set destination with unified object - syncs to legacy state
  const setUnifiedDestination = (locationObj) => {
    console.log('[FairFare:Location] Setting unified destination:', locationObj);
    
    if (locationObj && isValidLocation(locationObj)) {
      setDestinationLocation(locationObj);
      setDestination(locationObj.address);
      setDestCoords({ lat: locationObj.lat, lng: locationObj.lng });
    } else if (locationObj === null) {
      setDestinationLocation(null);
      setDestination("");
      setDestCoords(null);
    } else {
      console.warn('[FairFare:Location] Invalid destination object:', locationObj);
    }
  };

  // Validate both locations before comparison/handoff
  const validateLocationsForHandoff = () => {
    const errors = [];
    
    if (!isValidLocation(pickupLocation)) {
      errors.push('Pickup location is incomplete');
      console.error('[FairFare:Location] Pickup validation failed:', pickupLocation);
    }
    
    if (!isValidLocation(destinationLocation)) {
      errors.push('Destination location is incomplete');
      console.error('[FairFare:Location] Destination validation failed:', destinationLocation);
    }
    
    if (errors.length > 0) {
      return { valid: false, errors };
    }
    
    console.log('[FairFare:Location] Validation passed:', {
      pickup: pickupLocation,
      destination: destinationLocation
    });
    
    return { valid: true, pickup: pickupLocation, destination: destinationLocation };
  };

  // Build deep links from validated location objects ONLY
  const buildValidatedDeepLinks = (pickup, dest) => {
    if (!isValidLocation(pickup) || !isValidLocation(dest)) {
      console.error('[FairFare:DeepLink] Cannot build links - invalid locations');
      return null;
    }

    const pickupLabel = encodeURIComponent(shortenAddress(pickup.address, 50));
    const destLabel = encodeURIComponent(shortenAddress(dest.address, 50));
    
    console.log('[FairFare:DeepLink] Building links with:', {
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      pickupAddress: pickup.address,
      destLat: dest.lat,
      destLng: dest.lng,
      destAddress: dest.address
    });

    return {
      uber: {
        deepLink: `uber://?action=setPickup&pickup[latitude]=${pickup.lat}&pickup[longitude]=${pickup.lng}&pickup[nickname]=${pickupLabel}&dropoff[latitude]=${dest.lat}&dropoff[longitude]=${dest.lng}&dropoff[nickname]=${destLabel}`,
        webLink: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${pickup.lat}&pickup[longitude]=${pickup.lng}&pickup[nickname]=${pickupLabel}&dropoff[latitude]=${dest.lat}&dropoff[longitude]=${dest.lng}&dropoff[nickname]=${destLabel}`
      },
      lyft: {
        deepLink: `lyft://ridetype?id=lyft&pickup[latitude]=${pickup.lat}&pickup[longitude]=${pickup.lng}&pickup[address]=${pickupLabel}&destination[latitude]=${dest.lat}&destination[longitude]=${dest.lng}&destination[address]=${destLabel}`,
        webLink: `https://ride.lyft.com/?pickup[latitude]=${pickup.lat}&pickup[longitude]=${pickup.lng}&pickup[address]=${pickupLabel}&destination[latitude]=${dest.lat}&destination[longitude]=${dest.lng}&destination[address]=${destLabel}`
      }
    };
  };

  // ============================================================
  // END UNIFIED LOCATION SYSTEM
  // ============================================================

  // Common POI keywords that should prioritize local results
  const POI_KEYWORDS = [
    // Grocery stores
    'publix', 'walmart', 'target', 'costco', 'kroger', 'safeway', 'whole foods', 'trader joes',
    'aldi', 'wegmans', 'heb', 'food lion', 'piggly wiggly', 'winn dixie', 'albertsons',
    // Fast food & restaurants
    'mcdonalds', 'starbucks', 'chick-fil-a', 'wendys', 'burger king', 'taco bell',
    'chipotle', 'subway', 'dunkin', 'panera', 'popeyes', 'arbys', 'sonic',
    'dominos', 'pizza hut', 'papa johns', 'little caesars', 'five guys', 'shake shack',
    'in-n-out', 'whataburger', 'cookout', 'wingstop', 'buffalo wild wings',
    // Pharmacies & health
    'cvs', 'walgreens', 'rite aid', 'urgent care', 'hospital', 'medical center', 'clinic',
    // Home improvement & retail
    'home depot', 'lowes', 'best buy', 'ikea', 'menards', 'ace hardware',
    'office depot', 'staples', 'michaels', 'hobby lobby', 'joann',
    // Outlet & shopping
    'tanger', 'outlet', 'mall', 'shopping center', 'plaza', 'galleria', 'outlets',
    'premium outlets', 'factory stores', 'marketplace',
    // Hotels & travel
    'hotel', 'hilton', 'marriott', 'hyatt', 'sheraton', 'westin', 'holiday inn',
    'hampton inn', 'courtyard', 'residence inn', 'fairfield', 'doubletree',
    'la quinta', 'motel 6', 'super 8', 'days inn', 'airport',
    // Fitness & recreation
    'gym', 'planet fitness', 'la fitness', 'ymca', 'equinox', 'orangetheory',
    'anytime fitness', 'gold gym', 'crossfit', '24 hour fitness',
    // Gas stations
    'shell', 'exxon', 'chevron', 'bp', 'sunoco', 'speedway', 'wawa', 'sheetz',
    'racetrac', 'quiktrip', 'circle k', 'murphy', '7-eleven', '7 eleven',
    // Entertainment
    'amc', 'regal', 'cinemark', 'movie theater', 'bowling', 'dave and busters',
    'topgolf', 'main event', 'round1', 'arcade',
    // Education & community
    'church', 'school', 'high school', 'middle school', 'elementary school', 'elementary',
    'university', 'college', 'library', 'community center', 'recreation center',
    'academy', 'campus', 'institute', 'preschool', 'daycare', 'stadium', 'arena', 'park',
    // Banks
    'bank of america', 'chase', 'wells fargo', 'pnc', 'td bank', 'citizens bank',
    'suntrust', 'truist', 'regions', 'fifth third', 'us bank',
    // Auto
    'autozone', 'advance auto', 'oreilly', 'jiffy lube', 'firestone', 'goodyear',
    'discount tire', 'pep boys', 'carmax'
  ];

  // Check if query is a POI search
  const isPOISearch = (query) => {
    const lowerQuery = query.toLowerCase();
    return POI_KEYWORDS.some(poi => lowerQuery.includes(poi));
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Update user location for biasing
  useEffect(() => {
    if (pickupCoords) {
      userLocation.current = pickupCoords;
    } else if (detectedCoords) {
      userLocation.current = detectedCoords;
    }
  }, [pickupCoords, detectedCoords]);

  // Check if query matches airport code
  const matchAirportCode = (query) => {
    const upperQuery = query.toUpperCase().trim();
    
    // Direct code match
    if (AIRPORT_CODES[upperQuery]) {
      const airport = AIRPORT_CODES[upperQuery];
      return [{ ...airport, code: upperQuery }];
    }
    
    // Partial matches and name matches
    const matches = [];
    for (const [code, airport] of Object.entries(AIRPORT_CODES)) {
      const searchStr = `${code} ${airport.name} ${airport.city}`.toLowerCase();
      if (searchStr.includes(query.toLowerCase())) {
        matches.push({ ...airport, code });
      }
    }
    
    // Sort airport matches by distance if user location is known
    if (userLocation.current && matches.length > 1) {
      matches.sort((a, b) => {
        const distA = calculateDistance(userLocation.current.lat, userLocation.current.lng, a.lat, a.lon);
        const distB = calculateDistance(userLocation.current.lat, userLocation.current.lng, b.lat, b.lon);
        return distA - distB;
      });
    }
    
    return matches.slice(0, 3);
  };

  // Format airport suggestion with distance
  const formatAirportSuggestion = (airport) => {
    let distance = null;
    if (userLocation.current) {
      distance = calculateDistance(
        userLocation.current.lat, userLocation.current.lng,
        airport.lat, airport.lon
      );
    }
    
    return {
      display_name: `${airport.name}, ${airport.city}`,
      lat: airport.lat,
      lon: airport.lon,
      isAirport: true,
      code: airport.code,
      distance
    };
  };

  // Format address nicely: "123 Main St, City, ST"
  const formatAddress = (item) => {
    if (!item.address) {
      // Fallback: take first 2 parts of display_name (usually street and city)
      const parts = item.display_name.split(', ');
      // Filter out county, region, country
      const filtered = parts.filter(p => {
        const lower = p.toLowerCase();
        return !lower.includes('county') && 
               !lower.includes('district') && 
               !lower.includes('region') &&
               !lower.includes('united states') &&
               !lower.includes('usa');
      });
      return filtered.slice(0, 3).join(', ');
    }
    
    const addr = item.address;
    
    // Street address (street_number + route)
    let streetLine = '';
    if (addr.house_number && addr.road) {
      streetLine = `${addr.house_number} ${addr.road}`;
    } else if (addr.road) {
      streetLine = addr.road;
    } else if (item.name && !item.name.includes('County')) {
      streetLine = item.name;
    }
    
    // City (prioritize city, then town, village, etc. - skip county/district)
    const city = addr.city || addr.town || addr.village || addr.hamlet || 
                 (addr.suburb && !addr.suburb.includes('County') ? addr.suburb : null) ||
                 addr.neighbourhood;
    
    // State abbreviation
    const state = addr.state ? getStateAbbreviation(addr.state) : '';
    
    // Postal code
    const postalCode = addr.postcode || '';
    
    // Build the formatted address
    // Format: Street, City, ST ZIP
    let result = streetLine;
    
    if (city && state && postalCode) {
      result += result ? `\n${city}, ${state} ${postalCode}` : `${city}, ${state} ${postalCode}`;
    } else if (city && state) {
      result += result ? `, ${city}, ${state}` : `${city}, ${state}`;
    } else if (city) {
      result += result ? `, ${city}` : city;
    }
    
    // If we still don't have a good result, fall back to cleaned display_name
    if (!result) {
      const parts = item.display_name.split(', ');
      const filtered = parts.filter(p => {
        const lower = p.toLowerCase();
        return !lower.includes('county') && 
               !lower.includes('district') && 
               !lower.includes('region') &&
               !lower.includes('united states');
      });
      return filtered.slice(0, 3).join(', ');
    }
    
    return result;
  };

  // Format address for single-line display (used in input fields)
  const formatAddressSingleLine = (item) => {
    if (!item.address) {
      const parts = item.display_name.split(', ');
      const filtered = parts.filter(p => {
        const lower = p.toLowerCase();
        return !lower.includes('county') && 
               !lower.includes('district') && 
               !lower.includes('region') &&
               !lower.includes('united states');
      });
      return filtered.slice(0, 3).join(', ');
    }
    
    const addr = item.address;
    const parts = [];
    
    // Street address
    if (addr.house_number && addr.road) {
      parts.push(`${addr.house_number} ${addr.road}`);
    } else if (addr.road) {
      parts.push(addr.road);
    } else if (item.name && !item.name.includes('County')) {
      parts.push(item.name);
    }
    
    // City
    const city = addr.city || addr.town || addr.village || addr.hamlet || 
                 (addr.suburb && !addr.suburb.includes('County') ? addr.suburb : null);
    if (city) parts.push(city);
    
    // State + ZIP
    const state = addr.state ? getStateAbbreviation(addr.state) : '';
    const postalCode = addr.postcode || '';
    
    if (state && postalCode) {
      parts.push(`${state} ${postalCode}`);
    } else if (state) {
      parts.push(state);
    }
    
    return parts.join(', ') || item.display_name.split(', ').slice(0, 3).join(', ');
  };

  // State name to abbreviation mapping
  const getStateAbbreviation = (stateName) => {
    const states = {
      'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
      'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
      'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
      'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
      'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
      'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
      'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
      'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
      'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
      'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
      'district of columbia': 'DC'
    };
    const lower = stateName.toLowerCase();
    return states[lower] || stateName;
  };

  // Smart address shortening for display
  const shortenAddress = (address, maxLength = 35) => {
    if (!address || address.length <= maxLength) return address;
    
    // Check for airport patterns
    const airportMatch = address.match(/(.+?(?:Airport|International|Regional))/i);
    if (airportMatch) {
      // Look for airport code in parentheses
      const codeMatch = address.match(/\(([A-Z]{3})\)/);
      if (codeMatch) {
        return `${airportMatch[1]} (${codeMatch[1]})`;
      }
      return airportMatch[1];
    }
    
    // For regular addresses, get first part before comma
    const parts = address.split(',');
    if (parts[0].length <= maxLength) {
      return parts.slice(0, 2).join(',').trim();
    }
    
    return address.substring(0, maxLength - 3) + '...';
  };

  // Build deep links with address labels for Uber/Lyft
  const buildProviderLinks = (pickupCoords, destCoords, pickupAddress, destAddress) => {
    const pickupLabel = encodeURIComponent(shortenAddress(pickupAddress, 50));
    const destLabel = encodeURIComponent(shortenAddress(destAddress, 50));
    
    return {
      uber: {
        // Uber deep link with labels
        deepLink: `uber://?action=setPickup&pickup[latitude]=${pickupCoords.lat}&pickup[longitude]=${pickupCoords.lng}&pickup[nickname]=${pickupLabel}&dropoff[latitude]=${destCoords.lat}&dropoff[longitude]=${destCoords.lng}&dropoff[nickname]=${destLabel}`,
        webLink: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${pickupCoords.lat}&pickup[longitude]=${pickupCoords.lng}&pickup[nickname]=${pickupLabel}&dropoff[latitude]=${destCoords.lat}&dropoff[longitude]=${destCoords.lng}&dropoff[nickname]=${destLabel}`
      },
      lyft: {
        // Lyft deep link with labels
        deepLink: `lyft://ridetype?id=lyft&pickup[latitude]=${pickupCoords.lat}&pickup[longitude]=${pickupCoords.lng}&pickup[address]=${pickupLabel}&destination[latitude]=${destCoords.lat}&destination[longitude]=${destCoords.lng}&destination[address]=${destLabel}`,
        webLink: `https://ride.lyft.com/?pickup[latitude]=${pickupCoords.lat}&pickup[longitude]=${pickupCoords.lng}&pickup[address]=${pickupLabel}&destination[latitude]=${destCoords.lat}&destination[longitude]=${destCoords.lng}&destination[address]=${destLabel}`
      }
    };
  };

  // Reverse geocode coordinates to address - ALWAYS returns a real address or fallback
  const reverseGeocode = async (lat, lng, retryCount = 0) => {
    console.log('[FairFare:Location] Reverse geocoding:', { lat, lng, attempt: retryCount + 1 });
    
    try {
      // Use Google Geocoding API via backend for accurate addresses
      const response = await axios.post(`${API}/places/reverse-geocode`, {
        latitude: lat,
        longitude: lng
      }, {
        timeout: 10000
      });
      
      console.log('[FairFare:Location] Reverse geocode response:', JSON.stringify(response.data));
      
      if (response.data && response.data.formatted_address && response.data.formatted_address.length > 5) {
        // Check it's not just coordinates
        if (!response.data.formatted_address.startsWith('Location (') && 
            !response.data.formatted_address.startsWith('Near ')) {
          console.log('[FairFare:Location] Reverse geocode success:', response.data.formatted_address);
          return response.data.formatted_address;
        }
      }
      
      // Check if we got any address components (city/neighborhood)
      if (response.data?.address_components) {
        const components = response.data.address_components;
        if (components.city && components.state) {
          const fallback = `${components.city}, ${components.state}`;
          console.log('[FairFare:Location] Using city fallback:', fallback);
          return fallback;
        }
        if (components.city) {
          console.log('[FairFare:Location] Using city only:', components.city);
          return components.city;
        }
      }
      
      // If no address returned but no error, retry once
      if (retryCount < 2) {
        console.log('[FairFare:Location] No address in response, retrying...');
        await new Promise(r => setTimeout(r, 500));
        return reverseGeocode(lat, lng, retryCount + 1);
      }
      
      // FALLBACK: Return formatted coordinates if all retries fail
      const fallbackAddress = `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      console.log('[FairFare:Location] All retries exhausted, using coordinate fallback:', fallbackAddress);
      return fallbackAddress;
      
    } catch (error) {
      console.error('[FairFare:Location] Reverse geocoding error:', error.message);
      
      // Retry on timeout/network error
      if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message?.includes('Network'))) {
        console.log('[FairFare:Location] Reverse geocode network error, retrying...');
        await new Promise(r => setTimeout(r, 1000));
        return reverseGeocode(lat, lng, retryCount + 1);
      }
      
      // FALLBACK: Return formatted coordinates instead of throwing
      // This ensures the user can always proceed with valid GPS coordinates
      const fallbackAddress = `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      console.log('[FairFare:Location] Using coordinate fallback:', fallbackAddress);
      return fallbackAddress;
    }
  };

  // Detect POI category for icon display
  const getPOICategory = (query) => {
    const lowerQuery = query.toLowerCase();
    
    // Category mappings for UI display
    const categories = {
      grocery: ['publix', 'walmart', 'target', 'costco', 'kroger', 'safeway', 'whole foods', 'trader joes', 'aldi', 'wegmans', 'heb', 'food lion', 'piggly wiggly', 'winn dixie', 'albertsons'],
      food: ['mcdonalds', 'starbucks', 'chick-fil-a', 'wendys', 'burger king', 'taco bell', 'chipotle', 'subway', 'dunkin', 'panera', 'popeyes', 'arbys', 'sonic', 'dominos', 'pizza hut', 'papa johns', 'little caesars', 'five guys', 'shake shack', 'in-n-out', 'whataburger', 'cookout', 'wingstop', 'buffalo wild wings'],
      pharmacy: ['cvs', 'walgreens', 'rite aid'],
      medical: ['urgent care', 'hospital', 'medical center', 'clinic'],
      retail: ['home depot', 'lowes', 'best buy', 'ikea', 'menards', 'ace hardware', 'office depot', 'staples', 'michaels', 'hobby lobby', 'joann'],
      shopping: ['tanger', 'outlet', 'mall', 'shopping center', 'plaza', 'galleria', 'outlets', 'premium outlets', 'factory stores', 'marketplace'],
      hotel: ['hotel', 'hilton', 'marriott', 'hyatt', 'sheraton', 'westin', 'holiday inn', 'hampton inn', 'courtyard', 'residence inn', 'fairfield', 'doubletree', 'la quinta', 'motel 6', 'super 8', 'days inn'],
      fitness: ['gym', 'planet fitness', 'la fitness', 'ymca', 'equinox', 'orangetheory', 'anytime fitness', 'gold gym', 'crossfit', '24 hour fitness'],
      gas: ['shell', 'exxon', 'chevron', 'bp', 'sunoco', 'speedway', 'wawa', 'sheetz', 'racetrac', 'quiktrip', 'circle k', 'murphy', '7-eleven', '7 eleven'],
      entertainment: ['amc', 'regal', 'cinemark', 'movie theater', 'bowling', 'dave and busters', 'topgolf', 'main event', 'round1', 'arcade'],
      bank: ['bank of america', 'chase', 'wells fargo', 'pnc', 'td bank', 'citizens bank', 'suntrust', 'truist', 'regions', 'fifth third', 'us bank'],
      auto: ['autozone', 'advance auto', 'oreilly', 'jiffy lube', 'firestone', 'goodyear', 'discount tire', 'pep boys', 'carmax']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => lowerQuery.includes(kw))) {
        return category;
      }
    }
    return null;
  };

  // Format distance for display
  const formatDistance = (miles) => {
    if (miles === null || miles === undefined) return null;
    if (miles < 0.1) return '< 0.1 mi';
    if (miles < 10) return `${miles.toFixed(1)} mi`;
    return `${Math.round(miles)} mi`;
  };

  // Search for address suggestions using Google Places API
  const searchAddress = async (query, isPickup, retryCount = 0) => {
    console.log('[FairFare:SEARCH] searchAddress called:', { query, isPickup, retryCount });
    
    if (!query || query.length < 2) {
      console.log('[FairFare:SEARCH] Query too short, clearing suggestions');
      if (isPickup) setPickupSuggestions([]);
      else setDestSuggestions([]);
      setSearchLoading(false);
      return;
    }

    // Check network status
    if (!navigator.onLine) {
      console.warn('[FairFare:SEARCH] Search skipped - offline');
      return;
    }

    const startTime = Date.now();
    
    // Check for airport code matches first (instant)
    const airportMatches = matchAirportCode(query);
    const airportSuggestions = airportMatches.map(formatAirportSuggestion);

    // Show airport matches immediately
    if (airportSuggestions.length > 0) {
      if (isPickup) setPickupSuggestions(airportSuggestions);
      else setDestSuggestions(airportSuggestions);
    }

    // Build cache key with location context
    const locationKey = userLocation.current 
      ? `${userLocation.current.lat.toFixed(2)},${userLocation.current.lng.toFixed(2)}`
      : 'default';
    const cacheKey = `google_${query.toLowerCase().trim()}_${locationKey}`;
    
    // Check cache
    const cached = searchCache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      const combined = [...airportSuggestions, ...cached.results].slice(0, 6);
      if (isPickup) setPickupSuggestions(combined);
      else setDestSuggestions(combined);
      console.log(`[FairFare] Search completed in ${Date.now() - startTime}ms (cached)`);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    
    try {
      // Call our backend Google Places API proxy
      const requestBody = {
        input: query,
        session_token: sessionToken.current || undefined
      };
      
      // Add location bias if available
      if (userLocation.current) {
        requestBody.location_lat = userLocation.current.lat;
        requestBody.location_lng = userLocation.current.lng;
      }

      const response = await axios.post(`${API}/places/autocomplete`, requestBody, {
        timeout: 8000
      });

      // Store session token for billing optimization
      if (response.data.session_token && !sessionToken.current) {
        sessionToken.current = response.data.session_token;
      }

      const suggestions = response.data.suggestions.map(suggestion => {
        const distance_miles = suggestion.distance_miles || null;
        let formattedDistance = null;
        if (distance_miles !== null) {
          if (distance_miles < 0.1) {
            formattedDistance = "< 0.1 mi";
          } else if (distance_miles < 10) {
            formattedDistance = `${distance_miles.toFixed(1)} mi`;
          } else {
            formattedDistance = `${Math.round(distance_miles)} mi`;
          }
        }
        
        return {
          place_id: suggestion.place_id,
          display_name: suggestion.full_address,
          streetLine: suggestion.main_text,
          locationLine: suggestion.secondary_text,
          placeName: suggestion.types.includes('establishment') ? suggestion.main_text : null,
          businessName: suggestion.types.includes('establishment') ? suggestion.main_text : null,
          lat: suggestion.latitude || null,
          lon: suggestion.longitude || null,
          isPOI: suggestion.types.includes('establishment') || suggestion.types.includes('point_of_interest'),
          isVerified: true, // Google Places results are verified
          types: suggestion.types,
          distance_miles: distance_miles,
          formattedDistance: formattedDistance
        };
      });

      // Cache the results
      searchCache.current.set(cacheKey, {
        results: suggestions,
        timestamp: Date.now()
      });

      // Combine airport matches with search results
      const combined = [...airportSuggestions, ...suggestions].slice(0, 6);

      if (isPickup) {
        setPickupSuggestions(combined);
      } else {
        setDestSuggestions(combined);
      }
      
      console.log(`[FairFare:SEARCH] Google Places search completed in ${Date.now() - startTime}ms (${suggestions.length} results)`);
      
    } catch (error) {
      console.error("[FairFare:SEARCH] Google Places search error:", {
        query,
        error: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Show user-friendly message on network errors
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message?.includes('Network')) {
        toast.error("Unable to search addresses. Check your connection.", { duration: 3000 });
      }
      
      // Fallback: Show airport matches on error
      if (airportSuggestions.length > 0) {
        if (isPickup) setPickupSuggestions(airportSuggestions);
        else setDestSuggestions(airportSuggestions);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const detectLocation = async () => {
    // Use Capacitor Geolocation on native, fallback to browser API on web
    const isNative = Capacitor.isNativePlatform();
    
    // Set resolving state - UI should show loading indicator
    setPickupResolving(true);
    setPickup("Detecting location...");
    
    try {
      let lat, lng;
      
      if (isNative) {
        // Request permission explicitly on native
        const permStatus = await Geolocation.checkPermissions();
        console.log('[FairFare:Location] Permission status:', permStatus);
        
        if (permStatus.location === 'prompt' || permStatus.location === 'prompt-with-rationale') {
          const requested = await Geolocation.requestPermissions();
          console.log('[FairFare:Location] Permission requested result:', requested);
          if (requested.location !== 'granted') {
            toast.error("Location permission required to detect your pickup", { duration: 4000 });
            setPickupResolving(false);
            setPickup("");
            return;
          }
        } else if (permStatus.location === 'denied') {
          toast.error("Location permission denied. Please enable in Settings.", { duration: 4000 });
          setPickupResolving(false);
          setPickup("");
          return;
        }
        
        // Get position using Capacitor
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        console.log('[FairFare:Location] Got native GPS coordinates:', { lat, lng });
        
        // CRITICAL: Set userLocation.current immediately for location-biased search
        userLocation.current = { lat, lng };
        
      } else if (navigator.geolocation) {
        // Web browser fallback
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000
          });
        });
        
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        console.log('[FairFare:Location] Got browser GPS coordinates:', { lat, lng });
        
        // CRITICAL: Set userLocation.current immediately for location-biased search
        userLocation.current = { lat, lng };
        
      } else {
        throw new Error("Geolocation not available");
      }
      
      // Now reverse geocode to get the address from the EXACT coordinates
      setPickup("Resolving address...");
      const address = await reverseGeocode(lat, lng);
      
      // Validate we got a real address
      if (!address || address.length < 5) {
        throw new Error("Could not resolve address from coordinates");
      }
      
      console.log('[FairFare:Location] Reverse geocoded address:', address);
      
      // Create unified location object and set it
      const unifiedPickup = {
        lat: lat,
        lng: lng,
        address: address
      };
      
      setUnifiedPickup(unifiedPickup);
      setDetectedCoords({ lat, lng });
      
      // Show success banner
      setShowLocationBanner(true);
      setTimeout(() => setShowLocationBanner(false), 3000);
      
      console.log('[FairFare:Location] Pickup set successfully:', unifiedPickup);
      
    } catch (error) {
      console.error('[FairFare:Location] Detection error:', error);
      
      // FALLBACK: Try IP-based geolocation for location-biased search
      // This won't set the pickup address, but will help autocomplete show nearby results
      try {
        console.log('[FairFare:Location] Attempting IP-based geolocation fallback...');
        const ipGeoResponse = await axios.get(`${API}/ip-geolocation`, { timeout: 5000 });
        if (ipGeoResponse.data.latitude && ipGeoResponse.data.longitude) {
          userLocation.current = { 
            lat: ipGeoResponse.data.latitude, 
            lng: ipGeoResponse.data.longitude 
          };
          console.log('[FairFare:Location] IP geolocation fallback successful:', {
            lat: ipGeoResponse.data.latitude,
            lng: ipGeoResponse.data.longitude,
            city: ipGeoResponse.data.city,
            region: ipGeoResponse.data.region
          });
        }
      } catch (ipError) {
        console.warn('[FairFare:Location] IP geolocation fallback failed:', ipError.message);
      }
      
      if (error.code === 1) { // PERMISSION_DENIED
        toast.error("Location permission denied", { duration: 3000 });
      } else {
        toast.error("Could not detect location. Please enter address manually.", { duration: 3000 });
      }
      setPickup("");
    } finally {
      setPickupResolving(false);
    }
  };

  const handlePickupChange = (value) => {
    console.log('[FairFare:INPUT] handlePickupChange called with value:', value);
    setPickup(value);
    // Keep using detected GPS coords if they exist and user is just editing the displayed address
    // Only clear coords if user completely clears the field
    if (!value) {
      setPickupCoords(null);
    } else if (!detectedCoords) {
      // Only clear coords if there were no GPS-detected coordinates
      setPickupCoords(null);
    }
    // Note: Keep detectedCoords so we use GPS position even if address text is edited
    
    // Show suggestions dropdown
    if (value.length >= 2) {
      console.log('[FairFare:INPUT] Showing pickup suggestions dropdown, triggering search');
      setShowPickupSuggestions(true);
    }
    
    // Fast debounce for autocomplete (150ms for responsiveness)
    if (autocompleteTimer.current) {
      clearTimeout(autocompleteTimer.current);
    }
    
    autocompleteTimer.current = setTimeout(() => {
      console.log('[FairFare:INPUT] Debounce complete, calling searchAddress for:', value);
      searchAddress(value, true);
    }, 150);
  };

  const handleDestChange = (value) => {
    setDestination(value);
    setDestCoords(null);
    
    // Show suggestions dropdown
    if (value.length >= 2) {
      setShowDestSuggestions(true);
    }
    
    // Fast debounce for autocomplete (150ms for responsiveness)
    if (autocompleteTimer.current) {
      clearTimeout(autocompleteTimer.current);
    }
    
    autocompleteTimer.current = setTimeout(() => {
      searchAddress(value, false);
    }, 150);
  };

  // Fetch place details from Google Places API
  const fetchPlaceDetails = async (placeId) => {
    try {
      const response = await axios.post(`${API}/places/details`, {
        place_id: placeId,
        session_token: sessionToken.current
      });
      
      // Clear session token after use (for billing optimization)
      sessionToken.current = null;
      
      return {
        lat: response.data.latitude,
        lng: response.data.longitude,
        formatted_address: response.data.formatted_address,
        place_id: response.data.place_id
      };
    } catch (error) {
      console.error('[FairFare] Place details error:', error);
      return null;
    }
  };

  const selectSuggestion = async (suggestion, isPickup) => {
    console.log('[FairFare:Location] Selecting suggestion:', { suggestion, isPickup });
    
    // Handle coordinate fetching FIRST - this is critical for accuracy
    let coords = null;
    let displayAddress = '';
    
    if (suggestion.lat && suggestion.lon) {
      // Already have coordinates (airport or cached result)
      coords = { lat: suggestion.lat, lng: suggestion.lon };
      // Use the display name for airports
      displayAddress = suggestion.display_name || suggestion.streetLine || '';
    } else if (suggestion.place_id) {
      // Google Places suggestion - fetch EXACT details from Google
      toast.info('Getting location details...', { duration: 1000 });
      const placeDetails = await fetchPlaceDetails(suggestion.place_id);
      if (placeDetails) {
        coords = { lat: placeDetails.lat, lng: placeDetails.lng };
        // CRITICAL: Use EXACT formatted address from Google - no modifications
        displayAddress = placeDetails.formatted_address;
        console.log('[FairFare:Location] Google Place details:', { coords, displayAddress });
      } else {
        toast.error('Could not get location details. Please try another address.');
        return;
      }
    } else {
      // Fallback for suggestions without place_id (shouldn't happen with Google Places)
      displayAddress = suggestion.display_name || suggestion.streetLine || '';
      toast.error('Please select a verified address from the suggestions.');
      return;
    }
    
    if (!coords || !displayAddress) {
      toast.error('Could not verify location. Please try another address.');
      return;
    }
    
    // Create unified location object
    const unifiedLocation = {
      lat: coords.lat,
      lng: coords.lng,
      address: displayAddress
    };
    
    console.log('[FairFare:Location] Created unified location:', unifiedLocation);
    
    if (isPickup) {
      // Set unified pickup
      setUnifiedPickup(unifiedLocation);
      setPickupPlaceId(suggestion.place_id || null);
      setDetectedCoords(null);
      setPickupSuggestions([]);
      setShowPickupSuggestions(false);
      saveToRecent(displayAddress);
      
      if (suggestion.isAirport) {
        toast.success(`✈️ ${suggestion.code} selected`, { duration: 2000 });
      }
      
      console.log('[FairFare:Location] Pickup LOCKED:', unifiedLocation);
    } else {
      // Set unified destination
      setUnifiedDestination(unifiedLocation);
      setDestPlaceId(suggestion.place_id || null);
      setDestSuggestions([]);
      setShowDestSuggestions(false);
      saveToRecent(displayAddress);
      
      if (suggestion.isAirport) {
        toast.success(`✈️ ${suggestion.code} selected`, { duration: 2000 });
      }
      
      console.log('[FairFare:Location] Destination LOCKED:', unifiedLocation);
    }
  };

  // Geocode an address to get coordinates (using Google Geocoding API)
  const geocodeAddress = async (address) => {
    try {
      const requestBody = { address };
      
      // Add location bias if available
      if (userLocation.current?.lat && userLocation.current?.lng) {
        requestBody.location_lat = userLocation.current.lat;
        requestBody.location_lng = userLocation.current.lng;
      }
      
      const response = await axios.post(`${API}/places/geocode`, requestBody, {
        timeout: 10000
      });
      
      if (response.data) {
        return {
          lat: response.data.latitude,
          lng: response.data.longitude,
          formatted_address: response.data.formatted_address
        };
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  const selectRecentLocation = async (location, isPickup) => {
    console.log('[FairFare:Location] Selecting recent location:', { location, isPickup });
    
    // Always geocode to get validated coordinates
    toast.info("Getting location coordinates...");
    const coords = await geocodeAddress(location);
    
    if (!coords) {
      toast.error("Could not find coordinates. Please select from suggestions.");
      return;
    }
    
    // Create unified location object
    const unifiedLocation = {
      lat: coords.lat,
      lng: coords.lng,
      address: coords.formatted_address || location
    };
    
    console.log('[FairFare:Location] Recent location geocoded:', unifiedLocation);
    
    if (isPickup) {
      setUnifiedPickup(unifiedLocation);
      setShowPickupSuggestions(false);
      console.log('[FairFare:Location] Pickup set from recent:', unifiedLocation);
    } else {
      setUnifiedDestination(unifiedLocation);
      setShowDestSuggestions(false);
      console.log('[FairFare:Location] Destination set from recent:', unifiedLocation);
    }
  };

  // Check if we have valid coordinates for comparison
  const canCompare = () => {
    // Allow comparison if we have addresses (coords will be auto-geocoded)
    const hasPickupText = pickup && pickup.length >= 5;
    const hasDestText = destination && destination.length >= 5;
    const hasPickupCoords = pickupCoords?.lat && pickupCoords?.lng;
    const hasDestCoords = destCoords?.lat && destCoords?.lng;
    
    // Can compare if: both addresses filled AND both have coords
    // OR both addresses are long enough (will auto-geocode on submit)
    return (hasPickupText && hasDestText) && (hasPickupCoords && hasDestCoords);
  };
  
  // Check if we can attempt comparison (addresses exist, will geocode if needed)
  const canAttemptCompare = () => {
    const hasPickupText = pickup && pickup.length >= 5;
    const hasDestText = destination && destination.length >= 5;
    return hasPickupText && hasDestText;
  };

  // Get validation message for the compare button
  const getValidationMessage = () => {
    if (!pickup) return "Enter pickup location";
    if (!destination) return "Enter destination";
    if (pickup.length < 5) return "Enter full pickup address";
    if (destination.length < 5) return "Enter full destination";
    if (!pickupCoords?.lat || !destCoords?.lat) return "Finding locations...";
    return null;
  };

  // Auto-geocode an address string using Google Geocoding API
  const autoGeocode = async (address) => {
    try {
      const requestBody = { address };
      
      // Add location bias if we have user location
      if (userLocation.current?.lat && userLocation.current?.lng) {
        requestBody.location_lat = userLocation.current.lat;
        requestBody.location_lng = userLocation.current.lng;
      }
      
      const response = await axios.post(`${API}/places/geocode`, requestBody, {
        timeout: 10000
      });
      
      if (response.data) {
        console.log('[FairFare] Auto-geocode success:', {
          query: address,
          result: response.data.formatted_address,
          lat: response.data.latitude,
          lng: response.data.longitude
        });
        
        return {
          lat: response.data.latitude,
          lng: response.data.longitude,
          display_name: response.data.formatted_address
        };
      }
      
      return null;
    } catch (error) {
      console.error('[FairFare] Auto-geocode error:', error.message || error);
      return null;
    }
  };

  const compareRides = async () => {
    // Clear previous error state
    setError(null);
    
    console.log('[FairFare:Location] Starting comparison with:', {
      pickupLocation,
      destinationLocation,
      legacyPickup: pickup,
      legacyDestination: destination
    });
    
    // VALIDATION: Both locations must be valid unified objects
    const validation = validateLocationsForHandoff();
    
    if (!validation.valid) {
      // Try to auto-resolve from legacy state if unified objects are missing
      let needsPickupGeocode = !isValidLocation(pickupLocation);
      let needsDestGeocode = !isValidLocation(destinationLocation);
      
      if (needsPickupGeocode && pickup && pickup.length > 3) {
        console.log('[FairFare:Location] Auto-geocoding pickup from text:', pickup);
        setLoading(true);
        toast.info("Finding your pickup location...", { duration: 2000 });
        const geocoded = await autoGeocode(pickup);
        if (geocoded) {
          const unifiedPickup = {
            lat: geocoded.lat,
            lng: geocoded.lng,
            address: geocoded.display_name || pickup
          };
          setUnifiedPickup(unifiedPickup);
          needsPickupGeocode = false;
        }
      }
      
      if (needsDestGeocode && destination && destination.length > 3) {
        console.log('[FairFare:Location] Auto-geocoding destination from text:', destination);
        setLoading(true);
        toast.info("Finding your destination...", { duration: 2000 });
        const geocoded = await autoGeocode(destination);
        if (geocoded) {
          const unifiedDest = {
            lat: geocoded.lat,
            lng: geocoded.lng,
            address: geocoded.display_name || destination
          };
          setUnifiedDestination(unifiedDest);
          needsDestGeocode = false;
        }
      }
      
      // Re-validate after geocoding attempts
      if (needsPickupGeocode || needsDestGeocode) {
        setLoading(false);
        const errorMsg = needsPickupGeocode 
          ? "Please select a pickup location from the suggestions"
          : "Please select a destination from the suggestions";
        setError({ type: 'validation', message: errorMsg });
        toast.error(errorMsg);
        return;
      }
    }

    setLoading(true);
    
    // ONLY use validated unified location objects - never fall back to legacy pickupCoords/destCoords
    const finalPickup = pickupLocation;
    const finalDest = destinationLocation;

    // Final validation check - locations MUST be set via unified setters
    if (!isValidLocation(finalPickup) || !isValidLocation(finalDest)) {
      setLoading(false);
      const errorMsg = "Location data is incomplete. Please re-select your addresses.";
      setError({ type: 'validation', message: errorMsg });
      toast.error(errorMsg);
      return;
    }

    // Save locations to recent
    saveToRecent(finalPickup.address);
    saveToRecent(finalDest.address);
    
    // Log the validated request
    console.log('[FairFare:Location] Validated locations for comparison:', {
      pickup: finalPickup,
      destination: finalDest,
      timestamp: new Date().toISOString()
    });
    
    // Helper function to generate fallback estimates when API is unreachable
    const generateFallbackEstimates = () => {
      const distance = calculateDistance(
        finalPickup.lat, finalPickup.lng,
        finalDest.lat, finalDest.lng
      ) || 10;
      const duration = Math.round(distance * 1.8); // ~1.8 min per mile
      
      // Build proper deep links with VALIDATED location objects
      const links = buildValidatedDeepLinks(finalPickup, finalDest);
      
      if (!links) {
        console.error('[FairFare:DeepLink] Failed to build deep links');
        return null;
      }
      
      console.log('[FairFare:DeepLink] Generated fallback deep links:', {
        uberDeepLink: links.uber.deepLink.substring(0, 100) + '...',
        lyftDeepLink: links.lyft.deepLink.substring(0, 100) + '...'
      });
      
      return {
        estimates: [
          {
            provider: 'Uber',
            ride_type: 'UberX',
            eta_minutes: Math.floor(Math.random() * 5) + 2,
            price_level: 'Normal demand',
            surge_likelihood: 'Low',
            availability: 'Good',
            deep_link: links.uber.deepLink,
            web_link: links.uber.webLink
          },
          {
            provider: 'Lyft',
            ride_type: 'Standard',
            eta_minutes: Math.floor(Math.random() * 5) + 3,
            price_level: 'Normal demand',
            surge_likelihood: 'Low',
            availability: 'Good',
            deep_link: links.lyft.deepLink,
            web_link: links.lyft.webLink
          }
        ],
        distance_miles: Math.round(distance * 100) / 100,
        duration_minutes: duration,
        pickup_coords: finalPickup,
        destination_coords: finalDest,
        route_status: 'valid',
        recommendation: 'Compare prices in both apps for the best deal.',
        requires_confirmation: false,
        is_fallback: true // Flag to indicate this is offline/fallback data
      };
    };
    
    try {
      // Use validated unified location objects
      const requestPayload = {
        pickup: {
          address: finalPickup.address,
          lat: finalPickup.lat,
          lng: finalPickup.lng,
        },
        destination: {
          address: finalDest.address,
          lat: finalDest.lat,
          lng: finalDest.lng,
        },
      };
      
      console.log('[FairFare:Location] Sending compare request with validated data:', JSON.stringify(requestPayload));
      
      let response;
      try {
        response = await axios.post(`${API}/compare-rides`, requestPayload, {
          timeout: 10000 // 10 second timeout
        });
      } catch (networkError) {
        // Network failed - use fallback estimates
        console.warn('[FairFare] API unreachable, using fallback estimates:', networkError.message);
        const fallbackData = generateFallbackEstimates();
        setResults(fallbackData);
        setLastUpdated(new Date());
        setView("results");
        setLoading(false);
        toast.info("Using estimated data. Tap provider to see live prices.", { duration: 4000 });
        return;
      }
      
      // Log successful response
      console.log('[FairFare] API Response:', {
        status: response.status,
        hasData: !!response.data,
        estimates: response.data?.estimates?.length || 0,
        distance: response.data?.distance_miles,
        duration: response.data?.duration_minutes,
        rawResponse: JSON.stringify(response.data).substring(0, 500)
      });
      
      // Validate response data
      if (!response.data) {
        console.warn('[FairFare] Empty response, using fallback');
        const fallbackData = generateFallbackEstimates();
        setResults(fallbackData);
        setLastUpdated(new Date());
        setView("results");
        setLoading(false);
        toast.info("Using estimated data. Tap provider to see live prices.", { duration: 4000 });
        return;
      }
      
      if (!response.data.estimates || !Array.isArray(response.data.estimates)) {
        console.warn('[FairFare] Invalid response format, using fallback:', JSON.stringify(response.data).substring(0, 200));
        const fallbackData = generateFallbackEstimates();
        setResults(fallbackData);
        setLastUpdated(new Date());
        setView("results");
        setLoading(false);
        toast.info("Using estimated data. Tap provider to see live prices.", { duration: 4000 });
        return;
      }
      
      if (response.data.estimates.length === 0) {
        console.warn('[FairFare] No estimates returned, using fallback');
        const fallbackData = generateFallbackEstimates();
        setResults(fallbackData);
        setLastUpdated(new Date());
        setView("results");
        setLoading(false);
        toast.info("Using estimated data. Tap provider to see live prices.", { duration: 4000 });
        return;
      }
      
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
      // Comprehensive error logging
      console.error('[FairFare] Ride Comparison Error:', {
        type: error.name,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        serverError: error.response?.data?.detail,
        pickup: { address: pickup, coords: finalPickupCoords },
        destination: { address: destination, coords: destCoords },
        timestamp: new Date().toISOString()
      });
      
      // Determine error type and set appropriate message
      let errorMessage = "Unable to fetch ride prices right now. Please try again.";
      let errorType = 'api';
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = "Request timed out. Please check your connection and try again.";
        errorType = 'timeout';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.detail || "Invalid route. Please check your locations.";
        errorType = 'validation';
      } else if (error.response?.status === 404) {
        errorMessage = "Route not found. Please try different locations.";
        errorType = 'routing';
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error. Please try again in a moment.";
        errorType = 'server';
      } else if (!navigator.onLine) {
        errorMessage = "No internet connection. Please check your network.";
        errorType = 'network';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError({ type: errorType, message: errorMessage });
      toast.error(errorMessage);
      
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
    setError(null);
    
    // Validate coordinates before refresh
    const finalPickupCoords = (pickupCoords?.lat && pickupCoords?.lng) 
      ? pickupCoords 
      : detectedCoords;
      
    if (!finalPickupCoords?.lat || !finalPickupCoords?.lng || !destCoords?.lat || !destCoords?.lng) {
      const errorMsg = "Missing location data. Please go back and select locations again.";
      setError({ type: 'validation', message: errorMsg });
      toast.error(errorMsg);
      setLoading(false);
      return;
    }
    
    console.log('[FairFare] Refreshing prices:', {
      pickup: { address: pickup, coords: finalPickupCoords },
      destination: { address: destination, coords: destCoords }
    });
    
    try {
      const response = await axios.post(`${API}/compare-rides`, {
        pickup: {
          address: pickup,
          lat: finalPickupCoords.lat,
          lng: finalPickupCoords.lng,
        },
        destination: {
          address: destination,
          lat: destCoords.lat,
          lng: destCoords.lng,
        },
      }, {
        timeout: 15000
      });
      
      if (!response.data || !response.data.estimates) {
        throw new Error('Invalid response from server');
      }
      
      setResults(response.data);
      setLastUpdated(new Date());
      toast.success("Prices refreshed!");
      
    } catch (error) {
      console.error("[FairFare] Error refreshing prices:", {
        error: error.message,
        status: error.response?.status
      });
      
      const errorMsg = error.response?.data?.detail || "Failed to refresh prices. Please try again.";
      setError({ type: 'api', message: errorMsg });
      toast.error(errorMsg);
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

  // Get the cheapest ride option
  const getCheapestOption = () => {
    if (!results || !results.estimates || results.estimates.length < 2) return null;
    
    const estimates = results.estimates;
    // Sort by minimum estimated price
    const sorted = [...estimates].sort((a, b) => 
      (a.estimated_price_min || 0) - (b.estimated_price_min || 0)
    );
    
    return sorted[0];
  };

  // Calculate savings between options
  const getSavingsInfo = () => {
    if (!results || !results.estimates || results.estimates.length < 2) {
      return null;
    }
    
    const estimates = results.estimates;
    const uber = estimates.find(e => e.provider === 'Uber');
    const lyft = estimates.find(e => e.provider === 'Lyft');
    
    if (!uber || !lyft) return null;
    
    // Calculate price based on distance and time
    const distance = results.distance_miles || 10;
    const duration = results.duration_minutes || 30;
    
    // Base rate calculation: $2.50 base + $1.50/mile + $0.35/min
    const basePrice = 2.50 + (distance * 1.50) + (duration * 0.35);
    
    // Time-of-day multiplier (subtle)
    const hour = new Date().getHours();
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    const isLateNight = hour >= 22 || hour <= 5;
    const timeMultiplier = isRushHour ? 1.15 : isLateNight ? 1.08 : 1.0;
    
    // Dynamic surge factor based on demand level
    const getSurgeFactor = (likelihood) => {
      if (likelihood === 'High') return 1.35;
      if (likelihood === 'Moderate') return 1.20;
      return 1.10; // Low demand
    };
    
    // Calculate price ranges for each provider
    // Low estimate = base calculation
    const uberLow = Math.round(basePrice * timeMultiplier);
    const lyftLow = Math.round(basePrice * timeMultiplier * 0.95); // Lyft typically ~5% cheaper
    
    // High estimate = low × surge factor
    const uberHigh = Math.round(uberLow * getSurgeFactor(uber.surge_likelihood));
    const lyftHigh = Math.round(lyftLow * getSurgeFactor(lyft.surge_likelihood));
    
    // Mid-point for comparison
    const uberMid = Math.round((uberLow + uberHigh) / 2);
    const lyftMid = Math.round((lyftLow + lyftHigh) / 2);
    
    const diff = Math.abs(uberMid - lyftMid);
    const cheaperProvider = uberMid < lyftMid ? 'Uber' : 'Lyft';
    
    return {
      savings: diff,
      cheaperProvider,
      // Price ranges
      uberLow,
      uberHigh,
      lyftLow,
      lyftHigh,
      // For backwards compatibility
      cheaperPrice: cheaperProvider === 'Uber' ? uberLow : lyftLow,
      expensivePrice: cheaperProvider === 'Uber' ? lyftLow : uberLow,
      cheaperPriceRange: cheaperProvider === 'Uber' ? `${uberLow}–${uberHigh}` : `${lyftLow}–${lyftHigh}`,
      expensivePriceRange: cheaperProvider === 'Uber' ? `${lyftLow}–${lyftHigh}` : `${uberLow}–${uberHigh}`,
      cheaperEstimate: cheaperProvider === 'Uber' ? uber : lyft,
      hasSavings: diff >= 1 // Show savings if $1 or more difference
    };
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

  const loadWeekendRide = async () => {
    if (savedRoute) {
      setPickup(savedRoute.pickup);
      setDestination(savedRoute.destination);
      
      // If we have saved coordinates, use them
      if (savedRoute.pickupCoords?.lat && savedRoute.pickupCoords?.lng) {
        setPickupCoords(savedRoute.pickupCoords);
      } else if (savedRoute.pickup) {
        // Auto-geocode if no coords saved
        toast.info("Getting pickup coordinates...");
        const coords = await autoGeocode(savedRoute.pickup);
        if (coords) {
          setPickupCoords({ lat: coords.lat, lng: coords.lng });
        }
      }
      
      if (savedRoute.destCoords?.lat && savedRoute.destCoords?.lng) {
        setDestCoords(savedRoute.destCoords);
      } else if (savedRoute.destination) {
        // Auto-geocode if no coords saved
        toast.info("Getting destination coordinates...");
        const coords = await autoGeocode(savedRoute.destination);
        if (coords) {
          setDestCoords({ lat: coords.lat, lng: coords.lng });
        }
      }
      
      toast.success("Weekend Ride loaded!");
    }
  };

  // Log handoff events for debugging
  const logHandoffEvent = (event, data) => {
    const logEntry = {
      event,
      ...data,
      timestamp: new Date().toISOString(),
      platform: Capacitor.isNativePlatform() ? 'Native' : 
                /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iOS Web' :
                /Android/.test(navigator.userAgent) ? 'Android Web' : 'Desktop',
      userAgent: navigator.userAgent.substring(0, 100)
    };
    console.log('[FairFare Handoff]', event, logEntry);
    
    // Store in localStorage for debugging
    try {
      const logs = JSON.parse(localStorage.getItem('handoffLogs') || '[]');
      logs.push(logEntry);
      // Keep only last 20 logs
      if (logs.length > 20) logs.shift();
      localStorage.setItem('handoffLogs', JSON.stringify(logs));
    } catch (e) {
      // Ignore storage errors
    }
  };

  // Safe URL opener that works on all platforms - PRIORITIZES NATIVE APP
  const openExternalUrl = async (url, isDeepLink = false) => {
    const isNative = Capacitor.isNativePlatform();
    
    logHandoffEvent('OPEN_URL_ATTEMPT', { url, isDeepLink, isNative });
    
    try {
      if (isNative) {
        if (isDeepLink) {
          // For deep links (lyft://, uber://), try multiple approaches
          // Approach 1: Use window.location.href - most reliable for deep links
          try {
            logHandoffEvent('OPEN_URL_TRYING_LOCATION_HREF', { url });
            window.location.href = url;
            // Give OS time to handle the intent
            await new Promise(r => setTimeout(r, 100));
            return { success: true, fired: true, method: 'location.href' };
          } catch (hrefError) {
            logHandoffEvent('OPEN_URL_HREF_FAILED', { url, error: hrefError.message });
          }
          
          // Approach 2: Use Capacitor App plugin as backup
          try {
            await CapacitorApp.openUrl({ url });
            logHandoffEvent('OPEN_URL_DEEPLINK_FIRED', { url });
            return { success: true, fired: true, method: 'CapacitorApp' };
          } catch (appError) {
            logHandoffEvent('OPEN_URL_DEEPLINK_ERROR', { url, error: appError.message });
            return { success: false, error: appError.message };
          }
        } else {
          // For web URLs, use Browser plugin
          await Browser.open({ url, presentationStyle: 'popover' });
          logHandoffEvent('OPEN_URL_SUCCESS_BROWSER', { url });
          return { success: true };
        }
      } else {
        // Web browser - use window.open for all URLs
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (newWindow) {
          logHandoffEvent('OPEN_URL_SUCCESS_WEB', { url });
          return { success: true };
        } else {
          logHandoffEvent('OPEN_URL_POPUP_BLOCKED', { url });
          return { success: false, error: 'Popup blocked' };
        }
      }
    } catch (error) {
      logHandoffEvent('OPEN_URL_ERROR', { url, error: error.message });
      return { success: false, error: error.message };
    }
  };

  // CRASH-PROOF: Open ride provider with guaranteed visible UI
  const openDeepLink = async (estimate) => {
    // SAFETY: Never proceed without estimate data
    if (!estimate || !estimate.provider) {
      logHandoffEvent('ERROR_NO_ESTIMATE', { estimate });
      toast.error('Unable to open ride app. Please try again.');
      return;
    }

    // SAFETY: Validate URLs exist
    const webLink = estimate.web_link || `https://www.${estimate.provider.toLowerCase()}.com`;
    const deepLink = estimate.deep_link || webLink;

    // ============================================================
    // DEBUG LOGGING - ESTIMATE DATA (Requested by user)
    // This shows what data comes from the estimate before handoff
    // ============================================================
    console.log('='.repeat(60));
    console.log('[FairFare:HANDOFF_DEBUG] *** openDeepLink CALLED ***');
    console.log('[FairFare:HANDOFF_DEBUG] estimate object:', JSON.stringify(estimate, null, 2));
    console.log('[FairFare:HANDOFF_DEBUG] estimate.deep_link:', estimate.deep_link);
    console.log('[FairFare:HANDOFF_DEBUG] estimate.web_link:', estimate.web_link);
    console.log('[FairFare:HANDOFF_DEBUG] Final deepLink to use:', deepLink);
    console.log('[FairFare:HANDOFF_DEBUG] Final webLink to use:', webLink);
    console.log('='.repeat(60));
    // ============================================================
    // END DEBUG LOGGING
    // ============================================================

    logHandoffEvent('HANDOFF_START', {
      provider: estimate.provider,
      deepLink,
      webLink
    });

    // Show helper card if ride is for someone else
    if (rideForOther && passengerName && passengerPhone) {
      setShowHelperCard(true);
    }

    // Track savings
    try {
      if (results?.estimates?.length >= 2) {
        const sortedByPrice = [...results.estimates].sort((a, b) => 
          (a.estimated_price_min || 0) - (b.estimated_price_min || 0)
        );
        const cheapest = sortedByPrice[0];
        const expensive = sortedByPrice[sortedByPrice.length - 1];
        
        if (estimate.provider === cheapest.provider && cheapest.estimated_price_min && expensive.estimated_price_min) {
          const savedAmount = expensive.estimated_price_min - cheapest.estimated_price_min;
          if (savedAmount > 0) {
            const newSavings = {
              ...savingsData,
              totalSaved: savingsData.totalSaved + savedAmount,
              ridesCompared: savingsData.ridesCompared + 1,
              avgSavedPerRide: (savingsData.totalSaved + savedAmount) / (savingsData.ridesCompared + 1)
            };
            setSavingsData(newSavings);
            localStorage.setItem('fairfareSavings', JSON.stringify(newSavings));
          }
        }
      }
    } catch (e) {
      // Don't let savings tracking break the handoff
      console.error('[FairFare] Savings tracking error:', e);
    }

    // IMMEDIATELY show the handoff modal - this prevents blank screens
    setHandoffState({
      isOpen: true,
      provider: estimate.provider,
      status: 'opening',
      deepLink,
      webLink,
      errorMessage: null,
      startTime: Date.now()
    });
    
    // Store ride info for post-ride feedback
    const savingsInfo = getSavingsInfo();
    setLastBookedRide({
      provider: estimate.provider,
      destination: destination,
      estimatedSavings: savingsInfo?.savings || 0,
      priceRange: estimate.provider === savingsInfo?.cheaperProvider 
        ? savingsInfo?.cheaperPriceRange 
        : savingsInfo?.expensivePriceRange,
      timestamp: Date.now()
    });
  };

  // Handle opening the ride app (called from handoff modal)
  const executeHandoff = async (useWebFallback = false) => {
    const { provider, deepLink, webLink } = handoffState;
    
    if (!provider || !webLink) {
      setHandoffState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Missing provider information'
      }));
      return;
    }

    // ============================================================
    // DEBUG LOGGING - HANDOFF VERIFICATION (Requested by user)
    // This logging helps debug why native apps may not prefill correctly
    // ============================================================
    console.log('='.repeat(60));
    console.log('[FairFare:HANDOFF_DEBUG] *** EXECUTE HANDOFF TRIGGERED ***');
    console.log('[FairFare:HANDOFF_DEBUG] Provider:', provider);
    console.log('[FairFare:HANDOFF_DEBUG] useWebFallback:', useWebFallback);
    console.log('[FairFare:HANDOFF_DEBUG] --- CURRENT STATE ---');
    console.log('[FairFare:HANDOFF_DEBUG] pickupLocation:', JSON.stringify(pickupLocation, null, 2));
    console.log('[FairFare:HANDOFF_DEBUG] destinationLocation:', JSON.stringify(destinationLocation, null, 2));
    console.log('[FairFare:HANDOFF_DEBUG] pickup (string):', pickup);
    console.log('[FairFare:HANDOFF_DEBUG] destination (string):', destination);
    console.log('[FairFare:HANDOFF_DEBUG] pickupCoords:', JSON.stringify(pickupCoords, null, 2));
    console.log('[FairFare:HANDOFF_DEBUG] --- DEEP LINK DATA ---');
    console.log('[FairFare:HANDOFF_DEBUG] deepLink (FULL):', deepLink);
    console.log('[FairFare:HANDOFF_DEBUG] webLink (FULL):', webLink);
    console.log('[FairFare:HANDOFF_DEBUG] --- PARSED FROM DEEP LINK ---');
    try {
      // Parse the deep link to show what coordinates/addresses are embedded
      const dlUrl = new URL(deepLink.replace('uber://', 'https://uber.com/').replace('lyft://', 'https://lyft.com/'));
      console.log('[FairFare:HANDOFF_DEBUG] Deep link params:', Object.fromEntries(dlUrl.searchParams));
    } catch (e) {
      console.log('[FairFare:HANDOFF_DEBUG] Could not parse deep link:', e.message);
    }
    console.log('='.repeat(60));
    // ============================================================
    // END DEBUG LOGGING
    // ============================================================

    logHandoffEvent('HANDOFF_EXECUTE', {
      provider,
      deepLink,
      webLink,
      useWebFallback
    });

    try {
      if (!useWebFallback && deepLink) {
        // Try to open native app first via deep link
        console.log('[FairFare:HANDOFF_DEBUG] >>> FIRING DEEP LINK NOW:', deepLink);
        const result = await openExternalUrl(deepLink, true);
        
        if (result.success) {
          // Deep link intent was fired successfully
          // The app SHOULD open if installed - close modal immediately
          logHandoffEvent('HANDOFF_DEEPLINK_FIRED', { provider });
          
          // Close modal immediately - don't wait
          // If app doesn't open, user can come back and try website
          setHandoffState(prev => ({ ...prev, isOpen: false, status: 'idle' }));
          
          // Show a brief toast in case user comes back
          toast.success(`Opening ${provider}...`, { duration: 2000 });
          return;
        } else {
          // Deep link failed with error - offer alternatives
          logHandoffEvent('HANDOFF_DEEPLINK_ERROR', { provider, error: result.error });
          setHandoffState(prev => ({
            ...prev,
            status: 'timeout',
            errorMessage: `Couldn't open ${provider} app. Tap below to open in browser.`
          }));
          return;
        }
      }
      
      // Use web fallback
      const webResult = await openExternalUrl(webLink, false);
      
      if (webResult.success) {
        logHandoffEvent('HANDOFF_SUCCESS_WEB', { provider, url: webLink });
        // Close modal immediately
        setHandoffState(prev => ({ ...prev, isOpen: false, status: 'idle' }));
      } else {
        setHandoffState(prev => ({
          ...prev,
          status: 'error',
          errorMessage: webResult.error === 'Popup blocked' 
            ? 'Pop-up blocked. Tap the button below to try again.'
            : `Couldn't open ${provider}. Please try again.`
        }));
      }
    } catch (error) {
      logHandoffEvent('HANDOFF_EXCEPTION', { 
        provider, 
        error: error.message
      });
      
      setHandoffState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: `Unable to open ${provider}. Please try again.`
      }));
    }
  };

  // Close handoff modal and return to results
  const closeHandoffModal = () => {
    logHandoffEvent('HANDOFF_CANCELLED', { provider: handoffState.provider });
    setHandoffState({
      isOpen: false,
      provider: null,
      status: 'idle',
      deepLink: null,
      webLink: null,
      errorMessage: null,
      startTime: null
    });
  };

  // Auto-execute handoff when modal opens
  useEffect(() => {
    if (handoffState.isOpen && handoffState.status === 'opening') {
      // Execute immediately - no need to wait
      const timer = setTimeout(() => {
        executeHandoff();
      }, 100); // Reduced from 500ms to 100ms
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffState.isOpen, handoffState.status]);

  // Timeout fail-safe: if still "opening" after 2 seconds, show options
  useEffect(() => {
    if (handoffState.isOpen && handoffState.status === 'opening' && handoffState.startTime) {
      const timer = setTimeout(() => {
        if (handoffState.status === 'opening') {
          logHandoffEvent('HANDOFF_TIMEOUT', { provider: handoffState.provider });
          setHandoffState(prev => ({
            ...prev,
            status: 'timeout',
            errorMessage: `Tap below to open ${prev.provider}.`
          }));
        }
      }, 2000); // Reduced from 3000ms to 2000ms
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffState.isOpen, handoffState.status, handoffState.startTime]);

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

  // Generate shareable savings image
  const generateShareImage = async () => {
    if (!results || !results.estimates) return null;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Social media optimized size (Instagram story friendly)
    canvas.width = 1080;
    canvas.height = 1920;
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0A1628');
    gradient.addColorStop(0.5, '#0D1F3C');
    gradient.addColorStop(1, '#0A1628');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add subtle glow effect at top
    const glowGradient = ctx.createRadialGradient(540, 300, 0, 540, 300, 400);
    glowGradient.addColorStop(0, 'rgba(0, 255, 136, 0.15)');
    glowGradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, canvas.width, 600);
    
    // Draw FairFare logo (simplified F)
    ctx.save();
    ctx.translate(540, 280);
    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#00FF88';
    ctx.shadowBlur = 30;
    
    // F shape
    ctx.beginPath();
    ctx.moveTo(-60, -80);
    ctx.lineTo(-60, 80);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(-60, -80);
    ctx.lineTo(60, -80);
    ctx.quadraticCurveTo(80, -80, 80, -60);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(-60, 0);
    ctx.lineTo(40, 0);
    ctx.stroke();
    
    // Dots
    ctx.fillStyle = '#00FF88';
    ctx.beginPath();
    ctx.arc(55, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(75, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // "FairFare" text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FairFare', 540, 450);
    
    // Tagline
    ctx.fillStyle = '#94A3B8';
    ctx.font = '32px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('Compare rides instantly', 540, 510);
    
    // Get prices from estimates
    const uberEstimate = results.estimates.find(e => e.provider === 'Uber');
    const lyftEstimate = results.estimates.find(e => e.provider === 'Lyft');
    
    // Mock prices for display (since we use decision engine)
    const uberPrice = 24.50;
    const lyftPrice = 18.75;
    const savings = Math.abs(uberPrice - lyftPrice);
    
    // Price comparison card background
    ctx.fillStyle = '#162236';
    ctx.beginPath();
    ctx.roundRect(90, 600, 900, 500, 30);
    ctx.fill();
    
    // Card border glow
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // "I just compared rides!" header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('I just compared rides!', 540, 700);
    
    // Uber price
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '36px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Uber', 160, 800);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`$${uberPrice.toFixed(2)}`, 920, 800);
    
    // Lyft price (highlighted)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00FF88';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('Lyft', 160, 870);
    ctx.fillText('✓ Best', 280, 870);
    ctx.textAlign = 'right';
    ctx.fillText(`$${lyftPrice.toFixed(2)}`, 920, 870);
    
    // Divider line
    ctx.strokeStyle = '#1E3A5F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(160, 920);
    ctx.lineTo(920, 920);
    ctx.stroke();
    
    // Savings amount (big and green)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00FF88';
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.shadowColor = '#00FF88';
    ctx.shadowBlur = 20;
    ctx.fillText(`Saved $${savings.toFixed(2)}!`, 540, 1020);
    ctx.shadowBlur = 0;
    
    // Route info
    ctx.fillStyle = '#64748B';
    ctx.font = '28px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${pickup.substring(0, 30)}${pickup.length > 30 ? '...' : ''}`, 540, 1200);
    ctx.fillText('↓', 540, 1250);
    ctx.fillText(`${destination.substring(0, 30)}${destination.length > 30 ? '...' : ''}`, 540, 1300);
    
    // Call to action
    ctx.fillStyle = '#00FF88';
    ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('Stop overpaying for rides! 🚗', 540, 1500);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '32px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('Download FairFare', 540, 1570);
    
    // App store badges placeholder text
    ctx.fillStyle = '#64748B';
    ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('Available on iOS & Android', 540, 1630);
    
    // Watermark
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = '20px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('Made with FairFare', 540, 1850);
    
    return canvas;
  };

  // Share savings functionality
  const shareSavings = async () => {
    setIsGeneratingShare(true);
    
    try {
      const canvas = await generateShareImage();
      if (!canvas) {
        toast.error('Could not generate share image');
        setIsGeneratingShare(false);
        return;
      }
      
      // Convert canvas to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'fairfare-savings.png', { type: 'image/png' });
      
      // Check if Web Share API is available with files support
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'I saved money with FairFare!',
          text: 'Stop switching between Uber and Lyft - compare rides instantly with FairFare!',
          files: [file]
        });
        toast.success('Thanks for sharing! 🎉');
      } else if (navigator.share) {
        // Fallback to text-only share
        await navigator.share({
          title: 'I saved money with FairFare!',
          text: 'Stop switching between Uber and Lyft - compare rides instantly with FairFare! Download now.',
          url: 'https://tryfairfare.com'
        });
        toast.success('Thanks for sharing! 🎉');
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fairfare-savings.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Image downloaded! Share it on your favorite social media.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        toast.error('Could not share. Try again.');
      }
    }
    
    setIsGeneratingShare(false);
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

  // Logo component with glow effect - matches the app icon design
  const FairFareLogo = ({ size = 40, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 512 512" className={`fairfare-logo ${className}`}>
      <defs>
        <filter id="logoGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="logoGlowStrong" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Background */}
      <rect width="512" height="512" fill="#0a1628"/>
      {/* F Letter with glow */}
      <g filter="url(#logoGlowStrong)">
        {/* Vertical stroke of F */}
        <rect x="100" y="100" width="40" height="312" rx="20" fill="#00ff88"/>
        {/* Top horizontal stroke of F */}
        <rect x="100" y="100" width="280" height="40" rx="20" fill="#00ff88"/>
        {/* Middle horizontal stroke of F */}
        <rect x="100" y="236" width="180" height="40" rx="20" fill="#00ff88"/>
      </g>
      {/* Trailing dots with glow */}
      <g filter="url(#logoGlow)">
        <circle cx="320" cy="256" r="24" fill="#00ff88"/>
        <circle cx="380" cy="256" r="18" fill="#00ff88"/>
        <circle cx="428" cy="256" r="12" fill="#00ff88"/>
      </g>
    </svg>
  );

  return (
    <div className="app-container">
      <Toaster position="top-center" richColors />
      
      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner" data-testid="offline-banner">
          <AlertTriangle size={16} />
          <span>You&apos;re offline. Some features may not work.</span>
        </div>
      )}
      
      {/* Splash Screen */}
      {showSplash && (
        <div className={`splash-screen ${splashFading ? 'fade-out' : ''}`} data-testid="splash-screen">
          <div className="splash-content">
            <FairFareLogo size={120} className="splash-logo" />
            <h1 className="splash-title">FairFare</h1>
          </div>
        </div>
      )}
      
      {view === "input" && (
        <div className="input-view">
          <div className="header">
            <div className="logo-header">
              <FairFareLogo size={56} />
              <h1 className="app-title">FairFare</h1>
            </div>
            <p className="app-subtitle">Compare rides instantly</p>
            <div className="header-badges">
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
              {watchedRoutes.length > 0 && (
                <button 
                  className="alerts-badge-btn"
                  onClick={() => setView("alerts")}
                  data-testid="open-alerts-btn"
                >
                  <Bell size={14} />
                  <span>{watchedRoutes.length} alert{watchedRoutes.length !== 1 ? 's' : ''}</span>
                </button>
              )}
            </div>
          </div>

          <div className="input-section">
            {/* Location detected banner - auto-hides after 3 seconds */}
            {showLocationBanner && (
              <div className="location-banner" data-testid="location-banner">
                <Navigation size={16} />
                <span>Location detected!</span>
              </div>
            )}
            
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
                        setDetectedCoords(null);
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
                
                {/* Helper text for GPS-detected locations */}
                {detectedCoords && pickup && (
                  <p className="pickup-helper-text">If this address is slightly off, tap to adjust.</p>
                )}
                
                {/* Autocomplete suggestions */}
                {showPickupSuggestions && (activeField === 'pickup') && (
                  <div className="autocomplete-dropdown" data-testid="pickup-suggestions">
                    {/* Favorites Section */}
                    {favoriteLocations.length > 0 && !pickup && (
                      <>
                        <div className="suggestions-header">
                          <Heart size={14} className="header-icon favorite" />
                          Favorites
                        </div>
                        {favoriteLocations.map((fav) => (
                          <div
                            key={`fav-${fav.id}`}
                            className="suggestion-item favorite"
                            onClick={() => selectFavorite(fav, true)}
                            data-testid={`pickup-favorite-${fav.id}`}
                          >
                            <Heart size={16} className="suggestion-icon favorite-icon" />
                            <div className="suggestion-details">
                              <span className="suggestion-main">{fav.label}</span>
                              <span className="suggestion-sub">{fav.display_name}</span>
                            </div>
                            <button
                              className="remove-favorite-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromFavorites(fav.id);
                              }}
                              aria-label="Remove from favorites"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <div className="suggestions-divider" />
                      </>
                    )}
                    
                    {/* Recent Locations Section */}
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
                        {(recentLocations.length > 0 || favoriteLocations.length > 0) && !pickup && <div className="suggestions-divider" />}
                        {pickupSuggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            className={`suggestion-item ${suggestion.isAirport ? 'airport' : ''} ${suggestion.isPOI ? 'poi' : ''}`}
                            data-testid={`pickup-suggestion-${idx}`}
                            onClick={() => selectSuggestion(suggestion, true)}
                            onTouchEnd={(e) => {
                              e.preventDefault();
                              selectSuggestion(suggestion, true);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="suggestion-content">
                              {suggestion.isAirport ? (
                                <>
                                  <span className="airport-badge">✈ {suggestion.code}</span>
                                  <div className="suggestion-details">
                                    <span className="suggestion-main">{suggestion.display_name.split(',')[0]}</span>
                                    <span className="suggestion-sub">
                                      {suggestion.locationLine || suggestion.display_name.split(',').slice(1).join(',').trim()}
                                      {suggestion.formattedDistance && (
                                        <span className="suggestion-distance"> • {suggestion.formattedDistance}</span>
                                      )}
                                    </span>
                                  </div>
                                </>
                              ) : suggestion.isPOI || suggestion.placeName ? (
                                <>
                                  <Store size={16} className="suggestion-icon poi-icon" />
                                  <div className="suggestion-details">
                                    <span className="suggestion-main">{suggestion.placeName || suggestion.businessName || suggestion.streetLine}</span>
                                    {suggestion.formattedDistance && (
                                      <span className="suggestion-distance-line">{suggestion.formattedDistance} away</span>
                                    )}
                                    <span className="suggestion-sub">{suggestion.locationLine}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <MapPin size={16} className="suggestion-icon" />
                                  <div className="suggestion-details">
                                    <span className="suggestion-main">{suggestion.placeName || suggestion.streetLine}</span>
                                    {suggestion.formattedDistance && (
                                      <span className="suggestion-distance-line">{suggestion.formattedDistance} away</span>
                                    )}
                                    <span className="suggestion-sub">{suggestion.locationLine}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            {/* Add to favorites button */}
                            {!isInFavorites(suggestion.display_name, { lat: suggestion.lat, lng: suggestion.lon }) && (
                              <button
                                className="add-favorite-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToFavorites(
                                    suggestion.display_name, 
                                    { lat: suggestion.lat, lng: suggestion.lon },
                                    suggestion.isAirport ? suggestion.code : null
                                  );
                                }}
                                aria-label="Add to favorites"
                                title="Add to favorites"
                              >
                                <Heart size={14} />
                              </button>
                            )}
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
                    {/* Favorites Section */}
                    {favoriteLocations.length > 0 && !destination && (
                      <>
                        <div className="suggestions-header">
                          <Heart size={14} className="header-icon favorite" />
                          Favorites
                        </div>
                        {favoriteLocations.map((fav) => (
                          <div
                            key={`fav-${fav.id}`}
                            className="suggestion-item favorite"
                            onClick={() => selectFavorite(fav, false)}
                            data-testid={`dest-favorite-${fav.id}`}
                          >
                            <Heart size={16} className="suggestion-icon favorite-icon" />
                            <div className="suggestion-details">
                              <span className="suggestion-main">{fav.label}</span>
                              <span className="suggestion-sub">{fav.display_name}</span>
                            </div>
                            <button
                              className="remove-favorite-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromFavorites(fav.id);
                              }}
                              aria-label="Remove from favorites"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <div className="suggestions-divider" />
                      </>
                    )}
                    
                    {/* Recent Locations Section */}
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
                        {(recentLocations.length > 0 || favoriteLocations.length > 0) && !destination && <div className="suggestions-divider" />}
                        {destSuggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            className={`suggestion-item ${suggestion.isAirport ? 'airport' : ''} ${suggestion.isPOI ? 'poi' : ''}`}
                            data-testid={`dest-suggestion-${idx}`}
                            onClick={() => selectSuggestion(suggestion, false)}
                            onTouchEnd={(e) => {
                              e.preventDefault();
                              selectSuggestion(suggestion, false);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="suggestion-content">
                              {suggestion.isAirport ? (
                                <>
                                  <span className="airport-badge">✈ {suggestion.code}</span>
                                  <div className="suggestion-details">
                                    <span className="suggestion-main">{suggestion.display_name.split(',')[0]}</span>
                                    <span className="suggestion-sub">
                                      {suggestion.locationLine || suggestion.display_name.split(',').slice(1).join(',').trim()}
                                      {suggestion.formattedDistance && (
                                        <span className="suggestion-distance"> • {suggestion.formattedDistance}</span>
                                      )}
                                    </span>
                                  </div>
                                </>
                              ) : suggestion.isPOI || suggestion.placeName ? (
                                <>
                                  <Store size={16} className="suggestion-icon poi-icon" />
                                  <div className="suggestion-details">
                                    <span className="suggestion-main">{suggestion.placeName || suggestion.businessName || suggestion.streetLine}</span>
                                    {suggestion.formattedDistance && (
                                      <span className="suggestion-distance-line">{suggestion.formattedDistance} away</span>
                                    )}
                                    <span className="suggestion-sub">{suggestion.locationLine}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <MapPin size={16} className="suggestion-icon" />
                                  <div className="suggestion-details">
                                    <span className="suggestion-main">{suggestion.placeName || suggestion.streetLine}</span>
                                    {suggestion.formattedDistance && (
                                      <span className="suggestion-distance-line">{suggestion.formattedDistance} away</span>
                                    )}
                                    <span className="suggestion-sub">{suggestion.locationLine}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            {/* Add to favorites button */}
                            {!isInFavorites(suggestion.display_name, { lat: suggestion.lat, lng: suggestion.lon }) && (
                              <button
                                className="add-favorite-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToFavorites(
                                    suggestion.display_name, 
                                    { lat: suggestion.lat, lng: suggestion.lon },
                                    suggestion.isAirport ? suggestion.code : null
                                  );
                                }}
                                aria-label="Add to favorites"
                                title="Add to favorites"
                              >
                                <Heart size={14} />
                              </button>
                            )}
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

            {/* Passenger Context - Who is riding? */}
            <div className="passenger-context">
              <div className="context-row">
                <label className="context-label">Who is riding?</label>
                <div className="context-options">
                  {['me', 'child', 'family', 'guest'].map((type) => (
                    <button
                      key={type}
                      className={`context-option ${riderType === type ? 'active' : ''}`}
                      onClick={() => setRiderType(type)}
                    >
                      {type === 'me' ? 'Me' : type === 'child' ? 'My Child' : type === 'family' ? 'Family' : 'Guest'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="context-row">
                <label className="context-label">Passengers</label>
                <div className="context-options">
                  {[1, 2, 3, '4+'].map((count) => (
                    <button
                      key={count}
                      className={`context-option ${passengerCount === count ? 'active' : ''}`}
                      onClick={() => setPassengerCount(count)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              data-testid="compare-btn"
              onClick={compareRides}
              disabled={loading || !canAttemptCompare()}
              className={`compare-button ${canAttemptCompare() && !canCompare() ? 'will-geocode' : ''}`}
            >
              {loading ? "Finding fares..." : canCompare() ? "Find My Fare" : canAttemptCompare() ? "Find My Fare" : getValidationMessage()}
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

      {view === "results" && (
        <div className="results-view">
          <div className="results-header">
            <button
              data-testid="back-btn"
              onClick={() => {
                setView("input");
                setError(null);
              }}
              className="back-button"
            >
              ← Back
            </button>
            <div className="results-info">
              <div className="logo-container">
                <FairFareLogo size={32} />
                <h2 className="results-title">FairFare</h2>
              </div>
              {results && (
                <>
                  <p className="distance-text">
                    {results.distance_miles} miles • {results.duration_minutes} min
                  </p>
                  {results.decision_hint && (
                    <p className="decision-hint" data-testid="decision-hint">
                      {results.decision_hint}
                    </p>
                  )}
                </>
              )}
              {lastUpdated && !loading && !error && (
                <p className="timestamp-text">
                  <Clock size={14} />
                  Updated {getTimeAgo(lastUpdated)}
                </p>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="loading-state" data-testid="loading-state">
              <Loader2 size={48} className="spinner loading-spinner" />
              <p className="loading-text">Finding the best fares...</p>
              <p className="loading-subtext">Checking Uber and Lyft availability</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="error-state" data-testid="error-state">
              <AlertTriangle size={48} className="error-icon" />
              <h3 className="error-title">Something went wrong</h3>
              <p className="error-message">{error.message}</p>
              {error.type === 'geocoding' && (
                <p className="error-hint">
                  Tip: Make sure to select a location from the dropdown suggestions.
                </p>
              )}
              <div className="error-actions">
                <button 
                  className="retry-button"
                  onClick={() => {
                    setError(null);
                    compareRides();
                  }}
                  data-testid="retry-btn"
                >
                  Try Again
                </button>
                <button 
                  className="back-to-input-button"
                  onClick={() => {
                    setView("input");
                    setError(null);
                  }}
                  data-testid="back-to-input-btn"
                >
                  Change Locations
                </button>
              </div>
            </div>
          )}

          {/* Results Content - Only show when we have valid results and no error */}
          {results && !loading && !error && (
            <>
              {/* Savings Moment - Primary CTA */}
              {getSavingsInfo()?.hasSavings && (
                <div className="savings-moment" data-testid="savings-moment">
                  <div className="savings-badge">
                    <DollarSign size={18} />
                    <span>CHEAPEST</span>
                  </div>
                  <div className="savings-content">
                    <p className="savings-message">
                      Typical ride price range
                    </p>
                    <p className="savings-comparison">
                      {getSavingsInfo().cheaperProvider}: Estimated ${getSavingsInfo().cheaperPriceRange}
                    </p>
                  </div>
                  <button
                    data-testid="open-cheapest-btn"
                    className="open-cheapest-button"
                    onClick={() => openDeepLink(getSavingsInfo().cheaperEstimate)}
                    disabled={handoffState.isOpen}
                  >
                    {handoffState.isOpen && handoffState.provider === getSavingsInfo().cheaperProvider ? (
                      <>
                        <Loader2 size={18} className="spinner" />
                        Opening...
                      </>
                    ) : (
                      <>Open {getSavingsInfo().cheaperProvider}</>
                    )}
                  </button>
                </div>
              )}

              {/* Recommendation Banner */}
              {results.recommendation && (
                <div className="recommendation-banner" data-testid="recommendation-banner">
                  <Sparkles size={16} className="recommendation-icon" />
                  <span>{results.recommendation}</span>
                </div>
              )}

          <div className="section-divider">
            <span>All Options</span>
          </div>

          <div className="estimates-list">
            {results.estimates.map((estimate, idx) => {
              // Determine if this is the fastest option (lowest ETA)
              const isFastest = results.estimates.every(e => estimate.eta_minutes <= e.eta_minutes);
              const isCheapest = getSavingsInfo()?.cheaperProvider === estimate.provider;
              
              return (
              <div
                key={idx}
                data-testid={`${estimate.provider.toLowerCase()}-card`}
                className={`estimate-card ${estimate.provider.toLowerCase()} ${isCheapest ? 'cheapest' : ''}`}
              >
                {isCheapest && (
                  <div className="cheapest-badge" data-testid="cheapest-badge">
                    <DollarSign size={14} />
                    CHEAPEST
                  </div>
                )}
                {isFastest && !isCheapest && (
                  <div className="fastest-badge" data-testid="fastest-badge">
                    <Clock size={14} />
                    FASTEST
                  </div>
                )}
                <div className="estimate-header">
                  <h3 className="provider-name">{estimate.provider}</h3>
                  <span className="ride-type">{estimate.ride_type}</span>
                </div>

                {/* Show estimated price */}
                {getSavingsInfo() && (
                  <div className="estimated-price-container">
                    <div className="estimated-price">
                      Estimated ${isCheapest 
                        ? getSavingsInfo().cheaperPriceRange
                        : getSavingsInfo().expensivePriceRange}
                    </div>
                    <div className="price-disclaimer">Final price shown in Uber/Lyft app</div>
                  </div>
                )}

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

                <button
                  data-testid={`${estimate.provider.toLowerCase()}-open-btn`}
                  onClick={() => openDeepLink(estimate)}
                  className="open-app-button"
                  disabled={handoffState.isOpen}
                >
                  {handoffState.isOpen && handoffState.provider === estimate.provider ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      Opening {estimate.provider}...
                    </>
                  ) : (
                    `Open ${estimate.provider}`
                  )}
                </button>
              </div>
            );
            })}
          </div>

          {/* Savings Summary & Share Card */}
          <div className="share-savings-card" data-testid="share-savings-card">
            <h3 className="share-card-title">Your Comparison</h3>
            <div className="price-comparison-list">
              {results.estimates.map((estimate, idx) => {
                const isCheapest = getSavingsInfo()?.cheaperProvider === estimate.provider;
                return (
                <div key={idx} className={`price-row ${isCheapest ? 'best' : ''}`}>
                  <span className="price-provider">{estimate.provider}</span>
                  <span className="price-value">
                    {isCheapest && <span className="best-tag">CHEAPEST</span>}
                    ~${isCheapest ? getSavingsInfo().cheaperPrice : getSavingsInfo()?.expensivePrice}.00
                  </span>
                </div>
              );
              })}
            </div>
            <div className="savings-highlight">
              <DollarSign size={20} />
              <span>You could save <strong>$5.75</strong> with FairFare!</span>
            </div>
            <button
              data-testid="share-savings-btn"
              onClick={shareSavings}
              disabled={isGeneratingShare}
              className="share-button"
            >
              {isGeneratingShare ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  Creating...
                </>
              ) : (
                <>
                  <Share2 size={18} />
                  Share My Savings
                </>
              )}
            </button>
            <p className="share-hint">Brag to your friends! 🎉</p>
          </div>

          {/* Watch This Route Card */}
          <div className="watch-route-card" data-testid="watch-route-card">
            <div className="watch-card-header">
              <Bell size={20} className="watch-icon" />
              <h3 className="watch-card-title">Price Alerts</h3>
            </div>
            <p className="watch-card-desc">Get notified when prices drop more than 15%</p>
            <button
              data-testid="watch-route-btn"
              onClick={watchRoute}
              className="watch-route-button"
            >
              <BellRing size={18} />
              Watch This Route
            </button>
            {watchedRoutes.length > 0 && (
              <button
                onClick={() => setView('alerts')}
                className="view-alerts-link"
              >
                View {watchedRoutes.length} watched route{watchedRoutes.length !== 1 ? 's' : ''} →
              </button>
            )}
          </div>

          <button
            data-testid="refresh-btn"
            onClick={refreshPrices}
            disabled={loading}
            className="refresh-button"
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
            </>
          )}
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

      {/* Price Alerts View */}
      {view === "alerts" && (
        <div className="alerts-view" data-testid="alerts-view">
          <div className="alerts-header">
            <button
              data-testid="alerts-back-btn"
              onClick={() => setView("input")}
              className="back-button"
            >
              ← Back
            </button>
            <div className="alerts-title-section">
              <Bell size={28} className="alerts-icon" />
              <h2 className="alerts-title">Price Alerts</h2>
            </div>
          </div>

          {!notificationsEnabled && (
            <div className="notification-prompt" data-testid="notification-prompt">
              <BellRing size={24} />
              <div className="notification-prompt-text">
                <p><strong>Enable notifications</strong></p>
                <p>Get alerted when prices drop!</p>
              </div>
              <button onClick={requestNotificationPermission} className="enable-notifications-btn">
                Enable
              </button>
            </div>
          )}

          {watchedRoutes.length === 0 ? (
            <div className="empty-alerts">
              <Bell size={48} className="empty-icon" />
              <h3>No watched routes yet</h3>
              <p>Compare a ride and tap "Watch This Route" to get price drop alerts.</p>
              <button
                className="compare-button"
                onClick={() => setView("input")}
              >
                Find My Fare
              </button>
            </div>
          ) : (
            <div className="watched-routes-list">
              {watchedRoutes.map((route) => (
                <div key={route.id} className="watched-route-card" data-testid={`watched-route-${route.id}`}>
                  <div className="route-info">
                    <div className="route-locations">
                      <p className="route-pickup">
                        <MapPin size={14} className="route-icon pickup" />
                        {route.pickup.substring(0, 35)}{route.pickup.length > 35 ? '...' : ''}
                      </p>
                      <p className="route-destination">
                        <Navigation size={14} className="route-icon dest" />
                        {route.destination.substring(0, 35)}{route.destination.length > 35 ? '...' : ''}
                      </p>
                    </div>
                    <div className="route-price-info">
                      <span className="current-price">${route.currentPrice?.toFixed(2) || '--'}</span>
                      {route.percentChange !== undefined && route.percentChange !== null && (
                        <span className={`price-change ${route.percentChange < 0 ? 'down' : route.percentChange > 0 ? 'up' : ''}`}>
                          {route.percentChange > 0 ? '+' : ''}{route.percentChange}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="route-meta">
                    <span className="last-checked">
                      <Clock size={12} />
                      {route.lastChecked ? `Checked ${getTimeAgo(route.lastChecked)}` : 'Not checked yet'}
                    </span>
                    <span className="best-provider">{route.bestProvider ? `Best: ${route.bestProvider}` : ''}</span>
                  </div>
                  <div className="route-actions">
                    <button 
                      onClick={() => loadWatchedRoute(route)}
                      className="use-route-btn"
                    >
                      Compare Now
                    </button>
                    <button 
                      onClick={() => removeWatchedRoute(route.id)}
                      className="remove-route-btn"
                      aria-label="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="alerts-info">
            <p>We check prices every 5 minutes and notify you when they drop more than 15%.</p>
          </div>
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

      {/* Simplified Handoff Modal */}
      {handoffState.isOpen && (
        <div className="handoff-modal-overlay" data-testid="handoff-modal">
          <div className="handoff-modal">
            {/* Provider Logo/Name */}
            <div className="handoff-provider">
              <span className={`provider-logo ${handoffState.provider?.toLowerCase()}`}>
                {handoffState.provider}
              </span>
            </div>

            {/* Status Messages */}
            {handoffState.status === 'opening' && (
              <div className="handoff-status opening">
                <Loader2 size={40} className="spinner handoff-spinner" />
                <p className="handoff-message">Opening {handoffState.provider}...</p>
              </div>
            )}

            {(handoffState.status === 'timeout' || handoffState.status === 'error') && (
              <div className="handoff-status timeout">
                <p className="handoff-message">Ready to book?</p>
                <p className="handoff-submessage">Tap below to continue to {handoffState.provider}</p>
              </div>
            )}

            {/* Simplified Actions - One Primary Button */}
            <div className="handoff-actions">
              {(handoffState.status === 'timeout' || handoffState.status === 'error') && (
                <button
                  className="handoff-btn primary large"
                  onClick={async () => {
                    // ============================================================
                    // DEBUG LOGGING - MANUAL BUTTON TAP (Requested by user)
                    // ============================================================
                    console.log('='.repeat(60));
                    console.log('[FairFare:HANDOFF_DEBUG] *** MANUAL BUTTON TAP ***');
                    console.log('[FairFare:HANDOFF_DEBUG] handoffState.deepLink:', handoffState.deepLink);
                    console.log('[FairFare:HANDOFF_DEBUG] handoffState.webLink:', handoffState.webLink);
                    console.log('[FairFare:HANDOFF_DEBUG] handoffState.provider:', handoffState.provider);
                    console.log('='.repeat(60));
                    // ============================================================

                    logHandoffEvent('HANDOFF_PRIMARY_TAP', { provider: handoffState.provider });
                    
                    // Try native app first
                    if (handoffState.deepLink) {
                      console.log('[FairFare:HANDOFF_DEBUG] >>> MANUAL TAP: FIRING DEEP LINK:', handoffState.deepLink);
                      const appResult = await openExternalUrl(handoffState.deepLink, true);
                      if (appResult.success) {
                        setHandoffState(prev => ({ ...prev, isOpen: false, status: 'idle' }));
                        return;
                      }
                    }
                    
                    // Automatic fallback to web
                    if (handoffState.webLink) {
                      console.log('[FairFare:HANDOFF_DEBUG] >>> MANUAL TAP: FALLING BACK TO WEB:', handoffState.webLink);
                      logHandoffEvent('HANDOFF_AUTO_FALLBACK_WEB', { provider: handoffState.provider });
                      const webResult = await openExternalUrl(handoffState.webLink, false);
                      if (webResult.success) {
                        setTimeout(() => {
                          setHandoffState(prev => ({ ...prev, isOpen: false, status: 'idle' }));
                        }, 500);
                      }
                    }
                  }}
                  data-testid="handoff-primary-btn"
                >
                  Open {handoffState.provider}
                </button>
              )}

              <button
                className="handoff-btn tertiary"
                onClick={closeHandoffModal}
                data-testid="handoff-back-btn"
              >
                ← Back to FairFare
              </button>
            </div>

            {/* Route Info with proper address display */}
            <div className="handoff-route-info">
              <p className="route-label">Your trip:</p>
              <p className="route-text route-pickup">
                <MapPin size={14} /> {shortenAddress(pickup, 40)}
              </p>
              <p className="route-text route-dest">
                <Navigation size={14} /> {shortenAddress(destination, 40)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Post-Ride Feedback Modal */}
      {showPostRideFeedback && lastBookedRide && (
        <div className="feedback-modal-overlay" data-testid="post-ride-feedback">
          <div className="feedback-modal">
            <h3 className="feedback-title">Did you book this ride?</h3>
            <p className="feedback-destination">
              To: {lastBookedRide.destination?.substring(0, 40)}...
            </p>
            <p className="feedback-provider">
              via {lastBookedRide.provider}
            </p>
            <div className="feedback-buttons">
              <button 
                className="feedback-btn feedback-yes"
                onClick={() => handlePostRideFeedback(true)}
              >
                Yes, I booked it
              </button>
              <button 
                className="feedback-btn feedback-no"
                onClick={() => handlePostRideFeedback(false)}
              >
                No, not yet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

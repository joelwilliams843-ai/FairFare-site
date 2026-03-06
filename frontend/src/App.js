import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import "@/App.css";
import axios from "axios";
import { MapPin, Navigation, Star, Clock, X, Sparkles, TrendingDown, AlertTriangle, Loader2, DollarSign, BarChart3, Share2, Bell, BellRing, Trash2, Store, Coffee, ShoppingBag, Hotel, Dumbbell, Fuel, Building2 } from "lucide-react";
import { toast, Toaster } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Nominatim API (OpenStreetMap) - Free, no API key
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

function App() {
  const [view, setView] = useState("input");
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
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
  const [showLocationBanner, setShowLocationBanner] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState(null); // Store original GPS coords
  
  // Savings tracking
  const [savingsData, setSavingsData] = useState({
    totalSaved: 0,
    ridesCompared: 0,
    avgSavedPerRide: 0,
    bestProvider: 'Lyft',
    bestProviderPercent: 0
  });
  
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
    
    // Auto-detect location on load
    detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Load watched route for comparison
  const loadWatchedRoute = (route) => {
    setPickup(route.pickup);
    setDestination(route.destination);
    setPickupCoords(route.pickupCoords);
    setDestCoords(route.destCoords);
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
    'church', 'school', 'university', 'college', 'library', 'community center',
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
      // Fallback: take first 3 parts of display_name
      const parts = item.display_name.split(', ');
      return parts.slice(0, 3).join(', ');
    }
    
    const addr = item.address;
    const parts = [];
    
    // Street address
    if (addr.house_number && addr.road) {
      parts.push(`${addr.house_number} ${addr.road}`);
    } else if (addr.road) {
      parts.push(addr.road);
    } else if (item.name) {
      parts.push(item.name);
    }
    
    // City
    const city = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb;
    if (city) parts.push(city);
    
    // State abbreviation
    const state = addr.state;
    if (state) {
      const stateAbbr = getStateAbbreviation(state);
      parts.push(stateAbbr);
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

  // Reverse geocode coordinates to address with better formatting
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await axios.get(`${NOMINATIM_BASE}/reverse`, {
        params: {
          lat,
          lon: lng,
          format: 'json',
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'FairFare/1.0'
        }
      });
      
      if (response.data && response.data.address) {
        const addr = response.data.address;
        // Format: Street Number + Street Name, City, ST
        const houseNumber = addr.house_number || '';
        const street = addr.road || addr.street || '';
        const city = addr.city || addr.town || addr.village || addr.suburb || '';
        const state = addr.state ? getStateAbbreviation(addr.state) : '';
        
        let formattedAddress = '';
        if (houseNumber && street) {
          formattedAddress = `${houseNumber} ${street}`;
        } else if (street) {
          formattedAddress = street;
        }
        
        if (city) {
          formattedAddress += formattedAddress ? `, ${city}` : city;
        }
        
        if (state) {
          formattedAddress += formattedAddress ? `, ${state}` : state;
        }
        
        return formattedAddress || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
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

  // Search for address suggestions with location biasing and POI support
  const searchAddress = async (query, isPickup) => {
    if (!query || query.length < 2) {
      if (isPickup) setPickupSuggestions([]);
      else setDestSuggestions([]);
      return;
    }

    const startTime = Date.now();
    const isPOI = isPOISearch(query);
    const poiCategory = getPOICategory(query);
    
    // Check for airport code matches first (instant)
    const airportMatches = matchAirportCode(query);
    const airportSuggestions = airportMatches.map(formatAirportSuggestion);

    // Show airport matches immediately
    if (airportSuggestions.length > 0) {
      if (isPickup) setPickupSuggestions(airportSuggestions);
      else setDestSuggestions(airportSuggestions);
    }

    // Build cache key with location context and POI flag
    const locationKey = userLocation.current 
      ? `${userLocation.current.lat.toFixed(2)},${userLocation.current.lng.toFixed(2)}`
      : 'default';
    const cacheKey = `${query.toLowerCase().trim()}_${locationKey}_${isPOI ? 'poi' : 'std'}`;
    
    // Check cache
    const cached = searchCache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      const combined = [...airportSuggestions, ...cached.results].slice(0, 6);
      if (isPickup) setPickupSuggestions(combined);
      else setDestSuggestions(combined);
      console.log(`Search completed in ${Date.now() - startTime}ms (cached)`);
      return;
    }

    try {
      // Build search params with enhanced location biasing
      const searchParams = {
        q: query,
        format: 'json',
        limit: isPOI ? 15 : 10, // Get more results for POI searches
        addressdetails: 1,
        countrycodes: 'us',
        extratags: 1, // Get extra tags for better POI classification
      };

      // Add location biasing if user location is known
      if (userLocation.current) {
        // For POI searches, use tighter bounding box (30 miles vs 100 miles)
        const bias = isPOI ? 0.5 : 1.5;
        searchParams.viewbox = [
          userLocation.current.lng - bias,
          userLocation.current.lat + bias,
          userLocation.current.lng + bias,
          userLocation.current.lat - bias
        ].join(',');
        searchParams.bounded = isPOI ? 1 : 0; // Strictly limit for POI searches
      }

      const response = await axios.get(`${NOMINATIM_BASE}/search`, {
        params: searchParams,
        headers: {
          'User-Agent': 'FairFare/1.0'
        },
        timeout: 3000 // 3 second timeout
      });

      let suggestions = response.data.map(item => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        
        // Calculate distance from user
        let distance = null;
        if (userLocation.current) {
          distance = calculateDistance(
            userLocation.current.lat, userLocation.current.lng,
            lat, lon
          );
        }

        // Determine if this is a POI result
        const itemIsPOI = item.class === 'shop' || 
                          item.class === 'amenity' || 
                          item.class === 'tourism' ||
                          item.class === 'leisure' ||
                          item.type === 'supermarket' ||
                          item.type === 'fast_food' ||
                          item.type === 'restaurant' ||
                          item.type === 'cafe' ||
                          item.type === 'pharmacy' ||
                          item.type === 'hotel';
        
        return {
          display_name: formatAddress(item),
          full_name: item.display_name,
          lat,
          lon,
          type: item.type,
          class: item.class,
          importance: item.importance || 0,
          distance,
          formattedDistance: formatDistance(distance),
          isPOI: itemIsPOI,
          poiCategory: itemIsPOI ? poiCategory : null,
          // Extract business name if available
          businessName: item.name || (item.address ? item.address.shop || item.address.amenity : null)
        };
      });

      // Enhanced sorting for POI searches
      if (userLocation.current) {
        suggestions.sort((a, b) => {
          // For POI searches, use distance-only sorting
          if (isPOI) {
            // Prioritize results that are actually POIs
            if (a.isPOI && !b.isPOI) return -1;
            if (!a.isPOI && b.isPOI) return 1;
            
            // Then sort by distance
            if (a.distance !== null && b.distance !== null) {
              return a.distance - b.distance;
            }
            return 0;
          }
          
          // For non-POI searches, balance importance and distance
          const importanceWeight = 0.3;
          const distanceWeight = 0.7;
          
          // Boost score for closer results with higher importance
          const scoreA = (a.importance * importanceWeight * 10) - 
                        (a.distance ? a.distance * distanceWeight : 0);
          const scoreB = (b.importance * importanceWeight * 10) - 
                        (b.distance ? b.distance * distanceWeight : 0);
          
          return scoreB - scoreA;
        });
      }

      // Remove duplicates and limit results
      const uniqueSuggestions = [];
      const seen = new Set();
      const seenNames = new Set();
      
      for (const sugg of suggestions) {
        // Create multiple keys for de-duplication
        const coordKey = `${sugg.lat.toFixed(4)},${sugg.lon.toFixed(4)}`;
        const nameKey = sugg.display_name.toLowerCase().trim();
        
        // Skip if we've seen these exact coordinates or very similar name
        if (seen.has(coordKey)) continue;
        if (seenNames.has(nameKey)) continue;
        
        seen.add(coordKey);
        seenNames.add(nameKey);
        uniqueSuggestions.push(sugg);
        
        // Limit to 6 results for POI, 5 for regular
        if (uniqueSuggestions.length >= (isPOI ? 6 : 5)) break;
      }

      // Cache the results
      searchCache.current.set(cacheKey, {
        results: uniqueSuggestions,
        timestamp: Date.now()
      });

      // Combine airport matches with search results
      const combined = [...airportSuggestions];
      for (const sugg of uniqueSuggestions) {
        const isDuplicate = combined.some(s => 
          Math.abs(s.lat - sugg.lat) < 0.01 && Math.abs(s.lon - sugg.lon) < 0.01
        );
        if (!isDuplicate) {
          combined.push(sugg);
        }
      }

      if (isPickup) {
        setPickupSuggestions(combined.slice(0, 6));
      } else {
        setDestSuggestions(combined.slice(0, 6));
      }
      
      console.log(`Search completed in ${Date.now() - startTime}ms (${isPOI ? 'POI' : 'standard'} search)`);
    } catch (error) {
      console.error("Address search error:", error);
      // Still show airport matches on error
      if (airportSuggestions.length > 0) {
        if (isPickup) setPickupSuggestions(airportSuggestions);
        else setDestSuggestions(airportSuggestions);
      }
    }
  };

  const detectLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setPickupCoords({ lat, lng });
          setDetectedCoords({ lat, lng }); // Store original GPS coords
          
          // Reverse geocode to get address
          const address = await reverseGeocode(lat, lng);
          setPickup(address);
          
          // Show banner and auto-hide after 3 seconds
          setShowLocationBanner(true);
          setTimeout(() => {
            setShowLocationBanner(false);
          }, 3000);
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
      setShowPickupSuggestions(true);
    }
    
    // Fast debounce for autocomplete (150ms for responsiveness)
    if (autocompleteTimer.current) {
      clearTimeout(autocompleteTimer.current);
    }
    
    autocompleteTimer.current = setTimeout(() => {
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

  const selectSuggestion = (suggestion, isPickup) => {
    if (isPickup) {
      setPickup(suggestion.display_name);
      // Lock coordinates to this exact location
      setPickupCoords({ lat: suggestion.lat, lng: suggestion.lon });
      // Clear detected coords since user explicitly selected a location
      setDetectedCoords(null);
      setPickupSuggestions([]);
      setShowPickupSuggestions(false);
      saveToRecent(suggestion.display_name);
      
      // Show confirmation for airport selections
      if (suggestion.isAirport) {
        toast.success(`✈️ ${suggestion.code} selected`, { duration: 2000 });
      }
      
      console.log('Pickup selected:', {
        address: suggestion.display_name,
        lat: suggestion.lat,
        lng: suggestion.lon,
        isAirport: suggestion.isAirport || false
      });
    } else {
      setDestination(suggestion.display_name);
      // Lock coordinates to this exact location
      setDestCoords({ lat: suggestion.lat, lng: suggestion.lon });
      setDestSuggestions([]);
      setShowDestSuggestions(false);
      saveToRecent(suggestion.display_name);
      
      // Show confirmation for airport selections
      if (suggestion.isAirport) {
        toast.success(`✈️ ${suggestion.code} selected`, { duration: 2000 });
      }
      
      console.log('Destination selected:', {
        address: suggestion.display_name,
        lat: suggestion.lat,
        lng: suggestion.lon,
        isAirport: suggestion.isAirport || false
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
    // Use detectedCoords as fallback for pickup if pickupCoords not set
    const hasPickupCoords = (pickupCoords?.lat && pickupCoords?.lng) || (detectedCoords?.lat && detectedCoords?.lng);
    return (
      pickup &&
      destination &&
      hasPickupCoords &&
      destCoords?.lat &&
      destCoords?.lng
    );
  };

  // Get validation message for the compare button
  const getValidationMessage = () => {
    if (!pickup) return "Enter pickup location";
    if (!destination) return "Enter destination";
    const hasPickupCoords = (pickupCoords?.lat && pickupCoords?.lng) || (detectedCoords?.lat && detectedCoords?.lng);
    if (!hasPickupCoords) return "Select pickup from suggestions";
    if (!destCoords?.lat || !destCoords?.lng) return "Select destination from suggestions";
    return null;
  };

  const compareRides = async () => {
    if (!pickup || !destination) {
      toast.error("Please enter both pickup and destination");
      return;
    }

    // Use detectedCoords as fallback for pickup coordinates
    const finalPickupCoords = (pickupCoords?.lat && pickupCoords?.lng) 
      ? pickupCoords 
      : detectedCoords;

    // Validate that we have coordinates
    if (!finalPickupCoords?.lat || !finalPickupCoords?.lng) {
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
          lat: finalPickupCoords.lat,
          lng: finalPickupCoords.lng,
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
    <svg width={size} height={size} viewBox="0 0 48 48" className={`fairfare-logo ${className}`}>
      <defs>
        <filter id="logoGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#logoGlow)">
        {/* Outer F stroke */}
        <path d="M12 6 L12 42" stroke="#00FF88" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M12 6 Q24 6 32 6 Q38 6 38 12" stroke="#00FF88" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M12 24 L28 24" stroke="#00FF88" strokeWidth="3" strokeLinecap="round" fill="none"/>
        {/* Inner F stroke (double-line effect) */}
        <path d="M15 10 L15 38" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
        <path d="M15 10 Q24 10 30 10 Q34 10 34 14" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
        <path d="M15 24 L26 24" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
      </g>
      {/* Route dots */}
      <circle cx="32" cy="24" r="2.5" fill="#00FF88"/>
      <circle cx="38" cy="24" r="1.8" fill="#00FF88" opacity="0.7"/>
      <circle cx="42" cy="24" r="1.2" fill="#00FF88" opacity="0.5"/>
      <circle cx="12" cy="42" r="2" fill="#00FF88"/>
      <circle cx="38" cy="12" r="2" fill="#00FF88"/>
    </svg>
  );

  return (
    <div className="app-container">
      <Toaster position="top-center" richColors />
      
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
                            className={`suggestion-item ${suggestion.isAirport ? 'airport' : ''} ${suggestion.isPOI ? 'poi' : ''}`}
                            onClick={() => selectSuggestion(suggestion, true)}
                            data-testid={`pickup-suggestion-${idx}`}
                          >
                            {suggestion.isAirport ? (
                              <>
                                <span className="airport-badge">✈ {suggestion.code}</span>
                                <div className="suggestion-details">
                                  <span className="suggestion-main">{suggestion.display_name.split(',')[0]}</span>
                                  <span className="suggestion-sub">
                                    {suggestion.display_name.split(',').slice(1).join(',').trim()}
                                    {suggestion.formattedDistance && (
                                      <span className="suggestion-distance"> • {suggestion.formattedDistance}</span>
                                    )}
                                  </span>
                                </div>
                              </>
                            ) : suggestion.isPOI ? (
                              <>
                                <Store size={16} className="suggestion-icon poi-icon" />
                                <div className="suggestion-details">
                                  <span className="suggestion-main">{suggestion.display_name}</span>
                                  {suggestion.formattedDistance && (
                                    <span className="suggestion-distance-badge">{suggestion.formattedDistance}</span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <MapPin size={16} className="suggestion-icon" />
                                <div className="suggestion-details">
                                  <span className="suggestion-main">{suggestion.display_name}</span>
                                  {suggestion.formattedDistance && (
                                    <span className="suggestion-distance-badge">{suggestion.formattedDistance}</span>
                                  )}
                                </div>
                              </>
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
                            className={`suggestion-item ${suggestion.isAirport ? 'airport' : ''}`}
                            onClick={() => selectSuggestion(suggestion, false)}
                          >
                            {suggestion.isAirport ? (
                              <>
                                <span className="airport-badge">✈ {suggestion.code}</span>
                                <div className="suggestion-details">
                                  <span className="suggestion-main">{suggestion.display_name.split(',')[0]}</span>
                                  <span className="suggestion-sub">{suggestion.display_name.split(',').slice(1).join(',').trim()}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <MapPin size={16} className="suggestion-icon" />
                                <span className="suggestion-text">{suggestion.display_name}</span>
                              </>
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

            <button
              data-testid="compare-btn"
              onClick={compareRides}
              disabled={loading || !canCompare()}
              className="compare-button"
            >
              {loading ? "Finding fares..." : canCompare() ? "Find My Fare" : getValidationMessage()}
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

          {/* Savings Summary & Share Card */}
          <div className="share-savings-card" data-testid="share-savings-card">
            <h3 className="share-card-title">Your Comparison</h3>
            <div className="price-comparison-list">
              {results.estimates.map((estimate, idx) => (
                <div key={idx} className={`price-row ${getBestOption() === estimate.provider ? 'best' : ''}`}>
                  <span className="price-provider">{estimate.provider}</span>
                  <span className="price-value">
                    {getBestOption() === estimate.provider && <span className="best-tag">Best</span>}
                    ~${(18 + idx * 5).toFixed(2)}
                  </span>
                </div>
              ))}
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
                      <span className="current-price">${route.currentPrice.toFixed(2)}</span>
                      <span className={`price-change ${route.percentChange < 0 ? 'down' : route.percentChange > 0 ? 'up' : ''}`}>
                        {route.percentChange > 0 ? '+' : ''}{route.percentChange}%
                      </span>
                    </div>
                  </div>
                  <div className="route-meta">
                    <span className="last-checked">
                      <Clock size={12} />
                      Checked {getTimeAgo(route.lastChecked)}
                    </span>
                    <span className="best-provider">Best: {route.bestProvider}</span>
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

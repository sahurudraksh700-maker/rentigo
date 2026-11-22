import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  ApprovalStatus,
  AppView,
  BookedRange,
  Category,
  ItemCondition,
  Listing,
  ListingReport,
  RentalRequest,
  SavedItem,
  SeedState,
  SiteSettings,
  ToastMessage,
  UserProfile,
  UserReview,
} from './types/marketplace';
import { isAdminEmail } from './config/adminEmails.js';
import { findStateByCity } from './data/indiaLocations';
import {
  GeoCoordinates,
  getGoogleMapsApiKey,
  haversineDistanceKm,
  isValidCoordinatePair,
} from './utils/locationUtils';
import {
  AppPermissionsState,
  readPendingPhone,
  readStoredPermissions,
  savePendingPhone,
  saveStoredPermissions,
} from './utils/permissionUtils';
import {
  cancelRentalRequest,
  computeUserRatingSummary,
  createListing,
  createRentalRequest,
  createSafeId,
  DEFAULT_SEED_STATE,
  deleteListingById,
  getCachedCategories,
  getCachedSeedState,
  getCachedSiteSettings,
  getSeedDataBaseline,
  markRentalReturned,
  promoteSeedListing,
  readStorageJson,
  resetGlobalSeedData,
  respondToRentalRequest,
  saveCategories,
  saveSeedState,
  saveSiteSettings,
  saveUserProfile,
  setUserBlocked,
  signInWithGoogle,
  signOutUser,
  STORAGE_KEYS,
  submitListingReport,
  submitRentalReview,
  subscribeAdminData,
  subscribeAuth,
  subscribeCategories,
  subscribeListings,
  subscribeReviews,
  subscribeSavedItems,
  subscribeSeedState,
  subscribeSiteSettings,
  subscribeUserRequests,
  toggleSavedItem,
  updateListing,
  updateReportStatus,
  writeStorageJson,
} from './services/db.js';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import {
  AvailabilityFilter,
  HomeMarketplace,
  MarketplaceViewMode,
  PriceFilter,
  SortOption,
} from './components/HomeMarketplace';
import { CityPlaceResolver } from './components/CityPlaceResolver';
import { ListingDetail } from './components/ListingDetail';
import { ListingFormModal } from './components/ListingFormModal';
import { RequestModal } from './components/RequestModal';
import { Dashboard } from './components/Dashboard';
import { ProfileModal } from './components/ProfileModal';
import { ReportModal } from './components/ReportModal';
import { SafetyPage } from './components/SafetyPage';
import { AdminPanel } from './components/AdminPanel';
import { PermissionsModal } from './components/PermissionsModal';
import { ToastContainer } from './components/ToastContainer';

function OptionalMapsProvider({
  apiKey,
  children,
}: {
  apiKey: string;
  children: ReactNode;
}) {
  if (!apiKey) {
    return <>{children}</>;
  }
  return (
    <APIProvider
      apiKey={apiKey}
      language="en"
      region="IN"
      libraries={['places', 'marker']}
    >
      {children}
    </APIProvider>
  );
}

function resolveInitialView(): AppView {
  if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
    return 'admin';
  }
  return 'home';
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.THEME) === 'dark';
    } catch {
      return false;
    }
  });

  const [currentView, setCurrentView] = useState<AppView>(resolveInitialView);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(
    null
  );

  // Live Site Settings, Categories & Global Seed State
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() =>
    getCachedSiteSettings()
  );
  const [categories, setCategories] = useState<string[]>(() =>
    getCachedCategories()
  );
  const [seedState, setSeedState] = useState<SeedState>(() =>
    getCachedSeedState()
  );

  // Auth & User Profile
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Firestore Live Data + Local Seed Booking Demo State
  const [firestoreListings, setFirestoreListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [seedBookingsMap, setSeedBookingsMap] = useState<
    Record<string, BookedRange[]>
  >(() => readStorageJson(STORAGE_KEYS.SEED_BOOKINGS, {}));
  const [seedRequests, setSeedRequests] = useState<RentalRequest[]>(() =>
    readStorageJson(STORAGE_KEYS.SEED_REQUESTS, [])
  );

  const [incomingFsRequests, setIncomingFsRequests] = useState<RentalRequest[]>(
    []
  );
  const [myFsRentals, setMyFsRentals] = useState<RentalRequest[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  // Admin Console Live Data
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminFsRequests, setAdminFsRequests] = useState<RentalRequest[]>([]);
  const [adminReports, setAdminReports] = useState<ListingReport[]>([]);

  // Search, Filters, Location & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>(
    'All'
  );
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Location, Nearby Renters & Google Maps State
  const mapsApiKey = useMemo(() => getGoogleMapsApiKey(), []);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(25);
  const [gpsCoords, setGpsCoords] = useState<GeoCoordinates | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<MarketplaceViewMode>('grid');
  const [resolvedCityCoords, setResolvedCityCoords] = useState<
    Record<string, GeoCoordinates>
  >({});
  const [resolvedListingCoords, setResolvedListingCoords] = useState<
    Record<string, GeoCoordinates>
  >({});

  // Modals & Toasts
  const [listingFormOpen, setListingFormOpen] = useState(false);
  const [listingFormOfficialMode, setListingFormOfficialMode] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [requestModalListing, setRequestModalListing] =
    useState<Listing | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [permissionsState, setPermissionsState] = useState<AppPermissionsState>(
    () => readStoredPermissions()
  );
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [reportModalListing, setReportModalListing] = useState<Listing | null>(
    null
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isAuthorizedAdmin = isAdminEmail(userProfile?.email);

  const missingPermissionsCount = useMemo(() => {
    const hasPhone =
      permissionsState.phone === 'granted' ||
      Boolean(userProfile?.phone && userProfile.phone.length >= 7);
    let count = 0;
    if (permissionsState.location !== 'granted') count += 1;
    if (!hasPhone) count += 1;
    if (permissionsState.storage !== 'granted') count += 1;
    if (permissionsState.camera !== 'granted') count += 1;
    return count;
  }, [permissionsState, userProfile?.phone]);

  const addToast = (type: ToastMessage['type'], text: string) => {
    const id = createSafeId('toast');
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  // Sync browser URL path for /admin and browser Back/Forward
  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    const targetPath = view === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ view }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(
        window.location.pathname === '/admin' ? 'admin' : 'home'
      );
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [darkMode]);

  // Sync dynamic brand title & live accent color from SiteSettings
  useEffect(() => {
    const safeAccent = /^#[0-9A-Fa-f]{6}$/.test(siteSettings.accentColor)
      ? siteSettings.accentColor
      : '#2563EB';
    document.documentElement.style.setProperty('--accent', safeAccent);
    document.title = `${siteSettings.brandName} — ${siteSettings.tagline}`;
  }, [siteSettings]);

  // Tier 1/2 Google Maps Quota Exceeded Global Listener
  useEffect(() => {
    const onQuotaExceeded = () => {
      setQuotaExceeded(true);
    };
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
    };
  }, []);

  // Persist local seed demo booking states
  useEffect(() => {
    writeStorageJson(STORAGE_KEYS.SEED_REQUESTS, seedRequests);
  }, [seedRequests]);

  useEffect(() => {
    writeStorageJson(STORAGE_KEYS.SEED_BOOKINGS, seedBookingsMap);
  }, [seedBookingsMap]);

  // 1. Live Site Settings, Categories & Global Seed State Subscriptions
  useEffect(() => {
    const unsubSite = subscribeSiteSettings((updated: SiteSettings) => {
      setSiteSettings(updated);
    });
    const unsubCats = subscribeCategories((items: string[]) => {
      setCategories(items);
    });
    const unsubSeedState = subscribeSeedState((nextSeedState: SeedState) => {
      setSeedState(nextSeedState);
    });
    return () => {
      unsubSite();
      unsubCats();
      unsubSeedState();
    };
  }, []);

  // 2. Auth Listener
  useEffect(() => {
    const unsubscribe = subscribeAuth((profile: UserProfile | null) => {
      setUserProfile(profile);
      if (!profile) {
        setIncomingFsRequests([]);
        setMyFsRentals([]);
        setSavedItems([]);
        setAdminUsers([]);
        setAdminFsRequests([]);
        setAdminReports([]);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2b. First-visit Permissions Prompt & Pending Phone Sync
  useEffect(() => {
    if (!authReady) return;
    if (!permissionsState.promptedOnce) {
      const timer = window.setTimeout(() => {
        setPermissionsModalOpen(true);
      }, 700);
      return () => window.clearTimeout(timer);
    }
  }, [authReady, permissionsState.promptedOnce]);

  useEffect(() => {
    if (!authReady || !userProfile) return;
    const pendingPhone = readPendingPhone();
    if (pendingPhone && pendingPhone.length >= 7 && !userProfile.phone) {
      saveUserProfile(userProfile, {
        displayName: userProfile.displayName,
        college: userProfile.college,
        phone: pendingPhone,
        photoUrl: userProfile.photoUrl,
        ...(userProfile.state ? { state: userProfile.state } : {}),
        ...(userProfile.city ? { city: userProfile.city } : {}),
        ...(isValidCoordinatePair(userProfile.lat, userProfile.lng)
          ? { lat: userProfile.lat, lng: userProfile.lng }
          : {}),
      })
        .then((updated) => {
          if (updated) {
            setUserProfile(updated);
            savePendingPhone('');
            setPermissionsState((prev) =>
              saveStoredPermissions({ ...prev, phone: 'granted' })
            );
          }
        })
        .catch(() => {
          // Will keep pending phone in storage to retry later
        });
    }
  }, [authReady, userProfile]);

  // 3. Public Listings Listener
  useEffect(() => {
    const unsubscribe = subscribeListings(
      (docs: Listing[]) => {
        setFirestoreListings(docs);
        setListingsLoading(false);
      },
      () => {
        setListingsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 3b. Public User Reviews Listener
  useEffect(() => {
    const unsubscribe = subscribeReviews((docs: UserReview[]) => {
      setReviews(docs);
    });
    return () => unsubscribe();
  }, []);

  // 4. Authenticated User Rental Requests & Saved Items Listeners
  useEffect(() => {
    if (!authReady || !userProfile) return;
    const unsubReqs = subscribeUserRequests(
      userProfile.uid,
      (incoming: RentalRequest[]) => setIncomingFsRequests(incoming),
      (mine: RentalRequest[]) => setMyFsRentals(mine)
    );
    const unsubSaved = subscribeSavedItems(
      userProfile.uid,
      (items: SavedItem[]) => setSavedItems(items)
    );
    return () => {
      unsubReqs();
      unsubSaved();
    };
  }, [authReady, userProfile]);

  const savedListingIds = useMemo(
    () => new Set(savedItems.map((item) => item.listingId)),
    [savedItems]
  );

  // 5. Admin-Only Collections Listener
  useEffect(() => {
    if (!authReady || !userProfile || !isAuthorizedAdmin) return;
    return subscribeAdminData(
      (usersList: UserProfile[]) => setAdminUsers(usersList),
      (reqsList: RentalRequest[]) => setAdminFsRequests(reqsList),
      (repsList: ListingReport[]) => setAdminReports(repsList)
    );
  }, [authReady, userProfile, isAuthorizedAdmin]);

  // Combined Listings: Live Firestore + Starter Seed Campus Listings (with global Firestore seedState)
  const allListings = useMemo(() => {
    const baseline = getSeedDataBaseline() as Listing[];
    const firestoreIdSet = new Set(firestoreListings.map((l) => l.id));
    const deletedSet = new Set(seedState.deletedIds);
    const hiddenSet = new Set(seedState.hiddenIds);
    const featuredSet = new Set(seedState.featuredIds);
    const unfeaturedSet = new Set(seedState.unfeaturedIds);

    const visibleFirestoreListings = firestoreListings
      .filter((l) => !deletedSet.has(l.id))
      .map((listing) => {
        const summary = computeUserRatingSummary(
          reviews,
          listing.ownerId,
          listing.isSeed ? listing.ownerRating : null
        );
        return {
          ...listing,
          ownerRating: summary.average ?? 0,
          ownerReviewCount: summary.count,
        };
      });

    const hydratedSeeds: Listing[] = baseline
      .filter((seed) => !firestoreIdSet.has(seed.id) && !deletedSet.has(seed.id))
      .map((seed) => {
        const extraBooked = seedBookingsMap[seed.id] || [];
        const isHidden = hiddenSet.has(seed.id);
        const isFeatured = featuredSet.has(seed.id)
          ? true
          : unfeaturedSet.has(seed.id)
            ? false
            : seed.featured;
        const summary = computeUserRatingSummary(
          reviews,
          seed.ownerId,
          seed.ownerRating
        );

        return {
          ...seed,
          status: isHidden ? 'Paused' : seed.status,
          featured: isFeatured,
          bookedRanges: [...seed.bookedRanges, ...extraBooked],
          ownerRating: summary.average ?? seed.ownerRating,
          ownerReviewCount: summary.count,
        };
      });

    return [...visibleFirestoreListings, ...hydratedSeeds];
  }, [firestoreListings, seedBookingsMap, seedState, reviews]);

  const handleResolveCityCoords = useCallback(
    (key: string, coords: GeoCoordinates) => {
      setResolvedCityCoords((prev) =>
        prev[key] ? prev : { ...prev, [key]: coords }
      );
    },
    []
  );

  const handleResolveListingCoords = useCallback(
    (updates: Record<string, GeoCoordinates>) => {
      setResolvedListingCoords((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const handleRequestGpsLocation = useCallback(
    (autoEnableNearby = false) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        addToast('error', 'GPS geolocation is not supported in this browser.');
        return;
      }
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLoading(false);
          setGpsCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
          if (autoEnableNearby) {
            setNearbyEnabled(true);
          }
          setSortBy('nearest');
          addToast('success', 'GPS location active — showing distances.');
        },
        (err) => {
          setGpsLoading(false);
          if (err.code === err.PERMISSION_DENIED) {
            addToast(
              'info',
              'Location permission denied. Select a State & City to find nearby renters.'
            );
          } else {
            addToast(
              'info',
              'Could not read GPS right now. Select a State & City instead.'
            );
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    },
    []
  );

  const handleStateChange = (nextState: string) => {
    setSelectedState(nextState);
    if (!nextState) {
      setSelectedCity('');
    }
  };

  const handleCityChange = (nextCity: string) => {
    setSelectedCity(nextCity);
    if (nextCity && !selectedState) {
      const inferred = findStateByCity(nextCity);
      if (inferred) setSelectedState(inferred);
    }
  };

  const handleToggleNearby = () => {
    if (nearbyEnabled) {
      setNearbyEnabled(false);
      if (sortBy === 'nearest' && !gpsCoords && !selectedCity) {
        setSortBy('newest');
      }
      return;
    }

    if (gpsCoords || selectedCity || isValidCoordinatePair(userProfile?.lat, userProfile?.lng)) {
      setNearbyEnabled(true);
      setSortBy('nearest');
      return;
    }

    handleRequestGpsLocation(true);
  };

  const selectedCityKey = `${selectedState}::${selectedCity}`;
  const activeReference = useMemo<{
    coords: GeoCoordinates;
    label: string;
  } | null>(() => {
    if (gpsCoords) {
      return { coords: gpsCoords, label: 'Your GPS Location' };
    }
    if (selectedCity && resolvedCityCoords[selectedCityKey]) {
      return {
        coords: resolvedCityCoords[selectedCityKey],
        label: selectedCity,
      };
    }
    if (
      nearbyEnabled &&
      userProfile &&
      isValidCoordinatePair(userProfile.lat, userProfile.lng)
    ) {
      return {
        coords: { lat: userProfile.lat!, lng: userProfile.lng! },
        label: userProfile.city || 'Your Campus',
      };
    }
    return null;
  }, [
    gpsCoords,
    selectedCity,
    selectedCityKey,
    resolvedCityCoords,
    nearbyEnabled,
    userProfile,
  ]);

  // Public Browse Filtering + Location / Nearby Renter Distance + Featured-First Sorting
  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const withDistances = allListings.map((item) => {
      const itemLat = isValidCoordinatePair(item.lat, item.lng)
        ? item.lat!
        : resolvedListingCoords[item.id]?.lat;
      const itemLng = isValidCoordinatePair(item.lat, item.lng)
        ? item.lng!
        : resolvedListingCoords[item.id]?.lng;

      if (
        activeReference &&
        typeof itemLat === 'number' &&
        typeof itemLng === 'number'
      ) {
        return {
          ...item,
          distanceKm: haversineDistanceKm(
            activeReference.coords.lat,
            activeReference.coords.lng,
            itemLat,
            itemLng
          ),
        };
      }
      return { ...item, distanceKm: undefined };
    });

    const list = withDistances.filter((item) => {
      const isViewerOwner =
        Boolean(userProfile) && item.ownerId === userProfile?.uid;

      // Hide Paused listings and unapproved items from public marketplace
      if (!isViewerOwner && item.status === 'Paused') {
        return false;
      }
      if (!isViewerOwner && item.approvalStatus !== 'Approved') {
        return false;
      }

      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      if (availabilityFilter === 'available' && item.status !== 'Available') {
        return false;
      }

      if (priceFilter === 'under150' && item.pricePerDay >= 150) {
        return false;
      }
      if (
        priceFilter === '150to350' &&
        (item.pricePerDay < 150 || item.pricePerDay > 350)
      ) {
        return false;
      }
      if (priceFilter === 'over350' && item.pricePerDay <= 350) {
        return false;
      }

      // Location & Nearby Renter Filtering
      if (nearbyEnabled) {
        if (activeReference) {
          if (typeof item.distanceKm === 'number') {
            if (item.distanceKm > nearbyRadiusKm) return false;
          } else {
            // Fallback match when coordinates for a specific item are unavailable
            if (selectedCity && item.city !== selectedCity) return false;
            if (selectedState && !selectedCity && item.state !== selectedState) {
              return false;
            }
          }
        } else {
          if (selectedState && item.state !== selectedState) return false;
          if (selectedCity && item.city !== selectedCity) return false;
        }
      } else {
        if (selectedState && item.state !== selectedState) {
          return false;
        }
        if (selectedCity && item.city !== selectedCity) {
          return false;
        }
      }

      if (q) {
        const haystack = `${item.title} ${item.description} ${item.category} ${item.ownerCollege} ${item.pickupLocation} ${item.city || ''} ${item.state || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    // Sort: when Nearest First is active, sort by proximity; otherwise Featured first
    return [...list].sort((a, b) => {
      if (sortBy === 'nearest' && activeReference) {
        const distA =
          typeof a.distanceKm === 'number'
            ? a.distanceKm
            : Number.POSITIVE_INFINITY;
        const distB =
          typeof b.distanceKm === 'number'
            ? b.distanceKm
            : Number.POSITIVE_INFINITY;
        if (distA !== distB) return distA - distB;
      }
      if (a.featured !== b.featured) {
        return a.featured ? -1 : 1;
      }
      if (sortBy === 'price-asc') return a.pricePerDay - b.pricePerDay;
      if (sortBy === 'price-desc') return b.pricePerDay - a.pricePerDay;
      return b.createdAtMs - a.createdAtMs;
    });
  }, [
    allListings,
    resolvedListingCoords,
    activeReference,
    searchQuery,
    selectedCategory,
    priceFilter,
    availabilityFilter,
    selectedState,
    selectedCity,
    nearbyEnabled,
    nearbyRadiusKm,
    sortBy,
    userProfile,
  ]);

  const selectedListing = useMemo(() => {
    const found = allListings.find((l) => l.id === selectedListingId);
    if (!found) return null;
    const matchWithDist = filteredListings.find((l) => l.id === found.id);
    return matchWithDist || found;
  }, [allListings, filteredListings, selectedListingId]);

  const myListings = useMemo(() => {
    if (!userProfile) return [];
    return firestoreListings
      .filter((l) => l.ownerId === userProfile.uid)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [firestoreListings, userProfile]);

  const myRentalsCombined = useMemo(() => {
    if (!userProfile) return [];
    const userSeedRentals = seedRequests.filter(
      (r) => r.renterId === userProfile.uid
    );
    return [...myFsRentals, ...userSeedRentals].sort(
      (a, b) => b.createdAtMs - a.createdAtMs
    );
  }, [myFsRentals, seedRequests, userProfile]);

  const adminCombinedRequests = useMemo(() => {
    return [...adminFsRequests, ...seedRequests].sort(
      (a, b) => b.createdAtMs - a.createdAtMs
    );
  }, [adminFsRequests, seedRequests]);

  const pendingIncomingCount = incomingFsRequests.filter(
    (r) => r.status === 'Pending'
  ).length;

  // Auth & User Handlers
  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      addToast('success', 'Signed in with Google.');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Google sign-in was cancelled.';
      addToast('error', msg);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setProfileModalOpen(false);
    if (currentView === 'admin') {
      navigateTo('home');
    }
    addToast('info', `Signed out of ${siteSettings.brandName}.`);
  };

  const handleOpenAddListing = (officialMode = false) => {
    if (!userProfile) {
      addToast('info', 'Please sign in with Google to post an item.');
      void handleSignIn();
      return;
    }
    if (userProfile.blocked) {
      addToast(
        'error',
        'Your account is currently restricted from posting new listings.'
      );
      return;
    }
    setEditingListing(null);
    setListingFormOfficialMode(officialMode);
    setListingFormOpen(true);
  };

  const handleSaveListing = async (data: {
    title: string;
    description: string;
    category: Category;
    photos: string[];
    pricePerDay: number;
    deposit: number;
    condition: ItemCondition;
    pickupLocation: string;
    state?: string;
    city?: string;
    lat?: number;
    lng?: number;
    availableFrom: string;
    availableTo: string;
    featured?: boolean;
  }) => {
    if (!userProfile) return;

    if (editingListing) {
      if (editingListing.isSeed) {
        await promoteSeedListing(editingListing, {
          title: data.title,
          description: data.description,
          category: data.category,
          photos: data.photos,
          pricePerDay: data.pricePerDay,
          deposit: data.deposit,
          condition: data.condition,
          pickupLocation: data.pickupLocation,
          state: data.state,
          city: data.city,
          lat: data.lat,
          lng: data.lng,
          availableFrom: data.availableFrom,
          availableTo: data.availableTo,
          status: editingListing.status,
          ...(typeof data.featured === 'boolean'
            ? { featured: data.featured }
            : {}),
        });
        setListingFormOpen(false);
        setEditingListing(null);
        addToast('success', 'Item updated globally for all visitors.');
        return;
      }

      await updateListing(editingListing, {
        title: data.title,
        description: data.description,
        category: data.category,
        photos: data.photos,
        pricePerDay: data.pricePerDay,
        deposit: data.deposit,
        condition: data.condition,
        pickupLocation: data.pickupLocation,
        state: data.state,
        city: data.city,
        lat: data.lat,
        lng: data.lng,
        availableFrom: data.availableFrom,
        availableTo: data.availableTo,
        ...(isAuthorizedAdmin && typeof data.featured === 'boolean'
          ? { featured: data.featured }
          : {}),
      });
      setListingFormOpen(false);
      setEditingListing(null);
      addToast('success', 'Listing updated.');
      return;
    }

    const res = await createListing(userProfile, data, {
      asSiteOfficial: listingFormOfficialMode && isAuthorizedAdmin,
      siteBrandName: siteSettings.brandName,
      featured: Boolean(data.featured),
      requireApproval: siteSettings.requireApproval,
    });
    setListingFormOpen(false);
    setListingFormOfficialMode(false);

    if (res?.approvalStatus === 'Pending') {
      addToast(
        'info',
        'Listing submitted! It will go live once approved by the campus admin.'
      );
      navigateTo('dashboard');
    } else {
      addToast('success', 'Your item is now live on campus!');
      if (currentView !== 'admin') {
        navigateTo('dashboard');
      }
    }
  };

  const handleTogglePauseListing = async (listing: Listing) => {
    const nextStatus = listing.status === 'Paused' ? 'Available' : 'Paused';
    if (listing.isSeed) {
      const nextHidden =
        nextStatus === 'Paused'
          ? Array.from(new Set([...seedState.hiddenIds, listing.id]))
          : seedState.hiddenIds.filter((id) => id !== listing.id);
      const saved = await saveSeedState({
        ...seedState,
        hiddenIds: nextHidden,
      });
      if (saved) setSeedState(saved);
      addToast(
        'info',
        nextStatus === 'Paused'
          ? 'Item hidden globally from all visitors.'
          : 'Item is visible again to all visitors.'
      );
      return;
    }

    await updateListing(listing, {
      status: nextStatus,
      bookedRanges: listing.bookedRanges,
    });
    addToast(
      'info',
      nextStatus === 'Paused'
        ? 'Listing hidden from marketplace.'
        : 'Listing is live again.'
    );
  };

  const handleDeleteListing = async (listing: Listing) => {
    if (listing.isSeed) {
      const saved = await saveSeedState({
        deletedIds: Array.from(new Set([...seedState.deletedIds, listing.id])),
        hiddenIds: seedState.hiddenIds.filter((id) => id !== listing.id),
        featuredIds: seedState.featuredIds.filter((id) => id !== listing.id),
        unfeaturedIds: seedState.unfeaturedIds.filter((id) => id !== listing.id),
      });
      if (saved) setSeedState(saved);
    } else {
      await deleteListingById(listing.id);
    }

    if (selectedListingId === listing.id) {
      setSelectedListingId(null);
      navigateTo('home');
    }
    addToast('info', 'Item removed globally from the site.');
  };

  const handleSubmitRequest = async (payload: {
    startDate: string;
    endDate: string;
    days: number;
    totalAmount: number;
    message: string;
  }) => {
    if (!userProfile || !requestModalListing) return;
    if (userProfile.blocked) {
      addToast(
        'error',
        'Your account is currently restricted and cannot send rental requests.'
      );
      setRequestModalListing(null);
      return;
    }

    const listing = requestModalListing;
    if (listing.isSeed) {
      const reqId = createSafeId('req');
      const safePhoto =
        listing.photos[0] && listing.photos[0].length <= 220000
          ? listing.photos[0]
          : '';
      const seedReq: RentalRequest = {
        id: reqId,
        listingId: listing.id,
        listingTitle: listing.title.slice(0, 100),
        listingPhoto: safePhoto,
        pickupLocation: listing.pickupLocation,
        ownerId: listing.ownerId,
        ownerName: listing.ownerName,
        ownerCollege: listing.ownerCollege,
        ownerContact: '',
        renterId: userProfile.uid,
        renterName: userProfile.displayName,
        renterCollege: userProfile.college,
        renterPhotoUrl: userProfile.photoUrl,
        startDate: payload.startDate,
        endDate: payload.endDate,
        days: payload.days,
        pricePerDay: listing.pricePerDay,
        deposit: listing.deposit,
        totalAmount: payload.totalAmount,
        message: payload.message,
        status: 'Pending',
        createdAtMs: Date.now(),
        isSeed: true,
      };
      setSeedRequests((prev) => [seedReq, ...prev]);
      setSeedBookingsMap((prev) => ({
        ...prev,
        [listing.id]: [
          ...(prev[listing.id] || []),
          {
            startDate: payload.startDate,
            endDate: payload.endDate,
            requestId: reqId,
          },
        ],
      }));
      setRequestModalListing(null);
      navigateTo('dashboard');
      addToast(
        'success',
        'Rental request sent! Track its status in Dashboard → My Rentals.'
      );
      return;
    }

    await createRentalRequest(userProfile, listing, payload);
    setRequestModalListing(null);
    navigateTo('dashboard');
    addToast('success', 'Rental request sent to owner!');
  };

  const handleRespondToRequest = async (
    request: RentalRequest,
    decision: 'Accepted' | 'Declined'
  ) => {
    if (!userProfile) return;

    if (
      decision === 'Accepted' &&
      (!userProfile.phone || userProfile.phone.length < 7)
    ) {
      addToast(
        'info',
        'Please add your WhatsApp/phone number first so the renter can contact you.'
      );
      setProfileModalOpen(true);
      return;
    }

    const targetListing = firestoreListings.find(
      (l) => l.id === request.listingId
    );
    await respondToRentalRequest(
      request,
      decision,
      userProfile.phone || '',
      targetListing
    );
    addToast(
      decision === 'Accepted' ? 'success' : 'info',
      decision === 'Accepted'
        ? 'Request accepted and WhatsApp contact shared.'
        : 'Request declined.'
    );
  };

  const handleMarkReturned = async (request: RentalRequest) => {
    const targetListing = firestoreListings.find(
      (l) => l.id === request.listingId
    );
    await markRentalReturned(request, targetListing);
    addToast('success', 'Item marked as returned and available again.');
  };

  const handleCancelRequest = async (request: RentalRequest) => {
    if (request.isSeed) {
      setSeedRequests((prev) =>
        prev.map((r) =>
          r.id === request.id ? { ...r, status: 'Cancelled' } : r
        )
      );
      setSeedBookingsMap((prev) => ({
        ...prev,
        [request.listingId]: (prev[request.listingId] || []).filter(
          (b) => b.requestId !== request.id
        ),
      }));
      addToast('info', 'Rental request cancelled.');
      return;
    }

    await cancelRentalRequest(request.id);
    if (request.status === 'Accepted') {
      const targetListing = firestoreListings.find(
        (l) => l.id === request.listingId
      );
      if (targetListing) {
        const nextRanges = targetListing.bookedRanges.filter(
          (r) => r.requestId !== request.id
        );
        await updateListing(targetListing, {
          bookedRanges: nextRanges,
          status: nextRanges.length > 0 ? 'Rented' : 'Available',
        });
      }
    }
    addToast('info', 'Rental request cancelled.');
  };

  const handleSimulateSeedApproval = (request: RentalRequest) => {
    const seedItems = getSeedDataBaseline() as Listing[];
    const seedItem = seedItems.find((s) => s.id === request.listingId);
    const contactPhone = seedItem?.seedOwnerPhone || '+91 98204 51290';
    setSeedRequests((prev) =>
      prev.map((r) =>
        r.id === request.id
          ? { ...r, status: 'Accepted', ownerContact: contactPhone }
          : r
      )
    );
    addToast(
      'success',
      'Owner accepted your request! WhatsApp contact unlocked.'
    );
  };

  const handleSaveProfile = async (updates: {
    displayName: string;
    college: string;
    phone: string;
    photoUrl: string;
    state?: string;
    city?: string;
    lat?: number;
    lng?: number;
  }) => {
    if (!userProfile) return;
    const updated = await saveUserProfile(userProfile, updates);
    if (updated) {
      setUserProfile(updated);
    }
    setProfileModalOpen(false);
    addToast('success', 'Profile and campus location saved.');
  };

  const handlePermissionLocationGranted = async (coords: GeoCoordinates) => {
    setGpsCoords(coords);
    if (userProfile && !isValidCoordinatePair(userProfile.lat, userProfile.lng)) {
      try {
        const updated = await saveUserProfile(userProfile, {
          displayName: userProfile.displayName,
          college: userProfile.college,
          phone: userProfile.phone || '',
          photoUrl: userProfile.photoUrl,
          ...(userProfile.state ? { state: userProfile.state } : {}),
          ...(userProfile.city ? { city: userProfile.city } : {}),
          lat: coords.lat,
          lng: coords.lng,
        });
        if (updated) setUserProfile(updated);
      } catch {
        // Non-fatal: GPS coordinates remain active in session state
      }
    }
  };

  const handlePermissionSavePhone = async (phone: string) => {
    if (!userProfile) return;
    const updated = await saveUserProfile(userProfile, {
      displayName: userProfile.displayName,
      college: userProfile.college,
      phone,
      photoUrl: userProfile.photoUrl,
      ...(userProfile.state ? { state: userProfile.state } : {}),
      ...(userProfile.city ? { city: userProfile.city } : {}),
      ...(isValidCoordinatePair(userProfile.lat, userProfile.lng)
        ? { lat: userProfile.lat, lng: userProfile.lng }
        : {}),
    });
    if (updated) {
      setUserProfile(updated);
    }
    addToast('success', 'Phone number saved privately for rental handovers.');
  };

  const handleSubmitReport = async (reason: string, details: string) => {
    if (!reportModalListing) return;
    if (!userProfile) {
      addToast('info', 'Please sign in with Google to submit a listing report.');
      void handleSignIn();
      return;
    }

    await submitListingReport(
      userProfile.uid,
      reportModalListing,
      reason,
      details
    );
    setReportModalListing(null);
    addToast('success', 'Report submitted to campus safety moderators.');
  };

  const handleSubmitReview = async (
    request: RentalRequest,
    payload: { rating: number; comment: string }
  ) => {
    if (!userProfile) return;
    await submitRentalReview(userProfile, request, payload);
    addToast('success', 'Thank you! Your review has been published.');
  };

  const handleToggleSaveListing = async (listing: Listing) => {
    if (!userProfile) {
      addToast(
        'info',
        'Please sign in with Google to save items to your wishlist.'
      );
      void handleSignIn();
      return;
    }

    const currentlySaved = savedListingIds.has(listing.id);
    try {
      const nowSaved = await toggleSavedItem(
        userProfile,
        listing,
        currentlySaved
      );
      addToast(
        nowSaved ? 'success' : 'info',
        nowSaved ? 'Saved to your Wishlist!' : 'Removed from Saved Items.'
      );
    } catch {
      addToast('error', 'Could not update Saved Items. Please try again.');
    }
  };

  const handleRemoveSavedItem = async (savedItem: SavedItem) => {
    if (!userProfile) return;
    try {
      await toggleSavedItem(
        userProfile,
        {
          id: savedItem.listingId,
          title: savedItem.listingTitle,
          photos: [savedItem.listingPhoto],
          pricePerDay: savedItem.pricePerDay,
        },
        true
      );
      addToast('info', 'Removed from Saved Items.');
    } catch {
      addToast('error', 'Could not remove item from Saved Items.');
    }
  };

  const handleCopyContact = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      addToast('success', `Copied ${phone} to clipboard.`);
    } catch {
      addToast('info', `Contact number: ${phone}`);
    }
  };

  // Admin Console Handlers
  const handleToggleFeaturedListing = async (listing: Listing) => {
    const nextFeatured = !listing.featured;
    if (listing.isSeed) {
      const nextFeaturedIds = nextFeatured
        ? Array.from(new Set([...seedState.featuredIds, listing.id]))
        : seedState.featuredIds.filter((id) => id !== listing.id);
      const nextUnfeaturedIds = nextFeatured
        ? seedState.unfeaturedIds.filter((id) => id !== listing.id)
        : Array.from(new Set([...seedState.unfeaturedIds, listing.id]));

      const saved = await saveSeedState({
        ...seedState,
        featuredIds: nextFeaturedIds,
        unfeaturedIds: nextUnfeaturedIds,
      });
      if (saved) setSeedState(saved);
    } else {
      await updateListing(listing, { featured: nextFeatured });
    }
    addToast(
      'success',
      nextFeatured
        ? 'Listing marked as Featured.'
        : 'Removed Featured status.'
    );
  };

  const handleApproveRejectListing = async (
    listing: Listing,
    decision: Exclude<ApprovalStatus, 'Pending'>
  ) => {
    if (listing.isSeed) {
      await promoteSeedListing(listing, { approvalStatus: decision });
    } else {
      await updateListing(listing, { approvalStatus: decision });
    }
    addToast(
      decision === 'Approved' ? 'success' : 'info',
      decision === 'Approved' ? 'Listing approved and live.' : 'Listing rejected.'
    );
  };

  const handleBulkHideListings = async (items: Listing[], hide: boolean) => {
    const seedIds = items.filter((i) => i.isSeed).map((i) => i.id);
    const fsItems = items.filter((i) => !i.isSeed);
    const targetStatus = hide ? 'Paused' : 'Available';

    if (seedIds.length > 0) {
      const seedIdSet = new Set(seedIds);
      const nextHidden = hide
        ? Array.from(new Set([...seedState.hiddenIds, ...seedIds]))
        : seedState.hiddenIds.filter((id) => !seedIdSet.has(id));
      const saved = await saveSeedState({
        ...seedState,
        hiddenIds: nextHidden,
      });
      if (saved) setSeedState(saved);
    }

    await Promise.all(
      fsItems
        .filter((item) => item.status !== targetStatus)
        .map((item) =>
          updateListing(item, {
            status: targetStatus,
            bookedRanges: item.bookedRanges,
          })
        )
    );

    addToast(
      'info',
      hide
        ? `${items.length} item${items.length === 1 ? '' : 's'} hidden globally.`
        : `${items.length} item${items.length === 1 ? '' : 's'} made visible.`
    );
  };

  const handleBulkDeleteListings = async (items: Listing[]) => {
    const seedIds = items.filter((i) => i.isSeed).map((i) => i.id);
    const fsItems = items.filter((i) => !i.isSeed);

    if (seedIds.length > 0) {
      const seedIdSet = new Set(seedIds);
      const saved = await saveSeedState({
        deletedIds: Array.from(new Set([...seedState.deletedIds, ...seedIds])),
        hiddenIds: seedState.hiddenIds.filter((id) => !seedIdSet.has(id)),
        featuredIds: seedState.featuredIds.filter((id) => !seedIdSet.has(id)),
        unfeaturedIds: seedState.unfeaturedIds.filter((id) => !seedIdSet.has(id)),
      });
      if (saved) setSeedState(saved);
    }

    await Promise.all(fsItems.map((item) => deleteListingById(item.id)));

    if (selectedListingId && items.some((i) => i.id === selectedListingId)) {
      setSelectedListingId(null);
      navigateTo('home');
    }

    addToast(
      'info',
      `${items.length} item${items.length === 1 ? '' : 's'} removed globally.`
    );
  };

  const handleToggleBlockUser = async (targetUser: UserProfile) => {
    const nextBlocked = !targetUser.blocked;
    await setUserBlocked(targetUser.uid, nextBlocked);
    addToast(
      'info',
      nextBlocked
        ? `${targetUser.displayName} has been blocked.`
        : `${targetUser.displayName} has been unblocked.`
    );
  };

  const handleDismissReport = async (report: ListingReport) => {
    await updateReportStatus(report.id, 'Dismissed');
    addToast('info', 'Report dismissed.');
  };

  const handleHideReportedListing = async (report: ListingReport) => {
    const target = allListings.find((l) => l.id === report.listingId);
    if (target && target.status !== 'Paused') {
      await handleTogglePauseListing(target);
    }
    await updateReportStatus(report.id, 'Resolved');
    addToast('info', 'Reported listing hidden and report resolved.');
  };

  const handleDeleteReportedListing = async (report: ListingReport) => {
    const target = allListings.find((l) => l.id === report.listingId);
    if (target) {
      await handleDeleteListing(target);
    }
    await updateReportStatus(report.id, 'Resolved');
    addToast('info', 'Reported listing deleted and report resolved.');
  };

  const handleSaveCategories = async (items: string[]) => {
    await saveCategories(items);
    setCategories(items);
    addToast('success', 'Categories updated.');
  };

  const handleSaveSiteSettings = async (nextSettings: SiteSettings) => {
    await saveSiteSettings(nextSettings);
    setSiteSettings(nextSettings);
    addToast('success', 'Live site settings saved.');
  };

  const handleResetDemoData = async () => {
    const baseline = getSeedDataBaseline() as Listing[];
    const baselineIds = new Set(baseline.map((s) => s.id));
    const promotedSeedIds = firestoreListings
      .filter((l) => baselineIds.has(l.id))
      .map((l) => l.id);

    await resetGlobalSeedData(promotedSeedIds);
    setSeedState({ ...DEFAULT_SEED_STATE });
    setSeedBookingsMap({});
    setSeedRequests([]);
    writeStorageJson(STORAGE_KEYS.SEED_BOOKINGS, {});
    writeStorageJson(STORAGE_KEYS.SEED_REQUESTS, []);
    addToast(
      'success',
      'All 12 default starter listings restored globally for all visitors.'
    );
  };

  const handleSelectListing = (listing: Listing) => {
    setSelectedListingId(listing.id);
    setCurrentView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <OptionalMapsProvider apiKey={mapsApiKey}>
      {mapsApiKey && !quotaExceeded && (
        <CityPlaceResolver
          selectedState={selectedState}
          selectedCity={selectedCity}
          listings={allListings}
          resolvedCityCoords={resolvedCityCoords}
          resolvedListingCoords={resolvedListingCoords}
          onResolveCityCoords={handleResolveCityCoords}
          onResolveListingCoords={handleResolveListingCoords}
        />
      )}

      <div className="relative min-h-screen flex flex-col bg-[#F7F7F5] dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]">
        {/* Tier 2 Google Maps Platform Quota Exceeded Banner */}
        {quotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner,
              visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        {/* Translucent Background Logo Watermark */}
        <div
          aria-hidden="true"
          className="fixed inset-0 z-0 pointer-events-none select-none flex items-center justify-center overflow-hidden"
        >
          <div className="w-[340px] h-[250px] sm:w-[500px] sm:h-[360px] lg:w-[620px] lg:h-[440px] rounded-3xl overflow-hidden opacity-[0.10] dark:opacity-[0.09] mix-blend-multiply dark:mix-blend-normal [mask-image:radial-gradient(ellipse_at_center,rgba(0,0,0,1)_48%,rgba(0,0,0,0)_100%)]">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-11-22_at_10.58.39_PM_ebcb51a4.jpeg"
              alt=""
              className="w-full h-full object-cover object-[50%_53%] scale-[1.28]"
            />
          </div>
        </div>

        <Navbar
          siteSettings={siteSettings}
          currentView={currentView}
          onNavigate={navigateTo}
          onOpenAddListing={() => handleOpenAddListing(false)}
          onOpenPermissions={() => setPermissionsModalOpen(true)}
          missingPermissionsCount={missingPermissionsCount}
          user={userProfile}
          isAdmin={isAuthorizedAdmin}
          onSignIn={handleSignIn}
          onOpenProfile={() => setProfileModalOpen(true)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          pendingIncomingCount={pendingIncomingCount}
        />

        <main className="relative z-10 flex-1">
          {currentView === 'home' && (
            <HomeMarketplace
              siteSettings={siteSettings}
              categories={categories}
              listings={filteredListings}
              allListingsForLocations={allListings}
              loading={listingsLoading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              priceFilter={priceFilter}
              onPriceFilterChange={setPriceFilter}
              availabilityFilter={availabilityFilter}
              onAvailabilityFilterChange={setAvailabilityFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              selectedState={selectedState}
              onStateChange={handleStateChange}
              selectedCity={selectedCity}
              onCityChange={handleCityChange}
              nearbyEnabled={nearbyEnabled}
              onToggleNearby={handleToggleNearby}
              nearbyRadiusKm={nearbyRadiusKm}
              onNearbyRadiusChange={setNearbyRadiusKm}
              gpsActive={Boolean(gpsCoords)}
              gpsLoading={gpsLoading}
              onRequestGps={() => handleRequestGpsLocation(false)}
              onClearGps={() => {
                setGpsCoords(null);
                if (sortBy === 'nearest' && !selectedCity) {
                  setSortBy('newest');
                }
              }}
              activeReferenceLabel={activeReference?.label || null}
              searchCenter={activeReference?.coords || null}
              resolvedCoordsMap={resolvedListingCoords}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              mapsEnabled={Boolean(mapsApiKey)}
              quotaExceeded={quotaExceeded}
              onClearFilters={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setPriceFilter('all');
                setAvailabilityFilter('all');
                setSelectedState('');
                setSelectedCity('');
                setNearbyEnabled(false);
                setGpsCoords(null);
                setSortBy('newest');
              }}
              onSelectListing={handleSelectListing}
              onOpenAddListing={() => handleOpenAddListing(false)}
              savedListingIds={savedListingIds}
              onToggleSaveListing={handleToggleSaveListing}
            />
          )}

          {currentView === 'detail' && selectedListing && (
            <ListingDetail
              listing={selectedListing}
              currentUser={userProfile}
              reviews={reviews}
              isAdmin={isAuthorizedAdmin}
              activeRequestCount={
                [...adminCombinedRequests, ...incomingFsRequests].filter(
                  (r) =>
                    r.listingId === selectedListing.id &&
                    (r.status === 'Pending' || r.status === 'Accepted')
                ).length
              }
              resolvedCoordsMap={resolvedListingCoords}
              mapsEnabled={Boolean(mapsApiKey)}
              quotaExceeded={quotaExceeded}
              onBack={() => navigateTo('home')}
              onOpenRequestModal={() => setRequestModalListing(selectedListing)}
              onEditListing={(l) => {
                setEditingListing(l);
                setListingFormOfficialMode(isAuthorizedAdmin);
                setListingFormOpen(true);
              }}
              onToggleHideListing={handleTogglePauseListing}
              onToggleFeaturedListing={handleToggleFeaturedListing}
              onDeleteListing={handleDeleteListing}
              onSignIn={handleSignIn}
              onOpenReportModal={(l) => setReportModalListing(l)}
              isSaved={savedListingIds.has(selectedListing.id)}
              onToggleSave={handleToggleSaveListing}
            />
          )}

        {currentView === 'detail' && !selectedListing && (
          <div className="py-20 text-center px-4">
            <h1 className="font-display text-2xl font-bold">
              Listing not found
            </h1>
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 cursor-pointer"
            >
              Return to Marketplace
            </button>
          </div>
        )}

        {currentView === 'dashboard' && (
          <Dashboard
            user={userProfile}
            myListings={myListings}
            incomingRequests={incomingFsRequests}
            myRentals={myRentalsCombined}
            onSignIn={handleSignIn}
            onOpenAddListing={() => handleOpenAddListing(false)}
            onEditListing={(l) => {
              setEditingListing(l);
              setListingFormOfficialMode(false);
              setListingFormOpen(true);
            }}
            onTogglePauseListing={handleTogglePauseListing}
            onDeleteListing={handleDeleteListing}
            onSelectListingById={(id) => {
              setSelectedListingId(id);
              setCurrentView('detail');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onRespondToRequest={handleRespondToRequest}
            onMarkReturned={handleMarkReturned}
            onCancelRequest={handleCancelRequest}
            onSimulateSeedApproval={handleSimulateSeedApproval}
            onCopyContact={handleCopyContact}
            onNotifyError={(msg) => addToast('error', msg)}
            reviews={reviews}
            onSubmitReview={handleSubmitReview}
            savedItems={savedItems}
            allListings={allListings}
            onRemoveSavedItem={handleRemoveSavedItem}
            onBrowseMarketplace={() => navigateTo('home')}
          />
        )}

        {currentView === 'safety' && (
          <SafetyPage
            siteSettings={siteSettings}
            onBack={() => navigateTo('home')}
          />
        )}

        {currentView === 'admin' && (
          <AdminPanel
            currentUser={userProfile}
            isAuthorizedAdmin={isAuthorizedAdmin}
            onSignIn={handleSignIn}
            onBackToSite={() => navigateTo('home')}
            listings={allListings}
            users={adminUsers}
            allRequests={adminCombinedRequests}
            reports={adminReports}
            categories={categories}
            siteSettings={siteSettings}
            onOpenAddProduct={() => handleOpenAddListing(true)}
            onEditListing={(l) => {
              setEditingListing(l);
              setListingFormOfficialMode(true);
              setListingFormOpen(true);
            }}
            onDeleteListing={handleDeleteListing}
            onToggleHideListing={handleTogglePauseListing}
            onBulkHideListings={handleBulkHideListings}
            onBulkDeleteListings={handleBulkDeleteListings}
            onToggleFeaturedListing={handleToggleFeaturedListing}
            onApproveRejectListing={handleApproveRejectListing}
            onToggleBlockUser={handleToggleBlockUser}
            onCancelAnyRequest={handleCancelRequest}
            onDismissReport={handleDismissReport}
            onHideReportedListing={handleHideReportedListing}
            onDeleteReportedListing={handleDeleteReportedListing}
            onSaveCategories={handleSaveCategories}
            onSaveSiteSettings={handleSaveSiteSettings}
            onResetDemoData={handleResetDemoData}
          />
        )}
      </main>

      <Footer
        siteSettings={siteSettings}
        isAdmin={isAuthorizedAdmin}
        onNavigate={navigateTo}
      />

      {/* Modals */}
      {listingFormOpen && (
        <ListingFormModal
          categories={categories}
          existingListing={editingListing}
          isAdminOfficialMode={listingFormOfficialMode}
          siteBrandName={siteSettings.brandName}
          userProfile={userProfile}
          mapsEnabled={Boolean(mapsApiKey) && !quotaExceeded}
          onClose={() => {
            setListingFormOpen(false);
            setListingFormOfficialMode(false);
            setEditingListing(null);
          }}
          onSave={handleSaveListing}
        />
      )}

      {requestModalListing && (
        <RequestModal
          listing={requestModalListing}
          onClose={() => setRequestModalListing(null)}
          onSubmit={handleSubmitRequest}
        />
      )}

      {profileModalOpen && userProfile && (
        <ProfileModal
          user={userProfile}
          reviews={reviews}
          mapsEnabled={Boolean(mapsApiKey) && !quotaExceeded}
          onOpenPermissions={() => {
            setProfileModalOpen(false);
            setPermissionsModalOpen(true);
          }}
          onClose={() => setProfileModalOpen(false)}
          onSave={handleSaveProfile}
          onSignOut={handleSignOut}
        />
      )}

      {permissionsModalOpen && (
        <PermissionsModal
          user={userProfile}
          permissions={permissionsState}
          brandName={siteSettings.brandName}
          onUpdatePermissions={setPermissionsState}
          onLocationGranted={handlePermissionLocationGranted}
          onSavePhone={handlePermissionSavePhone}
          onClose={() => setPermissionsModalOpen(false)}
        />
      )}

      {reportModalListing && (
        <ReportModal
          listing={reportModalListing}
          onClose={() => setReportModalListing(null)}
          onSubmit={handleSubmitReport}
        />
      )}

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) =>
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }
      />
      </div>
    </OptionalMapsProvider>
  );
}

import { useMemo } from 'react';
import {
  Crosshair,
  LayoutGrid,
  Loader2,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Category, Listing, SiteSettings } from '../types/marketplace';
import { getCitiesForState, INDIA_STATES } from '../data/indiaLocations';
import { GeoCoordinates } from '../utils/locationUtils';
import { CampusLocationMap } from './CampusLocationMap';
import { ListingCard } from './ListingCard';

export type PriceFilter = 'all' | 'under150' | '150to350' | 'over350';
export type AvailabilityFilter = 'all' | 'available';
export type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'nearest';
export type MarketplaceViewMode = 'grid' | 'map';

interface HomeMarketplaceProps {
  siteSettings: SiteSettings;
  categories: string[];
  listings: Listing[];
  allListingsForLocations?: Listing[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: Category | 'All';
  onCategoryChange: (cat: Category | 'All') => void;
  priceFilter: PriceFilter;
  onPriceFilterChange: (pf: PriceFilter) => void;
  availabilityFilter: AvailabilityFilter;
  onAvailabilityFilterChange: (af: AvailabilityFilter) => void;
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  nearbyEnabled: boolean;
  onToggleNearby: () => void;
  nearbyRadiusKm: number;
  onNearbyRadiusChange: (km: number) => void;
  gpsActive: boolean;
  gpsLoading: boolean;
  onRequestGps: () => void;
  onClearGps: () => void;
  activeReferenceLabel: string | null;
  searchCenter: GeoCoordinates | null;
  resolvedCoordsMap: Record<string, GeoCoordinates>;
  viewMode: MarketplaceViewMode;
  onViewModeChange: (mode: MarketplaceViewMode) => void;
  mapsEnabled: boolean;
  quotaExceeded: boolean;
  onClearFilters: () => void;
  onSelectListing: (listing: Listing) => void;
  onOpenAddListing: () => void;
  savedListingIds?: Set<string>;
  onToggleSaveListing?: (listing: Listing) => void;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export function HomeMarketplace({
  siteSettings,
  categories,
  listings,
  allListingsForLocations = [],
  loading,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  priceFilter,
  onPriceFilterChange,
  availabilityFilter,
  onAvailabilityFilterChange,
  sortBy,
  onSortByChange,
  selectedState,
  onStateChange,
  selectedCity,
  onCityChange,
  nearbyEnabled,
  onToggleNearby,
  nearbyRadiusKm,
  onNearbyRadiusChange,
  gpsActive,
  gpsLoading,
  onRequestGps,
  onClearGps,
  activeReferenceLabel,
  searchCenter,
  resolvedCoordsMap,
  viewMode,
  onViewModeChange,
  mapsEnabled,
  quotaExceeded,
  onClearFilters,
  onSelectListing,
  onOpenAddListing,
  savedListingIds,
  onToggleSaveListing,
}: HomeMarketplaceProps) {
  const stateOptions = useMemo(() => {
    const merged = new Set(INDIA_STATES);
    allListingsForLocations.forEach((item) => {
      if (item.state) merged.add(item.state);
    });
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [allListingsForLocations]);

  const cityOptions = useMemo(() => {
    const merged = new Set(getCitiesForState(selectedState));
    allListingsForLocations.forEach((item) => {
      if (item.city && (!selectedState || item.state === selectedState)) {
        merged.add(item.city);
      }
    });
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [selectedState, allListingsForLocations]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All' ||
    priceFilter !== 'all' ||
    availabilityFilter !== 'all' ||
    selectedState !== '' ||
    selectedCity !== '' ||
    nearbyEnabled ||
    gpsActive;

  const canEnableNearby = Boolean(selectedCity || gpsActive || searchCenter);

  return (
    <div>
      {/* Hero Section */}
      <section className="py-10 sm:py-14 border-b border-[#E4E4DE] dark:border-[#2C2F29] bg-white/80 dark:bg-[#141513]/80 backdrop-blur-[2px]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[var(--accent)] mb-2">
              {siteSettings.brandName} · Campus Peer-to-Peer Rentals
            </p>
            <h1 className="font-display text-[clamp(2.25rem,4.2vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-[#141512] dark:text-[#F4F4F0] [text-wrap:balance]">
              {siteSettings.tagline}
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-[#5B5D54] dark:text-[#A3A69B] max-w-[60ch]">
              {siteSettings.heroSubtitle}
            </p>
          </div>

          {/* Search Bar + Post CTA */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1 max-w-2xl">
              <Search
                className="w-4 h-4 text-[#5B5D54] dark:text-[#A3A69B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search camera, projector, blazer, cycle, calculator..."
                aria-label="Search campus rental items"
                className="w-full pl-11 pr-10 py-3 min-h-[48px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5] dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0] placeholder:text-[#8C8E85]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenAddListing}
              className="px-6 py-3 min-h-[48px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              List an Unused Item
            </button>
          </div>

          {/* Location Selector + Nearby Renters Bar */}
          <div className="mt-5 p-3.5 sm:p-4 rounded-2xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5]/90 dark:bg-[#191B18]/90">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] shrink-0">
                <MapPin
                  className="w-4 h-4 text-[var(--accent)]"
                  aria-hidden="true"
                />
                <span>Location:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center gap-2.5 flex-1">
                <select
                  aria-label="Filter by state"
                  value={selectedState}
                  onChange={(e) => onStateChange(e.target.value)}
                  className="px-3 py-2 min-h-[40px] text-xs sm:text-sm font-medium rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
                >
                  <option value="">All States</option>
                  {stateOptions.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by city"
                  value={selectedCity}
                  onChange={(e) => onCityChange(e.target.value)}
                  className="px-3 py-2 min-h-[40px] text-xs sm:text-sm font-medium rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
                >
                  <option value="">All Cities</option>
                  {cityOptions.map((ct) => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </select>

                {/* Nearby Renters Option */}
                <button
                  type="button"
                  onClick={onToggleNearby}
                  aria-pressed={nearbyEnabled}
                  className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold border transition-colors cursor-pointer ${
                    nearbyEnabled
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0] border-[#E4E4DE] dark:border-[#2C2F29] hover:border-[var(--accent)]'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Nearby Renters</span>
                </button>

                {(nearbyEnabled || canEnableNearby) && (
                  <select
                    aria-label="Nearby radius in kilometers"
                    value={nearbyRadiusKm}
                    disabled={!nearbyEnabled}
                    onChange={(e) =>
                      onNearbyRadiusChange(Number(e.target.value))
                    }
                    className="px-3 py-2 min-h-[40px] text-xs font-medium rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0] disabled:opacity-50"
                  >
                    {RADIUS_OPTIONS.map((km) => (
                      <option key={km} value={km}>
                        Within {km} km
                      </option>
                    ))}
                  </select>
                )}

                {gpsActive ? (
                  <button
                    type="button"
                    onClick={onClearGps}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-medium border border-emerald-300 dark:border-emerald-800/70 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>GPS Active</span>
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onRequestGps}
                    disabled={gpsLoading}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-medium border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer disabled:opacity-60"
                  >
                    {gpsLoading ? (
                      <Loader2
                        className="w-3.5 h-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{gpsLoading ? 'Locating...' : 'Use My GPS'}</span>
                  </button>
                )}
              </div>
            </div>

            {(selectedState || selectedCity || nearbyEnabled) && (
              <div className="mt-2.5 pt-2.5 border-t border-[#E4E4DE] dark:border-[#2C2F29] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                <span>
                  {nearbyEnabled && activeReferenceLabel
                    ? `Finding renters within ${nearbyRadiusKm} km of ${activeReferenceLabel}`
                    : selectedCity || selectedState
                      ? `Filtering campus items in ${[selectedCity, selectedState].filter(Boolean).join(', ')} — toggle "Nearby Renters" to search surrounding areas`
                      : 'Enable GPS or select a State & City to find nearby renters.'}
                </span>
              </div>
            )}
          </div>

          {/* Dynamic Category Chips */}
          <div
            role="group"
            aria-label="Filter by category"
            className="mt-5 flex items-center gap-2 overflow-x-auto pb-1"
          >
            {(['All', ...categories] as const).map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onCategoryChange(category)}
                  className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs sm:text-sm font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[#F7F7F5] dark:bg-[#191B18] text-[#5B5D54] dark:text-[#A3A69B] border-[#E4E4DE] dark:border-[#2C2F29] hover:text-[#141512] dark:hover:text-[#F4F4F0]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Catalog Filters + Grid / Map */}
      <section className="py-10 lg:py-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="text-sm text-[#5B5D54] dark:text-[#A3A69B]">
              Showing{' '}
              <span className="font-mono font-medium text-[#141512] dark:text-[#F4F4F0] tabular-nums">
                {listings.length}
              </span>{' '}
              {listings.length === 1 ? 'item' : 'items'}
              {activeReferenceLabel && nearbyEnabled
                ? ` near ${activeReferenceLabel}`
                : ' on campus'}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B]">
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Filters:</span>
              </div>

              <select
                aria-label="Filter by daily price range"
                value={priceFilter}
                onChange={(e) =>
                  onPriceFilterChange(e.target.value as PriceFilter)
                }
                className="px-3 py-2 min-h-[38px] text-xs font-medium rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0]"
              >
                <option value="all">Any Price</option>
                <option value="under150">Under ₹150 / day</option>
                <option value="150to350">₹150 – ₹350 / day</option>
                <option value="over350">₹350+ / day</option>
              </select>

              <select
                aria-label="Filter by availability"
                value={availabilityFilter}
                onChange={(e) =>
                  onAvailabilityFilterChange(
                    e.target.value as AvailabilityFilter
                  )
                }
                className="px-3 py-2 min-h-[38px] text-xs font-medium rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0]"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available Now</option>
              </select>

              <select
                aria-label="Sort listings"
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as SortOption)}
                className="px-3 py-2 min-h-[38px] text-xs font-medium rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0]"
              >
                {searchCenter && (
                  <option value="nearest">Sort: Nearest First</option>
                )}
                <option value="newest">Sort: Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>

              {/* Grid vs Google Map View Switcher */}
              <div
                role="group"
                aria-label="Marketplace view mode"
                className="inline-flex rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] p-0.5"
              >
                <button
                  type="button"
                  onClick={() => onViewModeChange('grid')}
                  aria-pressed={viewMode === 'grid'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange('map')}
                  aria-pressed={viewMode === 'map'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === 'map'
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Map</span>
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="px-3 py-2 min-h-[38px] text-xs font-medium text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {viewMode === 'map' ? (
            <div className="space-y-6">
              <CampusLocationMap
                listings={listings}
                resolvedCoordsMap={resolvedCoordsMap}
                searchCenter={searchCenter}
                searchCenterLabel={activeReferenceLabel || undefined}
                onSelectListing={onSelectListing}
                mapsEnabled={mapsEnabled}
                quotaExceeded={quotaExceeded}
              />
              {listings.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onSelect={onSelectListing}
                      isSaved={Boolean(savedListingIds?.has(listing.id))}
                      onToggleSave={onToggleSaveListing}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-[#EFEFEA] dark:bg-[#222420]" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-20 bg-[#EFEFEA] dark:bg-[#222420] rounded" />
                    <div className="h-5 w-4/5 bg-[#EFEFEA] dark:bg-[#222420] rounded" />
                    <div className="h-4 w-1/2 bg-[#EFEFEA] dark:bg-[#222420] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-12 text-center">
              <h2 className="font-display text-xl font-semibold text-[#141512] dark:text-[#F4F4F0]">
                No campus items match your filters
              </h2>
              <p className="mt-2 text-sm text-[#5B5D54] dark:text-[#A3A69B] max-w-md mx-auto">
                Try increasing your nearby radius, switching cities, or clearing
                your filters—or list your own gear for classmates to rent.
              </p>
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-5 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onSelect={onSelectListing}
                  isSaved={Boolean(savedListingIds?.has(listing.id))}
                  onToggleSave={onToggleSaveListing}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

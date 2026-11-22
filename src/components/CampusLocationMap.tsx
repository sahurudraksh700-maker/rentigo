import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Star } from 'lucide-react';
import { Listing } from '../types/marketplace';
import { formatINR } from '../utils/dateUtils';
import {
  formatDistanceKm,
  GeoCoordinates,
  isValidCoordinatePair,
} from '../utils/locationUtils';
import { ResilientImage } from './ResilientImage';

interface MarkerListingItem {
  listing: Listing;
  position: GeoCoordinates;
}

interface AdvancedMarkerWithRefProps {
  position: GeoCoordinates;
  title: string;
  zIndex?: number;
  featured?: boolean;
  selected?: boolean;
  onMarkerClick: (marker: google.maps.marker.AdvancedMarkerElement) => void;
}

function ListingAdvancedMarker({
  position,
  title,
  zIndex,
  featured,
  selected,
  onMarkerClick,
}: AdvancedMarkerWithRefProps) {
  const [markerEl, setMarkerEl] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  const refCallback = useCallback(
    (m: google.maps.marker.AdvancedMarkerElement | null) => {
      setMarkerEl(m);
    },
    []
  );

  return (
    <AdvancedMarker
      ref={refCallback}
      position={position}
      title={title}
      zIndex={zIndex}
      onClick={() => {
        if (markerEl) {
          onMarkerClick(markerEl);
        }
      }}
    >
      <Pin
        background={selected ? '#141512' : featured ? '#D97706' : '#2563EB'}
        borderColor={selected ? '#F4F4F0' : '#FFFFFF'}
        glyphColor="#FFFFFF"
      />
    </AdvancedMarker>
  );
}

interface CameraFitterProps {
  points: GeoCoordinates[];
  searchCenter: GeoCoordinates | null;
  defaultZoom: number;
}

function CameraFitter({
  points,
  searchCenter,
  defaultZoom,
}: CameraFitterProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const allPoints = searchCenter ? [searchCenter, ...points] : points;
    if (allPoints.length === 0) return;

    if (allPoints.length === 1) {
      map.panTo(allPoints[0]);
      map.setZoom(defaultZoom);
      return;
    }

    if (typeof google !== 'undefined' && google.maps?.LatLngBounds) {
      const bounds = new google.maps.LatLngBounds();
      allPoints.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    }
  }, [map, points, searchCenter, defaultZoom]);

  return null;
}

interface CampusLocationMapProps {
  listings: Listing[];
  resolvedCoordsMap: Record<string, GeoCoordinates>;
  searchCenter: GeoCoordinates | null;
  searchCenterLabel?: string;
  onSelectListing?: (listing: Listing) => void;
  compact?: boolean;
  mapsEnabled: boolean;
  quotaExceeded: boolean;
}

const INDIA_FALLBACK_CENTER: GeoCoordinates = { lat: 20.5937, lng: 78.9629 };

export function CampusLocationMap({
  listings,
  resolvedCoordsMap,
  searchCenter,
  searchCenterLabel,
  onSelectListing,
  compact = false,
  mapsEnabled,
  quotaExceeded,
}: CampusLocationMapProps) {
  const [selectedItem, setSelectedItem] = useState<MarkerListingItem | null>(
    null
  );
  const [selectedMarker, setSelectedMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  const markerItems = useMemo<MarkerListingItem[]>(() => {
    const result: MarkerListingItem[] = [];
    for (const listing of listings) {
      if (isValidCoordinatePair(listing.lat, listing.lng)) {
        result.push({
          listing,
          position: { lat: listing.lat!, lng: listing.lng! },
        });
      } else if (resolvedCoordsMap[listing.id]) {
        result.push({
          listing,
          position: resolvedCoordsMap[listing.id],
        });
      }
    }
    return result;
  }, [listings, resolvedCoordsMap]);

  const points = useMemo(
    () => markerItems.map((item) => item.position),
    [markerItems]
  );

  const initialCenter = useMemo<GeoCoordinates>(() => {
    if (searchCenter) return searchCenter;
    if (markerItems.length > 0) return markerItems[0].position;
    return INDIA_FALLBACK_CENTER;
  }, [searchCenter, markerItems]);

  const defaultZoom = searchCenter
    ? 12
    : markerItems.length === 1
      ? 14
      : 5;

  if (!mapsEnabled || quotaExceeded) {
    return (
      <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-6 text-center space-y-2">
        <MapPin
          className="w-6 h-6 mx-auto text-[var(--accent)]"
          aria-hidden="true"
        />
        <h3 className="font-display text-base font-semibold text-[#141512] dark:text-[#F4F4F0]">
          {quotaExceeded
            ? 'Interactive Map temporarily unavailable (API quota reached)'
            : 'Interactive Map View'}
        </h3>
        <p className="text-xs sm:text-sm text-[#5B5D54] dark:text-[#A3A69B] max-w-md mx-auto">
          State, City, and GPS Nearby Renter filtering remain active in List &amp;
          Grid view.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl overflow-hidden">
      <div
        className={`w-full relative ${
          compact ? 'h-[260px]' : 'h-[400px] sm:h-[460px]'
        }`}
      >
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={initialCenter}
          defaultZoom={defaultZoom}
          gestureHandling="greedy"
          disableDefaultUI={compact}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          onClick={() => {
            setSelectedItem(null);
            setSelectedMarker(null);
          }}
        >
          <CameraFitter
            points={points}
            searchCenter={searchCenter}
            defaultZoom={defaultZoom}
          />

          {searchCenter && (
            <AdvancedMarker
              position={searchCenter}
              title={searchCenterLabel || 'Your Reference Location'}
              zIndex={1100}
            >
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold shadow-md border-2 border-white">
                <Navigation className="w-3 h-3" aria-hidden="true" />
                <span>{searchCenterLabel || 'You'}</span>
              </div>
            </AdvancedMarker>
          )}

          {markerItems.map(({ listing, position }, idx) => {
            const isSelected = selectedItem?.listing.id === listing.id;
            return (
              <ListingAdvancedMarker
                key={listing.id}
                position={position}
                title={`${listing.title} · ₹${listing.pricePerDay}/day`}
                zIndex={isSelected ? 1000 : idx + 1}
                featured={listing.featured}
                selected={isSelected}
                onMarkerClick={(marker) => {
                  setSelectedItem({ listing, position });
                  setSelectedMarker(marker);
                }}
              />
            );
          })}

          {selectedItem && selectedMarker && (
            <InfoWindow
              anchor={selectedMarker}
              pixelOffset={[0, -4]}
              onCloseClick={() => {
                setSelectedItem(null);
                setSelectedMarker(null);
              }}
            >
              <div className="w-60 text-[#141512] p-0.5 space-y-2">
                <div className="flex gap-2.5 items-center">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#EFEFEA] shrink-0">
                    <ResilientImage
                      src={selectedItem.listing.photos[0]}
                      alt={selectedItem.listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-[#5B5D54] truncate">
                      {selectedItem.listing.category}
                    </div>
                    <div className="text-xs font-bold leading-snug line-clamp-2">
                      {selectedItem.listing.title}
                    </div>
                    <div className="font-mono text-xs font-semibold text-blue-700 mt-0.5">
                      ₹{formatINR(selectedItem.listing.pricePerDay)}/day
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-[#5B5D54] space-y-0.5 border-t border-[#E4E4DE] pt-1.5">
                  <div className="truncate font-medium text-[#141512]">
                    {selectedItem.listing.ownerName} ·{' '}
                    {selectedItem.listing.ownerCollege}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {[selectedItem.listing.city, selectedItem.listing.state]
                        .filter(Boolean)
                        .join(', ') || selectedItem.listing.pickupLocation}
                    </span>
                    {selectedItem.listing.ownerRating > 0 && (
                      <span className="inline-flex items-center gap-0.5 font-mono text-[#141512] shrink-0">
                        <Star
                          className="w-3 h-3 fill-amber-400 text-amber-400"
                          aria-hidden="true"
                        />
                        {selectedItem.listing.ownerRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {typeof selectedItem.listing.distanceKm === 'number' && (
                    <div className="text-emerald-700 font-medium">
                      {formatDistanceKm(selectedItem.listing.distanceKm)}
                    </div>
                  )}
                </div>

                {onSelectListing && (
                  <button
                    type="button"
                    onClick={() => onSelectListing(selectedItem.listing)}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    View Rental Details
                  </button>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {!compact && (
        <div className="px-4 py-2.5 border-t border-[#E4E4DE] dark:border-[#2C2F29] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5B5D54] dark:text-[#A3A69B]">
          <span>
            Showing{' '}
            <strong className="font-mono text-[#141512] dark:text-[#F4F4F0]">
              {markerItems.length}
            </strong>{' '}
            pinned campus {markerItems.length === 1 ? 'renter' : 'renters'} on
            Google Maps
          </span>
          <span>Click any pin to inspect pickup city, rate &amp; owner</span>
        </div>
      )}
    </div>
  );
}

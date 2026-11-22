import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Listing } from '../types/marketplace';
import {
  checkAndDispatchGmpQuotaError,
  GeoCoordinates,
  isValidCoordinatePair,
} from '../utils/locationUtils';

interface CityPlaceResolverProps {
  selectedState: string;
  selectedCity: string;
  listings: Listing[];
  resolvedCityCoords: Record<string, GeoCoordinates>;
  resolvedListingCoords: Record<string, GeoCoordinates>;
  onResolveCityCoords: (key: string, coords: GeoCoordinates) => void;
  onResolveListingCoords: (
    updates: Record<string, GeoCoordinates>
  ) => void;
}

/**
 * Resolves city and starter-campus coordinates dynamically through Places API (New)
 * so all coordinates originate from Google Maps Platform in-session.
 */
export function CityPlaceResolver({
  selectedState,
  selectedCity,
  listings,
  resolvedCityCoords,
  resolvedListingCoords,
  onResolveCityCoords,
  onResolveListingCoords,
}: CityPlaceResolverProps) {
  const placesLib = useMapsLibrary('places');
  const inFlightKeysRef = useRef<Set<string>>(new Set());

  // 1. Resolve selected city coordinates when a city is chosen
  useEffect(() => {
    if (!placesLib || !selectedCity) return;
    const cacheKey = `${selectedState}::${selectedCity}`;
    if (resolvedCityCoords[cacheKey] || inFlightKeysRef.current.has(cacheKey)) {
      return;
    }

    let cancelled = false;
    inFlightKeysRef.current.add(cacheKey);
    const queryText = selectedState
      ? `${selectedCity}, ${selectedState}, India`
      : `${selectedCity}, India`;

    placesLib.Place.searchByText({
      textQuery: queryText,
      fields: ['location'],
      maxResultCount: 1,
      region: 'in',
    })
      .then(({ places }: { places: google.maps.places.Place[] }) => {
        if (cancelled) return;
        const loc = places?.[0]?.location;
        if (loc) {
          onResolveCityCoords(cacheKey, {
            lat: loc.lat(),
            lng: loc.lng(),
          });
        }
      })
      .catch((err: unknown) => {
        checkAndDispatchGmpQuotaError(err);
      })
      .finally(() => {
        inFlightKeysRef.current.delete(cacheKey);
      });

    return () => {
      cancelled = true;
    };
  }, [
    placesLib,
    selectedState,
    selectedCity,
    resolvedCityCoords,
    onResolveCityCoords,
  ]);

  // 2. Resolve coordinates for listings that have campus/city metadata but no stored lat/lng
  useEffect(() => {
    if (!placesLib || listings.length === 0) return;

    const candidates = listings.filter((item) => {
      if (isValidCoordinatePair(item.lat, item.lng)) return false;
      if (resolvedListingCoords[item.id]) return false;
      if (inFlightKeysRef.current.has(`lst:${item.id}`)) return false;
      return Boolean(item.city || item.ownerCollege);
    });

    if (candidates.length === 0) return;

    let cancelled = false;
    const batch = candidates.slice(0, 12);

    batch.forEach((item) => {
      inFlightKeysRef.current.add(`lst:${item.id}`);
    });

    Promise.all(
      batch.map(async (item) => {
        const parts = [
          item.ownerCollege && item.ownerCollege !== 'Campus Member'
            ? item.ownerCollege
            : '',
          item.city || '',
          item.state || '',
          'India',
        ].filter(Boolean);

        try {
          const { places } = await placesLib.Place.searchByText({
            textQuery: parts.join(', '),
            fields: ['location'],
            maxResultCount: 1,
            region: 'in',
          });
          const loc = places?.[0]?.location;
          if (loc) {
            return {
              id: item.id,
              coords: { lat: loc.lat(), lng: loc.lng() },
            };
          }
        } catch (err) {
          checkAndDispatchGmpQuotaError(err);
        } finally {
          inFlightKeysRef.current.delete(`lst:${item.id}`);
        }
        return null;
      })
    ).then((results) => {
      if (cancelled) return;
      const updates: Record<string, GeoCoordinates> = {};
      for (const res of results) {
        if (res) updates[res.id] = res.coords;
      }
      if (Object.keys(updates).length > 0) {
        onResolveListingCoords(updates);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    placesLib,
    listings,
    resolvedListingCoords,
    onResolveListingCoords,
  ]);

  return null;
}

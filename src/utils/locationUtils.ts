import { matchCanonicalState } from '../data/indiaLocations';

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export function getGoogleMapsApiKey(): string {
  try {
    const viteKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (typeof viteKey === 'string' && viteKey.trim().length > 0) {
      return viteKey.trim();
    }
  } catch {
    // Ignore import.meta access issues
  }

  try {
    if (typeof process !== 'undefined' && process.env?.GOOGLE_MAPS_API_KEY) {
      const envKey = String(process.env.GOOGLE_MAPS_API_KEY).trim();
      if (envKey.length > 0) return envKey;
    }
  } catch {
    // Ignore process access issues
  }

  return '';
}

export function isValidCoordinatePair(
  lat?: number | null,
  lng?: number | null
): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Computes straight-line distance in kilometers between two lat/lng points.
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  if (km < 1) {
    const meters = Math.max(50, Math.round(km * 1000));
    return `${meters} m away`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} km away`;
  }
  return `${Math.round(km)} km away`;
}

export function extractStateCityFromAddressComponents(
  components?: google.maps.places.AddressComponent[]
): { state: string; city: string } {
  if (!Array.isArray(components)) {
    return { state: '', city: '' };
  }

  let rawState = '';
  let city = '';

  for (const comp of components) {
    const types = comp.types || [];
    const name = comp.longText || comp.shortText || '';
    if (!name) continue;

    if (types.includes('administrative_area_level_1') && !rawState) {
      rawState = name;
    }
    if (types.includes('locality')) {
      city = name;
    } else if (!city && types.includes('administrative_area_level_3')) {
      city = name;
    } else if (!city && types.includes('administrative_area_level_2')) {
      city = name;
    } else if (!city && types.includes('sublocality_level_1')) {
      city = name;
    }
  }

  // Normalize common Indian city aliases returned by Google Places
  const lowerCity = city.toLowerCase();
  if (lowerCity === 'bangalore') city = 'Bengaluru';
  if (lowerCity === 'bombay') city = 'Mumbai';
  if (lowerCity === 'madras') city = 'Chennai';
  if (lowerCity === 'calcutta') city = 'Kolkata';
  if (lowerCity === 'mysore') city = 'Mysuru';
  if (lowerCity === 'mangalore') city = 'Mangaluru';
  if (lowerCity === 'trichy' || lowerCity === 'tiruchirapalli') {
    city = 'Tiruchirappalli';
  }
  if (lowerCity === 'gurgaon') city = 'Gurugram';

  return {
    state: matchCanonicalState(rawState),
    city: city.trim(),
  };
}

export function checkAndDispatchGmpQuotaError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null
        ? JSON.stringify(err)
        : String(err ?? '');

  if (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('OverQuotaMapError') ||
    msg.includes('QuotaExceededError') ||
    msg.includes('429')
  ) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
    return true;
  }
  return false;
}

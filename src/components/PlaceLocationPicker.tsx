import { useEffect, useMemo, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Crosshair, Loader2, MapPin } from 'lucide-react';
import {
  findStateByCity,
  getCitiesForState,
  INDIA_STATES,
} from '../data/indiaLocations';
import {
  checkAndDispatchGmpQuotaError,
  extractStateCityFromAddressComponents,
  isValidCoordinatePair,
} from '../utils/locationUtils';

export interface LocationSelectionValue {
  state: string;
  city: string;
  lat?: number;
  lng?: number;
  suggestedPickup?: string;
}

interface PlaceAutocompleteBoxProps {
  onPlaceResolved: (val: {
    state: string;
    city: string;
    lat?: number;
    lng?: number;
    displayName: string;
  }) => void;
}

/**
 * Imperatively mounts Google Maps PlaceAutocompleteElement (CF8 compliant)
 * inside a container ref to avoid React JSX Web Component prop traps.
 */
function GooglePlaceAutocompleteBox({
  onPlaceResolved,
}: PlaceAutocompleteBoxProps) {
  const placesLib = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onPlaceResolved);

  useEffect(() => {
    callbackRef.current = onPlaceResolved;
  }, [onPlaceResolved]);

  useEffect(() => {
    const container = containerRef.current;
    if (!placesLib || !container) return;

    const element = new placesLib.PlaceAutocompleteElement({
      includedRegionCodes: ['in'],
    });
    element.style.width = '100%';
    element.style.display = 'block';
    element.setAttribute('aria-label', 'Search campus or neighborhood on Google Maps');

    const handleSelect = async (event: Event) => {
      try {
        const selectEvent = event as unknown as {
          placePrediction?: google.maps.places.PlacePrediction;
        };
        if (!selectEvent.placePrediction) return;

        const place = selectEvent.placePrediction.toPlace();
        await place.fetchFields({
          fields: [
            'displayName',
            'formattedAddress',
            'location',
            'addressComponents',
          ],
        });

        const parsed = extractStateCityFromAddressComponents(
          place.addressComponents
        );
        const loc = place.location;
        const lat = loc ? loc.lat() : undefined;
        const lng = loc ? loc.lng() : undefined;
        const displayName =
          place.displayName || place.formattedAddress || '';

        callbackRef.current({
          state: parsed.state,
          city: parsed.city,
          lat,
          lng,
          displayName,
        });
      } catch (err) {
        checkAndDispatchGmpQuotaError(err);
      }
    };

    element.addEventListener('gmp-select', handleSelect);
    container.innerHTML = '';
    container.appendChild(element);

    return () => {
      element.removeEventListener('gmp-select', handleSelect);
      if (container.contains(element)) {
        container.removeChild(element);
      }
    };
  }, [placesLib]);

  return (
    <div
      ref={containerRef}
      className="w-full min-h-[44px] rounded-xl overflow-hidden border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110]"
    />
  );
}

interface PlaceLocationPickerProps {
  stateValue: string;
  cityValue: string;
  latValue?: number;
  lngValue?: number;
  mapsEnabled: boolean;
  onChange: (next: LocationSelectionValue) => void;
  idPrefix?: string;
  label?: string;
}

export function PlaceLocationPicker({
  stateValue,
  cityValue,
  latValue,
  lngValue,
  mapsEnabled,
  onChange,
  idPrefix = 'loc',
  label = 'State, City & Nearby Map Pin',
}: PlaceLocationPickerProps) {
  const [locating, setLocating] = useState(false);
  const [geoNotice, setGeoNotice] = useState('');

  const availableCities = useMemo(() => {
    const base = getCitiesForState(stateValue);
    if (cityValue && !base.includes(cityValue)) {
      return [cityValue, ...base];
    }
    return base;
  }, [stateValue, cityValue]);

  const handleStateChange = (nextState: string) => {
    const validCities = getCitiesForState(nextState);
    const keepCity =
      cityValue && (!nextState || validCities.includes(cityValue))
        ? cityValue
        : '';
    onChange({
      state: nextState,
      city: keepCity,
      lat: undefined,
      lng: undefined,
    });
  };

  const handleCityChange = (nextCity: string) => {
    const inferredState = stateValue || findStateByCity(nextCity);
    onChange({
      state: inferredState,
      city: nextCity,
      lat: undefined,
      lng: undefined,
    });
  };

  const handleUseGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoNotice('GPS geolocation is not supported in this browser.');
      return;
    }

    setLocating(true);
    setGeoNotice('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({
          state: stateValue,
          city: cityValue,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setGeoNotice('Current GPS coordinates attached.');
      },
      (err) => {
        setLocating(false);
        setGeoNotice(
          err.code === err.PERMISSION_DENIED
            ? 'Location access denied. Select State & City or search below.'
            : 'Could not read GPS location. Select State & City instead.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const hasCoords = isValidCoordinatePair(latValue, lngValue);

  return (
    <div className="space-y-3 p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] inline-flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
          <span>{label}</span>
        </span>

        <button
          type="button"
          onClick={handleUseGps}
          disabled={locating}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0] hover:border-[var(--accent)] transition-colors cursor-pointer disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Crosshair className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
          )}
          <span>{locating ? 'Locating...' : 'Use Current GPS'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`${idPrefix}-state`}
            className="block text-[11px] font-medium text-[#5B5D54] dark:text-[#A3A69B] mb-1"
          >
            State / UT
          </label>
          <select
            id={`${idPrefix}-state`}
            value={stateValue}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full px-3 py-2 min-h-[42px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
          >
            <option value="">Select State</option>
            {INDIA_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`${idPrefix}-city`}
            className="block text-[11px] font-medium text-[#5B5D54] dark:text-[#A3A69B] mb-1"
          >
            City
          </label>
          <select
            id={`${idPrefix}-city`}
            value={cityValue}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full px-3 py-2 min-h-[42px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
          >
            <option value="">Select City</option>
            {availableCities.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mapsEnabled && (
        <div>
          <div className="text-[11px] font-medium text-[#5B5D54] dark:text-[#A3A69B] mb-1">
            Or search campus / area with Google Places
          </div>
          <GooglePlaceAutocompleteBox
            onPlaceResolved={(resolved) => {
              onChange({
                state: resolved.state || stateValue,
                city: resolved.city || cityValue,
                lat: resolved.lat,
                lng: resolved.lng,
                suggestedPickup: resolved.displayName,
              });
              setGeoNotice(
                resolved.city || resolved.state
                  ? `Pinned ${[resolved.city, resolved.state].filter(Boolean).join(', ')} from Google Places.`
                  : 'Campus location pinned from Google Places.'
              );
            }}
          />
        </div>
      )}

      {(hasCoords || geoNotice) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5B5D54] dark:text-[#A3A69B]">
          <span>{geoNotice || 'Map coordinates attached for nearby search.'}</span>
          {hasCoords && (
            <span className="font-mono text-[#141512] dark:text-[#F4F4F0] tabular-nums">
              {latValue?.toFixed(4)}, {lngValue?.toFixed(4)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

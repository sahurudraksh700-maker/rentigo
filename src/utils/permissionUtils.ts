import { STORAGE_KEYS } from '../services/db.js';
import { GeoCoordinates } from './locationUtils';

export type PermissionStatusState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported';

export interface AppPermissionsState {
  location: PermissionStatusState;
  phone: PermissionStatusState;
  storage: PermissionStatusState;
  camera: PermissionStatusState;
  promptedOnce: boolean;
  updatedAtMs?: number;
}

const DEFAULT_PERMISSIONS_STATE: AppPermissionsState = {
  location: 'prompt',
  phone: 'prompt',
  storage: 'prompt',
  camera: 'prompt',
  promptedOnce: false,
};

export function readStoredPermissions(): AppPermissionsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PERMISSIONS_PREFS);
    if (!raw) return { ...DEFAULT_PERMISSIONS_STATE };
    const parsed = JSON.parse(raw) as Partial<AppPermissionsState>;
    return {
      location: parsed.location || 'prompt',
      phone: parsed.phone || 'prompt',
      storage: parsed.storage || 'prompt',
      camera: parsed.camera || 'prompt',
      promptedOnce: Boolean(parsed.promptedOnce),
      updatedAtMs: parsed.updatedAtMs,
    };
  } catch {
    return { ...DEFAULT_PERMISSIONS_STATE };
  }
}

export function saveStoredPermissions(
  next: AppPermissionsState
): AppPermissionsState {
  const payload: AppPermissionsState = {
    ...next,
    updatedAtMs: Date.now(),
  };
  try {
    localStorage.setItem(
      STORAGE_KEYS.PERMISSIONS_PREFS,
      JSON.stringify(payload)
    );
  } catch {
    // Ignore storage quota or private mode errors
  }
  return payload;
}

export function readPendingPhone(): string {
  try {
    return (localStorage.getItem(STORAGE_KEYS.PENDING_PHONE) || '').trim();
  } catch {
    return '';
  }
}

export function savePendingPhone(phone: string): void {
  try {
    const trimmed = phone.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEYS.PENDING_PHONE, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEYS.PENDING_PHONE);
    }
  } catch {
    // Ignore storage errors
  }
}

export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.trim();
  if (cleaned.length < 7 || cleaned.length > 24) return false;
  return /^[+0-9()\-\s]{7,24}$/.test(cleaned);
}

export async function queryBrowserPermission(
  name: 'geolocation' | 'camera'
): Promise<PermissionStatusState | null> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return null;
  }
  try {
    const status = await navigator.permissions.query({
      name: name as PermissionName,
    });
    if (status.state === 'granted') return 'granted';
    if (status.state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return null;
  }
}

export function requestLocationPermission(): Promise<{
  status: PermissionStatusState;
  coords?: GeoCoordinates;
  message: string;
}> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({
        status: 'unsupported',
        message: 'Location services are not available in this browser.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          status: 'granted',
          coords: {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          },
          message: 'Location permission granted.',
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({
            status: 'denied',
            message:
              'Location permission was denied. Enable it in browser site settings anytime.',
          });
          return;
        }
        resolve({
          status: 'prompt',
          message: 'Unable to read GPS signal right now. You can retry anytime.',
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export async function requestCameraPermission(): Promise<{
  status: PermissionStatusState;
  message: string;
}> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return {
      status: 'unsupported',
      message: 'Live camera access is unavailable in this browser.',
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    stream.getTracks().forEach((track) => track.stop());
    return {
      status: 'granted',
      message: 'Camera permission granted for item photos.',
    };
  } catch (err) {
    const domErr = err as { name?: string };
    if (
      domErr?.name === 'NotAllowedError' ||
      domErr?.name === 'PermissionDeniedError'
    ) {
      return {
        status: 'denied',
        message:
          'Camera permission was denied. Allow camera access in browser settings to take photos directly.',
      };
    }
    if (domErr?.name === 'NotFoundError') {
      return {
        status: 'unsupported',
        message: 'No camera device detected on this device.',
      };
    }
    return {
      status: 'prompt',
      message: 'Could not activate camera right now. Try again or upload a file.',
    };
  }
}

export async function requestStoragePermission(): Promise<{
  status: PermissionStatusState;
  message: string;
}> {
  let localOk = false;
  try {
    const testKey = '__rentigo_storage_check__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    localOk = true;
  } catch {
    localOk = false;
  }

  if (!localOk) {
    return {
      status: 'denied',
      message: 'Browser storage is currently blocked in this session.',
    };
  }

  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    try {
      const persisted = await navigator.storage.persist();
      return {
        status: 'granted',
        message: persisted
          ? 'Persistent device storage & media upload access granted.'
          : 'Storage & media upload access enabled for this browser session.',
      };
    } catch {
      return {
        status: 'granted',
        message: 'Storage & media upload access enabled.',
      };
    }
  }

  return {
    status: 'granted',
    message: 'Storage & media upload access enabled.',
  };
}

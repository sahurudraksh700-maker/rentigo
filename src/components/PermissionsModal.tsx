import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  HardDrive,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import { UserProfile } from '../types/marketplace';
import { GeoCoordinates } from '../utils/locationUtils';
import {
  AppPermissionsState,
  isValidPhoneNumber,
  PermissionStatusState,
  queryBrowserPermission,
  readPendingPhone,
  requestCameraPermission,
  requestLocationPermission,
  requestStoragePermission,
  savePendingPhone,
  saveStoredPermissions,
} from '../utils/permissionUtils';

interface PermissionsModalProps {
  user: UserProfile | null;
  permissions: AppPermissionsState;
  brandName: string;
  onUpdatePermissions: (next: AppPermissionsState) => void;
  onLocationGranted: (coords: GeoCoordinates) => void;
  onSavePhone: (phone: string) => Promise<void>;
  onClose: () => void;
}

function StatusBadge({ status }: { status: PermissionStatusState }) {
  if (status === 'granted') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        Allowed
      </span>
    );
  }
  if (status === 'denied') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
        Blocked
      </span>
    );
  }
  if (status === 'unsupported') {
    return (
      <span className="text-[11px] font-medium text-[#5B5D54] dark:text-[#A3A69B]">
        Unavailable
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-[#5B5D54] dark:text-[#A3A69B]">
      Not set
    </span>
  );
}

export function PermissionsModal({
  user,
  permissions,
  brandName,
  onUpdatePermissions,
  onLocationGranted,
  onSavePhone,
  onClose,
}: PermissionsModalProps) {
  const [localPerms, setLocalPerms] = useState<AppPermissionsState>(permissions);
  const [phoneInput, setPhoneInput] = useState<string>(
    () => user?.phone || readPendingPhone() || ''
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'info' | 'error' | 'success';
    text: string;
  } | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    Promise.all([
      queryBrowserPermission('geolocation'),
      queryBrowserPermission('camera'),
    ]).then(([geoState, camState]) => {
      if (!active) return;
      const next: AppPermissionsState = {
        ...permissions,
        ...(geoState ? { location: geoState } : {}),
        ...(camState ? { camera: camState } : {}),
        ...(user?.phone && user.phone.length >= 7
          ? { phone: 'granted' as PermissionStatusState }
          : {}),
      };
      const saved = saveStoredPermissions(next);
      setLocalPerms(saved);
      onUpdatePermissions(saved);
    });
    return () => {
      active = false;
    };
    // Run once on modal mount / user phone change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.phone]);

  const applyPermUpdate = (patch: Partial<AppPermissionsState>) => {
    const next = saveStoredPermissions({
      ...localPerms,
      ...patch,
      promptedOnce: true,
    });
    setLocalPerms(next);
    onUpdatePermissions(next);
  };

  const handleAllowLocation = async () => {
    setBusyKey('location');
    setFeedback(null);
    const res = await requestLocationPermission();
    applyPermUpdate({ location: res.status });
    if (res.status === 'granted' && res.coords) {
      onLocationGranted(res.coords);
      setFeedback({ type: 'success', text: res.message });
    } else {
      setFeedback({
        type: res.status === 'denied' ? 'error' : 'info',
        text: res.message,
      });
    }
    setBusyKey(null);
  };

  const handleAllowPhone = async () => {
    const cleaned = phoneInput.trim();
    if (!isValidPhoneNumber(cleaned)) {
      setFeedback({
        type: 'error',
        text: 'Please enter a valid 7–24 digit phone or WhatsApp number.',
      });
      return;
    }

    setBusyKey('phone');
    setFeedback(null);
    try {
      if (user) {
        await onSavePhone(cleaned);
        savePendingPhone('');
        applyPermUpdate({ phone: 'granted' });
        setFeedback({
          type: 'success',
          text: 'Phone number saved privately to your account.',
        });
      } else {
        savePendingPhone(cleaned);
        applyPermUpdate({ phone: 'granted' });
        setFeedback({
          type: 'success',
          text: 'Phone number saved. It will sync to your private contact when you sign in.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Could not save phone number right now.',
      });
    }
    setBusyKey(null);
  };

  const handleAllowStorage = async () => {
    setBusyKey('storage');
    setFeedback(null);
    const res = await requestStoragePermission();
    applyPermUpdate({ storage: res.status });
    setFeedback({
      type: res.status === 'granted' ? 'success' : 'error',
      text: res.message,
    });
    setBusyKey(null);
  };

  const handleAllowCamera = async () => {
    setBusyKey('camera');
    setFeedback(null);
    const res = await requestCameraPermission();
    applyPermUpdate({ camera: res.status });
    setFeedback({
      type: res.status === 'granted' ? 'success' : 'info',
      text: res.message,
    });
    setBusyKey(null);
  };

  const handleAllowAll = async () => {
    setBusyKey('all');
    setFeedback(null);

    const locRes = await requestLocationPermission();
    if (locRes.status === 'granted' && locRes.coords) {
      onLocationGranted(locRes.coords);
    }

    const storageRes = await requestStoragePermission();
    const camRes = await requestCameraPermission();

    let phoneStatus = localPerms.phone;
    const cleanedPhone = phoneInput.trim();
    if (cleanedPhone && isValidPhoneNumber(cleanedPhone)) {
      try {
        if (user) {
          await onSavePhone(cleanedPhone);
          savePendingPhone('');
        } else {
          savePendingPhone(cleanedPhone);
        }
        phoneStatus = 'granted';
      } catch {
        // Keep previous phone status if save failed
      }
    }

    applyPermUpdate({
      location: locRes.status,
      storage: storageRes.status,
      camera: camRes.status,
      phone: phoneStatus,
    });

    setBusyKey(null);
    onClose();
  };

  const handleDismiss = () => {
    applyPermUpdate({ promptedOnce: true });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permissions-modal-title"
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white dark:bg-[#191B18] border-b border-[#E4E4DE] dark:border-[#2C2F29]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] inline-flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="permissions-modal-title"
                className="font-display text-base sm:text-lg font-bold text-[#141512] dark:text-[#F4F4F0]"
              >
                App &amp; Device Permissions
              </h2>
              <p className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                Control what {brandName} can access on your device
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close permissions dialog"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-3.5">
          {/* 1. Location */}
          <div className="p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29] flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] inline-flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#141512] dark:text-[#F4F4F0]">
                    Location Access
                  </span>
                  <StatusBadge status={localPerms.location} />
                </div>
                <p className="text-xs text-[#5B5D54] dark:text-[#A3A69B] mt-0.5">
                  Find nearby campus renters, sort by distance, and pin item pickup spots.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAllowLocation}
              disabled={busyKey !== null}
              className="shrink-0 px-3 py-2 min-h-[38px] rounded-xl text-xs font-semibold border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0] hover:border-[var(--accent)] transition-colors cursor-pointer disabled:opacity-60"
            >
              {busyKey === 'location' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : localPerms.location === 'granted' ? (
                'Refresh'
              ) : (
                'Allow'
              )}
            </button>
          </div>

          {/* 2. Phone Number */}
          <div className="p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29] space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] inline-flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#141512] dark:text-[#F4F4F0]">
                      Phone / WhatsApp Number
                    </span>
                    <StatusBadge status={localPerms.phone} />
                  </div>
                  <p className="text-xs text-[#5B5D54] dark:text-[#A3A69B] mt-0.5">
                    Kept private until you accept a booking so renters can coordinate pickup.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-12">
              <input
                type="tel"
                maxLength={24}
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+91 98765 43210"
                aria-label="Phone or WhatsApp number"
                className="flex-1 min-w-0 px-3 py-2 min-h-[38px] font-mono text-xs sm:text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
              />
              <button
                type="button"
                onClick={handleAllowPhone}
                disabled={busyKey !== null}
                className="shrink-0 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
              >
                {busyKey === 'phone' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Allow & Save'
                )}
              </button>
            </div>
          </div>

          {/* 3. Storage */}
          <div className="p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29] flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] inline-flex items-center justify-center shrink-0 mt-0.5">
                <HardDrive className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#141512] dark:text-[#F4F4F0]">
                    Storage &amp; Gallery Access
                  </span>
                  <StatusBadge status={localPerms.storage} />
                </div>
                <p className="text-xs text-[#5B5D54] dark:text-[#A3A69B] mt-0.5">
                  Upload item photos from device storage and persist local preferences.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAllowStorage}
              disabled={busyKey !== null}
              className="shrink-0 px-3 py-2 min-h-[38px] rounded-xl text-xs font-semibold border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0] hover:border-[var(--accent)] transition-colors cursor-pointer disabled:opacity-60"
            >
              {busyKey === 'storage' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : localPerms.storage === 'granted' ? (
                'Allowed'
              ) : (
                'Allow'
              )}
            </button>
          </div>

          {/* 4. Camera */}
          <div className="p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29] flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] inline-flex items-center justify-center shrink-0 mt-0.5">
                <Camera className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#141512] dark:text-[#F4F4F0]">
                    Camera Access
                  </span>
                  <StatusBadge status={localPerms.camera} />
                </div>
                <p className="text-xs text-[#5B5D54] dark:text-[#A3A69B] mt-0.5">
                  Take live photos of textbooks, cameras, or gear when posting a listing.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAllowCamera}
              disabled={busyKey !== null}
              className="shrink-0 px-3 py-2 min-h-[38px] rounded-xl text-xs font-semibold border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0] hover:border-[var(--accent)] transition-colors cursor-pointer disabled:opacity-60"
            >
              {busyKey === 'camera' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : localPerms.camera === 'granted' ? (
                'Allowed'
              ) : (
                'Allow'
              )}
            </button>
          </div>

          {feedback && (
            <div
              role="status"
              className={`p-3 rounded-xl text-xs border ${
                feedback.type === 'error'
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300'
                  : feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-[#F7F7F5] dark:bg-[#141513] border-[#E4E4DE] dark:border-[#2C2F29] text-[#5B5D54] dark:text-[#A3A69B]'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E4E4DE] dark:border-[#2C2F29]">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={busyKey !== null}
              className="px-4 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-medium text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
            >
              Maybe Later
            </button>

            <button
              type="button"
              onClick={handleAllowAll}
              disabled={busyKey !== null}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
            >
              {busyKey === 'all' && (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              )}
              <span>Allow All &amp; Continue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { AlertCircle, LogOut, ShieldCheck, Star, X } from 'lucide-react';
import { UserProfile, UserReview } from '../types/marketplace';
import { computeUserRatingSummary } from '../services/db.js';
import { formatShortDate } from '../utils/dateUtils';
import { PlaceLocationPicker } from './PlaceLocationPicker';

interface ProfileModalProps {
  user: UserProfile;
  reviews?: UserReview[];
  mapsEnabled?: boolean;
  onOpenPermissions?: () => void;
  onClose: () => void;
  onSave: (updates: {
    displayName: string;
    college: string;
    phone: string;
    photoUrl: string;
    state?: string;
    city?: string;
    lat?: number;
    lng?: number;
  }) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function ProfileModal({
  user,
  reviews = [],
  mapsEnabled = false,
  onOpenPermissions,
  onClose,
  onSave,
  onSignOut,
}: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [college, setCollege] = useState(user.college);
  const [phone, setPhone] = useState(user.phone || '');
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl || '');
  const [locationState, setLocationState] = useState(user.state || '');
  const [locationCity, setLocationCity] = useState(user.city || '');
  const [locationLat, setLocationLat] = useState<number | undefined>(user.lat);
  const [locationLng, setLocationLng] = useState<number | undefined>(user.lng);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const ratingSummary = useMemo(
    () => computeUserRatingSummary(reviews, user.uid),
    [reviews, user.uid]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (displayName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (college.trim().length < 2) {
      setError('Please enter your college or university name.');
      return;
    }
    if (phone.trim().length < 7 || phone.trim().length > 24) {
      setError(
        'Please enter a valid WhatsApp/phone number (7–24 characters) for rental handovers.'
      );
      return;
    }

    setError('');
    setSaving(true);
    try {
      await onSave({
        displayName: displayName.trim(),
        college: college.trim(),
        phone: phone.trim(),
        photoUrl: photoUrl.trim(),
        ...(locationState ? { state: locationState } : {}),
        ...(locationCity ? { city: locationCity } : {}),
        ...(typeof locationLat === 'number' && typeof locationLng === 'number'
          ? { lat: locationLat, lng: locationLng }
          : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white dark:bg-[#191B18] border-b border-[#E4E4DE] dark:border-[#2C2F29]">
          <h2
            id="profile-modal-title"
            className="font-display text-lg font-bold text-[#141512] dark:text-[#F4F4F0]"
          >
            Student Profile &amp; Contact
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile dialog"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-5">
          <div className="p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29] space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B]">
                  Campus Reputation
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  {ratingSummary.count > 0 && ratingSummary.average !== null ? (
                    <>
                      <span className="inline-flex items-center gap-1 font-mono text-base font-bold text-[#141512] dark:text-[#F4F4F0] tabular-nums">
                        <Star
                          className="w-4 h-4 fill-amber-400 text-amber-400"
                          aria-hidden="true"
                        />
                        {ratingSummary.average.toFixed(1)}
                      </span>
                      <span className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                        ({ratingSummary.count}{' '}
                        {ratingSummary.count === 1 ? 'review' : 'reviews'})
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B]">
                      No classmate reviews yet
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`w-3.5 h-3.5 ${
                      ratingSummary.average !== null &&
                      n <= Math.round(ratingSummary.average)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-[#D4D5CE] dark:text-[#3A3E36]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {ratingSummary.userReviews.length > 0 && (
              <div className="pt-2.5 border-t border-[#E4E4DE] dark:border-[#2C2F29] space-y-2">
                {ratingSummary.userReviews.slice(0, 2).map((rev) => (
                  <div key={rev.id} className="text-xs space-y-0.5">
                    <div className="flex items-center justify-between text-[#5B5D54] dark:text-[#A3A69B]">
                      <span className="font-medium text-[#141512] dark:text-[#F4F4F0]">
                        {rev.reviewerName} · ★ {rev.rating}
                      </span>
                      <span>
                        {formatShortDate(
                          new Date(rev.createdAtMs).toISOString().split('T')[0]
                        )}
                      </span>
                    </div>
                    {rev.comment && (
                      <p className="text-[#5B5D54] dark:text-[#A3A69B] line-clamp-2">
                        “{rev.comment}”
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="prof-name"
              className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
            >
              Full Name
            </label>
            <input
              id="prof-name"
              type="text"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
            />
          </div>

          <div>
            <label
              htmlFor="prof-college"
              className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
            >
              College / University
            </label>
            <input
              id="prof-college"
              type="text"
              maxLength={120}
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="e.g., IIT Bombay"
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
            />
          </div>

          <div>
            <label
              htmlFor="prof-phone"
              className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
            >
              WhatsApp / Phone Number
            </label>
            <input
              id="prof-phone"
              type="tel"
              maxLength={24}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3.5 py-2.5 min-h-[44px] font-mono text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
            />
            <p className="mt-1 text-xs text-[#5B5D54] dark:text-[#A3A69B]">
              Kept private—only shared with a renter after you accept their
              request.
            </p>
          </div>

          <div>
            <label
              htmlFor="prof-photo"
              className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
            >
              Profile Photo URL (Optional)
            </label>
            <input
              id="prof-photo"
              type="url"
              maxLength={500}
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
            />
          </div>

          <PlaceLocationPicker
            idPrefix="profile-loc"
            label="Your Campus State & City"
            stateValue={locationState}
            cityValue={locationCity}
            latValue={locationLat}
            lngValue={locationLng}
            mapsEnabled={mapsEnabled}
            onChange={(next) => {
              setLocationState(next.state);
              setLocationCity(next.city);
              setLocationLat(next.lat);
              setLocationLng(next.lng);
            }}
          />

          {onOpenPermissions && (
            <button
              type="button"
              onClick={onOpenPermissions}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5] dark:bg-[#141513] hover:border-[var(--accent)] text-xs font-medium text-[#141512] dark:text-[#F4F4F0] transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
                <span>Manage Location, Phone, Storage &amp; Camera Permissions</span>
              </span>
              <span className="text-[var(--accent)] font-semibold">Review</span>
            </button>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E4E4DE] dark:border-[#2C2F29]">
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Sign Out</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

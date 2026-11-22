import { useEffect, useRef, useState, FormEvent, ChangeEvent } from 'react';
import { AlertCircle, Camera, ImagePlus, Trash2, X } from 'lucide-react';
import {
  Category,
  ItemCondition,
  Listing,
  UserProfile,
} from '../types/marketplace';
import {
  addDaysISO,
  compressImageFile,
  compressVideoFrame,
  todayISO,
} from '../utils/dateUtils';
import { PlaceLocationPicker } from './PlaceLocationPicker';
import { ResilientImage } from './ResilientImage';

interface ListingFormModalProps {
  categories: string[];
  existingListing: Listing | null;
  userProfile?: UserProfile | null;
  mapsEnabled?: boolean;
  isAdminOfficialMode?: boolean;
  siteBrandName?: string;
  onClose: () => void;
  onSave: (data: {
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
  }) => Promise<void>;
}

const CONDITIONS: ItemCondition[] = ['New', 'Good', 'Fair'];

export function ListingFormModal({
  categories,
  existingListing,
  userProfile,
  mapsEnabled = false,
  isAdminOfficialMode = false,
  siteBrandName = 'Rentigo',
  onClose,
  onSave,
}: ListingFormModalProps) {
  const defaultFrom = todayISO();
  const defaultTo = addDaysISO(defaultFrom, 30);
  const firstCategory = categories[0] || 'Other';

  const [title, setTitle] = useState(existingListing?.title || '');
  const [description, setDescription] = useState(
    existingListing?.description || ''
  );
  const [category, setCategory] = useState<Category>(
    existingListing?.category || firstCategory
  );
  const [condition, setCondition] = useState<ItemCondition>(
    existingListing?.condition || 'Good'
  );
  const [pricePerDay, setPricePerDay] = useState(
    existingListing ? String(existingListing.pricePerDay) : '250'
  );
  const [deposit, setDeposit] = useState(
    existingListing ? String(existingListing.deposit) : '1000'
  );
  const [pickupLocation, setPickupLocation] = useState(
    existingListing?.pickupLocation || ''
  );
  const [locationState, setLocationState] = useState(
    existingListing?.state || userProfile?.state || ''
  );
  const [locationCity, setLocationCity] = useState(
    existingListing?.city || userProfile?.city || ''
  );
  const [locationLat, setLocationLat] = useState<number | undefined>(
    existingListing?.lat ?? userProfile?.lat
  );
  const [locationLng, setLocationLng] = useState<number | undefined>(
    existingListing?.lng ?? userProfile?.lng
  );
  const [availableFrom, setAvailableFrom] = useState(
    existingListing?.availableFrom || defaultFrom
  );
  const [availableTo, setAvailableTo] = useState(
    existingListing?.availableTo || defaultTo
  );
  const [photos, setPhotos] = useState<string[]>(
    existingListing?.photos || []
  );
  const [featured, setFeatured] = useState<boolean>(
    existingListing?.featured || false
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [onClose]);

  const handleOpenCamera = async () => {
    if (photos.length >= 4) {
      setError('Maximum 4 photos allowed per listing.');
      return;
    }
    setCameraError('');
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError('Live camera preview is unavailable here. Use Take/Upload Photo below.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      window.requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setCameraError(
        'Camera permission was denied or no camera was detected. Allow camera permission or pick from storage.'
      );
    }
  };

  const handleSnapCameraPhoto = () => {
    if (!videoRef.current) return;
    try {
      const dataUrl = compressVideoFrame(videoRef.current);
      setPhotos((prev) => [...prev, dataUrl].slice(0, 4));
      setError('');
      stopCameraStream();
    } catch {
      setCameraError('Could not capture photo. Please try again.');
    }
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remainingSlots = 4 - photos.length;
    if (remainingSlots <= 0) {
      setError('Maximum 4 photos allowed per listing.');
      return;
    }

    try {
      const selected = files.slice(0, remainingSlots);
      const compressed = await Promise.all(selected.map(compressImageFile));
      setPhotos((prev) => [...prev, ...compressed].slice(0, 4));
      setError('');
    } catch {
      setError('Could not process one of the selected images. Try JPEG or PNG.');
    }
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const trimmedPickup = pickupLocation.trim();
    const parsedPrice = Number(pricePerDay);
    const parsedDeposit = Number(deposit);

    if (trimmedTitle.length < 3 || trimmedTitle.length > 100) {
      setError('Title must be between 3 and 100 characters.');
      return;
    }
    if (trimmedDesc.length < 10 || trimmedDesc.length > 1200) {
      setError('Description must be between 10 and 1,200 characters.');
      return;
    }
    if (photos.length === 0) {
      setError('Please upload at least 1 photo of the item.');
      return;
    }
    if (photos[0].length > 250000) {
      setError(
        'The primary photo is too large to upload. Please remove and re-upload it.'
      );
      return;
    }
    if (Number.isNaN(parsedPrice) || parsedPrice < 10 || parsedPrice > 50000) {
      setError('Price per day must be between ₹10 and ₹50,000.');
      return;
    }
    if (Number.isNaN(parsedDeposit) || parsedDeposit < 0 || parsedDeposit > 100000) {
      setError('Security deposit must be between ₹0 and ₹1,00,000.');
      return;
    }
    if (trimmedPickup.length < 3 || trimmedPickup.length > 140) {
      setError('Please enter a clear campus pickup spot (3–140 characters).');
      return;
    }
    if (!availableFrom || !availableTo || availableTo < availableFrom) {
      setError('Available End Date must be on or after Available Start Date.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSave({
        title: trimmedTitle,
        description: trimmedDesc,
        category,
        photos,
        pricePerDay: Math.round(parsedPrice),
        deposit: Math.round(parsedDeposit),
        condition,
        pickupLocation: trimmedPickup,
        ...(locationState ? { state: locationState } : {}),
        ...(locationCity ? { city: locationCity } : {}),
        ...(typeof locationLat === 'number' && typeof locationLng === 'number'
          ? { lat: locationLat, lng: locationLng }
          : {}),
        availableFrom,
        availableTo,
        featured,
      });
    } catch (err) {
      let message = 'Could not save listing. Please try again.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          message = parsed?.error || err.message;
        } catch {
          message = err.message;
        }
      }
      setError(message);
      setSubmitting(false);
    }
  };

  const categoryChoices = categories.includes(category)
    ? categories
    : [category, ...categories];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-form-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white dark:bg-[#191B18] border-b border-[#E4E4DE] dark:border-[#2C2F29]">
          <h2
            id="listing-form-title"
            className="font-display text-lg font-bold text-[#141512] dark:text-[#F4F4F0]"
          >
            {existingListing
              ? 'Edit Listing'
              : isAdminOfficialMode
                ? `Add Product as ${siteBrandName}`
                : 'Post an Item to Rent'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#141512] dark:text-[#F4F4F0]">
                Item Photos ({photos.length}/4)
              </label>
              <span className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                Up to 4 photos · Auto-compressed
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map((photo, idx) => (
                <div
                  key={`${photo.slice(0, 20)}-${idx}`}
                  className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#EFEFEA] dark:bg-[#222420]"
                >
                  <ResilientImage
                    src={photo}
                    alt={`Item preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    aria-label={`Remove photo ${idx + 1}`}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/70 text-white inline-flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {photos.length < 4 && (
                <label className="aspect-[4/3] rounded-xl border-2 border-dashed border-[#E4E4DE] dark:border-[#2C2F29] hover:border-[var(--accent)] flex flex-col items-center justify-center gap-1.5 text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B] hover:text-[var(--accent)] transition-colors cursor-pointer">
                  <ImagePlus className="w-5 h-5" aria-hidden="true" />
                  <span>From Storage</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                </label>
              )}

              {photos.length < 4 && !cameraOpen && (
                <button
                  type="button"
                  onClick={handleOpenCamera}
                  className="aspect-[4/3] rounded-xl border-2 border-dashed border-[#E4E4DE] dark:border-[#2C2F29] hover:border-[var(--accent)] flex flex-col items-center justify-center gap-1.5 text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B] hover:text-[var(--accent)] transition-colors cursor-pointer"
                >
                  <Camera className="w-5 h-5" aria-hidden="true" />
                  <span>Use Camera</span>
                </button>
              )}
            </div>

            {cameraOpen && (
              <div className="mt-3 p-3 rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5] dark:bg-[#141513] space-y-2.5">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-60 rounded-lg bg-black object-cover"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="px-3 py-2 rounded-xl text-xs font-medium border border-[#E4E4DE] dark:border-[#2C2F29] text-[#5B5D54] dark:text-[#A3A69B] cursor-pointer"
                  >
                    Close Camera
                  </button>
                  <button
                    type="button"
                    onClick={handleSnapCameraPhoto}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[var(--accent)] hover:opacity-90 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Capture Photo</span>
                  </button>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 px-3 py-2 rounded-xl">
                <span>{cameraError}</span>
                <label className="underline font-semibold cursor-pointer">
                  Open Device Camera Picker
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="item-title"
              className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
            >
              Item Title
            </label>
            <input
              id="item-title"
              type="text"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Sony ZV-E10 Mirrorless Camera + Tripod"
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="item-category"
                className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
              >
                Category
              </label>
              <select
                id="item-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
              >
                {categoryChoices.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="item-condition"
                className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
              >
                Condition
              </label>
              <select
                id="item-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
              >
                {CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="item-price"
                className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
              >
                Price per Day (₹)
              </label>
              <input
                id="item-price"
                type="number"
                min={10}
                max={50000}
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] font-mono text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
              />
            </div>

            <div>
              <label
                htmlFor="item-deposit"
                className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
              >
                Refundable Deposit (₹)
              </label>
              <input
                id="item-deposit"
                type="number"
                min={0}
                max={100000}
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] font-mono text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="item-pickup"
              className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
            >
              Pickup Location on Campus
            </label>
            <input
              id="item-pickup"
              type="text"
              maxLength={140}
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="e.g., Central Library Steps or Hostel 4 Lobby"
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
            />
          </div>

          <PlaceLocationPicker
            idPrefix="listing-loc"
            label="City, State & Nearby Renter Pin"
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
              if (next.suggestedPickup && !pickupLocation.trim()) {
                setPickupLocation(next.suggestedPickup.slice(0, 140));
              }
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="item-from"
                className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
              >
                Available From
              </label>
              <input
                id="item-from"
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
              />
            </div>
            <div>
              <label
                htmlFor="item-to"
                className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
              >
                Available Until
              </label>
              <input
                id="item-to"
                type="date"
                min={availableFrom}
                value={availableTo}
                onChange={(e) => setAvailableTo(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="item-desc"
              className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
            >
              Description &amp; Included Accessories
            </label>
            <textarea
              id="item-desc"
              rows={4}
              maxLength={1200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mention size, battery health, included cables/cases, and any usage rules."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
            />
          </div>

          {isAdminOfficialMode && (
            <label className="flex items-center gap-2.5 text-sm text-[#141512] dark:text-[#F4F4F0] cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>Mark as Featured listing (appears first on Home)</span>
            </label>
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

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E4E4DE] dark:border-[#2C2F29]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
            >
              {submitting
                ? 'Saving...'
                : existingListing
                  ? 'Save Changes'
                  : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

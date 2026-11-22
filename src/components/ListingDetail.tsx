import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Edit3,
  Eye,
  EyeOff,
  Flag,
  Heart,
  MapPin,
  ShieldCheck,
  Star,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { Listing, UserProfile, UserReview } from '../types/marketplace';
import {
  addDaysISO,
  formatINR,
  formatShortDate,
  isDateBooked,
  todayISO,
} from '../utils/dateUtils';
import { computeUserRatingSummary } from '../services/db.js';
import {
  formatDistanceKm,
  GeoCoordinates,
  isValidCoordinatePair,
} from '../utils/locationUtils';
import { CampusLocationMap } from './CampusLocationMap';
import { ConfirmDialog } from './ConfirmDialog';
import { ResilientImage } from './ResilientImage';

interface ListingDetailProps {
  listing: Listing;
  currentUser: UserProfile | null;
  reviews?: UserReview[];
  isAdmin?: boolean;
  activeRequestCount?: number;
  resolvedCoordsMap?: Record<string, GeoCoordinates>;
  mapsEnabled?: boolean;
  quotaExceeded?: boolean;
  onBack: () => void;
  onOpenRequestModal: () => void;
  onEditListing: (listing: Listing) => void;
  onToggleHideListing?: (listing: Listing) => Promise<void>;
  onToggleFeaturedListing?: (listing: Listing) => Promise<void>;
  onDeleteListing?: (listing: Listing) => Promise<void>;
  onSignIn: () => void;
  onOpenReportModal: (listing: Listing) => void;
  isSaved?: boolean;
  onToggleSave?: (listing: Listing) => void;
}

export function ListingDetail({
  listing,
  currentUser,
  reviews = [],
  isAdmin = false,
  activeRequestCount = 0,
  resolvedCoordsMap = {},
  mapsEnabled = false,
  quotaExceeded = false,
  onBack,
  onOpenRequestModal,
  onEditListing,
  onToggleHideListing,
  onToggleFeaturedListing,
  onDeleteListing,
  onSignIn,
  onOpenReportModal,
  isSaved = false,
  onToggleSave,
}: ListingDetailProps) {
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const [adminBusy, setAdminBusy] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const isOwner = Boolean(currentUser && currentUser.uid === listing.ownerId);

  const ownerRatingSummary = useMemo(
    () =>
      computeUserRatingSummary(
        reviews,
        listing.ownerId,
        listing.isSeed ? listing.ownerRating : null
      ),
    [reviews, listing.ownerId, listing.isSeed, listing.ownerRating]
  );

  const today = todayISO();
  const calendarDays = Array.from({ length: 28 }, (_, index) => {
    const iso = addDaysISO(today, index);
    const dateObj = new Date(`${iso}T00:00:00`);
    const dayNum = dateObj.getDate();
    const monthShort = dateObj.toLocaleDateString('en-IN', { month: 'short' });
    const inWindow = iso >= listing.availableFrom && iso <= listing.availableTo;
    const booked = isDateBooked(iso, listing.bookedRanges);
    return {
      iso,
      dayNum,
      monthShort,
      inWindow,
      booked,
      available: inWindow && !booked && listing.status !== 'Paused',
    };
  });

  const statusStyles =
    listing.status === 'Available'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
      : listing.status === 'Rented'
        ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
        : 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';

  return (
    <section className="py-8 lg:py-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl text-sm font-medium text-[#141512] dark:text-[#F4F4F0] bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Campus Listings</span>
          </button>

          <div className="flex items-center gap-2">
            {onToggleSave && (
              <button
                type="button"
                onClick={() => onToggleSave(listing)}
                aria-pressed={isSaved}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  isSaved
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                    : 'text-[#5B5D54] dark:text-[#A3A69B] hover:text-rose-600 dark:hover:text-rose-400 border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18]'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`}
                  aria-hidden="true"
                />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenReportModal(listing)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B] hover:text-red-600 dark:hover:text-red-400 border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] transition-colors cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Report listing</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] bg-[#EFEFEA] dark:bg-[#222420]">
                <ResilientImage
                  src={listing.photos[selectedPhotoIdx] || listing.photos[0]}
                  alt={listing.title}
                  fallbackTitle={listing.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {listing.photos.length > 1 && (
                <div className="p-3 border-t border-[#E4E4DE] dark:border-[#2C2F29] flex items-center gap-3 overflow-x-auto">
                  {listing.photos.map((photo, idx) => (
                    <button
                      key={`${photo.slice(0, 24)}-${idx}`}
                      type="button"
                      onClick={() => setSelectedPhotoIdx(idx)}
                      aria-label={`View photo ${idx + 1}`}
                      className={`w-20 aspect-[4/3] rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-opacity ${
                        selectedPhotoIdx === idx
                          ? 'border-[var(--accent)] opacity-100'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <ResilientImage
                        src={photo}
                        alt={`${listing.title} thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-[#141512] dark:text-[#F4F4F0]">
                About this item
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-[#5B5D54] dark:text-[#A3A69B] whitespace-pre-line">
                {listing.description}
              </p>

              <div className="pt-4 border-t border-[#E4E4DE] dark:border-[#2C2F29] grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2.5">
                  <MapPin
                    className="w-4 h-4 mt-0.5 text-[var(--accent)] shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <div className="font-medium text-[#141512] dark:text-[#F4F4F0]">
                      Campus Pickup Spot
                    </div>
                    <div className="text-[#5B5D54] dark:text-[#A3A69B]">
                      {listing.pickupLocation}
                    </div>
                    {(listing.city || listing.state) && (
                      <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B] mt-0.5">
                        {[listing.city, listing.state].filter(Boolean).join(', ')}
                        {typeof listing.distanceKm === 'number' && (
                          <span className="ml-1.5 font-mono text-emerald-700 dark:text-emerald-400">
                            · {formatDistanceKm(listing.distanceKm)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar
                    className="w-4 h-4 mt-0.5 text-[var(--accent)] shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <div className="font-medium text-[#141512] dark:text-[#F4F4F0]">
                      Available Window
                    </div>
                    <div className="font-mono text-xs sm:text-sm text-[#5B5D54] dark:text-[#A3A69B] tabular-nums">
                      {formatShortDate(listing.availableFrom)} –{' '}
                      {formatShortDate(listing.availableTo)}
                    </div>
                  </div>
                </div>
              </div>

              {(isValidCoordinatePair(listing.lat, listing.lng) ||
                Boolean(resolvedCoordsMap[listing.id])) && (
                <div className="pt-2">
                  <CampusLocationMap
                    listings={[listing]}
                    resolvedCoordsMap={resolvedCoordsMap}
                    searchCenter={null}
                    compact
                    mapsEnabled={mapsEnabled}
                    quotaExceeded={quotaExceeded}
                  />
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="font-display text-lg font-semibold text-[#141512] dark:text-[#F4F4F0]">
                  Next 28 Days Availability
                </h2>
                <div className="flex items-center gap-4 text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500" />
                    Available
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-neutral-200 dark:bg-neutral-800 border border-neutral-400 dark:border-neutral-600" />
                    Booked / Unavailable
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => (
                  <div
                    key={day.iso}
                    title={`${day.iso} — ${day.available ? 'Available' : day.booked ? 'Already booked' : 'Unavailable'}`}
                    className={`p-2 rounded-lg border text-center ${
                      day.available
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-[#141512] dark:text-[#F4F4F0]'
                        : 'bg-[#EFEFEA] dark:bg-[#222420] border-[#E4E4DE] dark:border-[#2C2F29] text-[#8C8E85] line-through opacity-75'
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wide">
                      {day.monthShort}
                    </div>
                    <div className="font-mono text-xs sm:text-sm font-medium tabular-nums">
                      {day.dayNum}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Owner Ratings & Classmate Reviews */}
            <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#141512] dark:text-[#F4F4F0]">
                    Reviews for {listing.ownerFirstName}
                  </h2>
                  <p className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                    Verified ratings from completed campus rentals
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {ownerRatingSummary.average !== null ? (
                    <>
                      <div className="flex items-center gap-1 font-mono text-base font-bold text-[#141512] dark:text-[#F4F4F0] tabular-nums">
                        <Star
                          className="w-4 h-4 fill-amber-400 text-amber-400"
                          aria-hidden="true"
                        />
                        <span>{ownerRatingSummary.average.toFixed(1)}</span>
                      </div>
                      <span className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                        {ownerRatingSummary.count > 0
                          ? `(${ownerRatingSummary.count} ${
                              ownerRatingSummary.count === 1
                                ? 'review'
                                : 'reviews'
                            })`
                          : '(Starter rating)'}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B]">
                      New · No reviews yet
                    </span>
                  )}
                </div>
              </div>

              {ownerRatingSummary.userReviews.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29] text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                  No written classmate reviews yet. Complete a rental with{' '}
                  {listing.ownerFirstName} to leave the first verified review!
                </div>
              ) : (
                <div className="space-y-3">
                  {ownerRatingSummary.userReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {rev.reviewerPhotoUrl ? (
                            <img
                              src={rev.reviewerPhotoUrl}
                              alt={rev.reviewerName}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover border border-[#E4E4DE] dark:border-[#2C2F29]"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#EFEFEA] dark:bg-[#222420] flex items-center justify-center text-xs font-semibold text-[#141512] dark:text-[#F4F4F0]">
                              {rev.reviewerName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] truncate">
                              {rev.reviewerName}
                            </div>
                            <div className="text-[11px] text-[#5B5D54] dark:text-[#A3A69B] truncate">
                              {rev.reviewerRole === 'renter'
                                ? 'Rented'
                                : 'Lent'}{' '}
                              · {rev.listingTitle}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="inline-flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((starNum) => (
                              <Star
                                key={starNum}
                                className={`w-3.5 h-3.5 ${
                                  starNum <= rev.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-[#D4D5CE] dark:text-[#3A3E36]'
                                }`}
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                          <div className="text-[10px] font-mono text-[#8C8E85] mt-0.5">
                            {formatShortDate(
                              new Date(rev.createdAtMs)
                                .toISOString()
                                .split('T')[0]
                            )}
                          </div>
                        </div>
                      </div>

                      {rev.comment && (
                        <p className="text-xs sm:text-sm leading-relaxed text-[#141512] dark:text-[#F4F4F0]">
                          {rev.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B]">
                    {listing.category} · {listing.condition} Condition
                    {listing.featured ? ' · Featured' : ''}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-medium rounded-lg border ${statusStyles}`}
                  >
                    {listing.status}
                  </span>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#141512] dark:text-[#F4F4F0]">
                  {listing.title}
                </h1>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29] flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                    Rental Rate
                  </div>
                  <div className="font-mono text-2xl font-bold text-[#141512] dark:text-[#F4F4F0] tabular-nums">
                    ₹{formatINR(listing.pricePerDay)}
                    <span className="text-xs font-sans font-normal text-[#5B5D54] dark:text-[#A3A69B]">
                      {' '}
                      / day
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                    Refundable Deposit
                  </div>
                  <div className="font-mono text-lg font-semibold text-[#141512] dark:text-[#F4F4F0] tabular-nums">
                    ₹{formatINR(listing.deposit)}
                  </div>
                </div>
              </div>

              {isOwner ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200">
                    This is your listing. You cannot request to rent your own
                    item.
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditListing(listing)}
                    className="w-full py-3 px-6 min-h-[44px] rounded-xl text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Edit Listing Details
                  </button>
                </div>
              ) : currentUser?.blocked ? (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300">
                  Your account is currently restricted and cannot send rental
                  requests.
                </div>
              ) : listing.status === 'Paused' ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 px-6 min-h-[44px] rounded-xl text-sm font-medium text-[#5B5D54] dark:text-[#A3A69B] bg-[#EFEFEA] dark:bg-[#222420] cursor-not-allowed"
                >
                  Listing Paused by Owner
                </button>
              ) : currentUser ? (
                <button
                  type="button"
                  onClick={onOpenRequestModal}
                  className="w-full py-3.5 px-6 min-h-[48px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
                >
                  Request to Rent
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="w-full py-3.5 px-6 min-h-[48px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
                >
                  Sign in with Google to Request
                </button>
              )}

              <div className="flex items-start gap-2.5 text-xs text-[#5B5D54] dark:text-[#A3A69B] pt-2 border-t border-[#E4E4DE] dark:border-[#2C2F29]">
                <ShieldCheck
                  className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>
                  Owner’s WhatsApp contact is shared once your request is
                  accepted. Meet in public campus areas and inspect together.
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-6">
              <div className="text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B] mb-3">
                Listed by Classmate
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {listing.ownerPhotoUrl ? (
                    <img
                      src={listing.ownerPhotoUrl}
                      alt={listing.ownerName}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border border-[#E4E4DE] dark:border-[#2C2F29]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#EFEFEA] dark:bg-[#222420] border border-[#E4E4DE] dark:border-[#2C2F29] flex items-center justify-center text-[#141512] dark:text-[#F4F4F0] font-display font-bold">
                      <UserIcon className="w-5 h-5" aria-hidden="true" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-[#141512] dark:text-[#F4F4F0]">
                      {listing.ownerName}
                    </div>
                    <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                      {listing.ownerCollege}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {ownerRatingSummary.average !== null ? (
                    <>
                      <div className="flex items-center justify-end gap-1 font-mono text-sm font-semibold text-[#141512] dark:text-[#F4F4F0] tabular-nums">
                        <Star
                          className="w-4 h-4 fill-amber-400 text-amber-400"
                          aria-hidden="true"
                        />
                        <span>{ownerRatingSummary.average.toFixed(1)}</span>
                      </div>
                      <div className="text-[11px] text-[#5B5D54] dark:text-[#A3A69B]">
                        {ownerRatingSummary.count > 0
                          ? `${ownerRatingSummary.count} ${
                              ownerRatingSummary.count === 1
                                ? 'review'
                                : 'reviews'
                            }`
                          : 'Starter rating'}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B]">
                      New · 0 reviews
                    </span>
                  )}
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-semibold text-[#141512] dark:text-[#F4F4F0]">
                    Owner Admin Controls
                  </h2>
                  <span className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                    Global visibility
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {onToggleHideListing && (
                    <button
                      type="button"
                      disabled={adminBusy}
                      onClick={async () => {
                        setAdminBusy(true);
                        try {
                          await onToggleHideListing(listing);
                        } finally {
                          setAdminBusy(false);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-medium border border-[#E4E4DE] dark:border-[#2C2F29] text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] whitespace-nowrap cursor-pointer disabled:opacity-60"
                    >
                      {listing.status === 'Paused' ? (
                        <>
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Make Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Hide from Site</span>
                        </>
                      )}
                    </button>
                  )}

                  {onToggleFeaturedListing && (
                    <button
                      type="button"
                      disabled={adminBusy}
                      onClick={async () => {
                        setAdminBusy(true);
                        try {
                          await onToggleFeaturedListing(listing);
                        } finally {
                          setAdminBusy(false);
                        }
                      }}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-medium border whitespace-nowrap cursor-pointer disabled:opacity-60 ${
                        listing.featured
                          ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'border-[#E4E4DE] dark:border-[#2C2F29] text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#222420]'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{listing.featured ? 'Unfeature' : 'Feature Item'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={adminBusy}
                    onClick={() => onEditListing(listing)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-medium border border-[#E4E4DE] dark:border-[#2C2F29] text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] whitespace-nowrap cursor-pointer disabled:opacity-60"
                  >
                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Edit Item</span>
                  </button>

                  {onDeleteListing && (
                    <button
                      type="button"
                      disabled={adminBusy}
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-medium border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap cursor-pointer disabled:opacity-60"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Remove Item</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {onDeleteListing && (
        <ConfirmDialog
          open={confirmDeleteOpen}
          title="Remove Item Globally?"
          description={
            activeRequestCount > 0
              ? `Warning: "${listing.title}" currently has ${activeRequestCount} active or pending rental request(s). Removing it hides or deletes it for all visitors.`
              : `Remove "${listing.title}" from the site for all visitors?`
          }
          confirmLabel="Remove Item"
          danger
          busy={adminBusy}
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={async () => {
            setAdminBusy(true);
            try {
              await onDeleteListing(listing);
              setConfirmDeleteOpen(false);
            } finally {
              setAdminBusy(false);
            }
          }}
        />
      )}
    </section>
  );
}

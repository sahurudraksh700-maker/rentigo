import { Heart, MapPin, Star } from 'lucide-react';
import { Listing } from '../types/marketplace';
import { formatINR } from '../utils/dateUtils';
import { formatDistanceKm } from '../utils/locationUtils';
import { ResilientImage } from './ResilientImage';

interface ListingCardProps {
  listing: Listing;
  onSelect: (listing: Listing) => void;
  isSaved?: boolean;
  onToggleSave?: (listing: Listing) => void;
}

export function ListingCard({
  listing,
  onSelect,
  isSaved = false,
  onToggleSave,
}: ListingCardProps) {
  const statusStyles =
    listing.status === 'Available'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
      : listing.status === 'Rented'
        ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
        : 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';

  return (
    <article className="relative group bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      {onToggleSave && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(listing);
          }}
          aria-label={
            isSaved
              ? `Remove ${listing.title} from saved items`
              : `Save ${listing.title} to wishlist`
          }
          aria-pressed={isSaved}
          title={isSaved ? 'Saved to wishlist' : 'Save to wishlist'}
          className={`absolute top-3 left-3 z-10 w-9 h-9 rounded-full inline-flex items-center justify-center backdrop-blur-md border transition-all cursor-pointer ${
            isSaved
              ? 'bg-white/95 dark:bg-[#191B18]/95 border-rose-200 dark:border-rose-800/70 text-rose-500 shadow-xs'
              : 'bg-white/85 dark:bg-[#191B18]/85 border-[#E4E4DE]/90 dark:border-[#2C2F29] text-[#5B5D54] dark:text-[#A3A69B] hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-[#191B18]'
          }`}
        >
          <Heart
            className={`w-4 h-4 transition-transform ${
              isSaved ? 'fill-rose-500 text-rose-500 scale-105' : ''
            }`}
            aria-hidden="true"
          />
        </button>
      )}

      <button
        type="button"
        onClick={() => onSelect(listing)}
        className="text-left flex flex-col flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        {/* 4:3 Image Frame */}
        <div className="relative w-full aspect-[4/3] bg-[#EFEFEA] dark:bg-[#222420] overflow-hidden border-b border-[#E4E4DE] dark:border-[#2C2F29]">
          <ResilientImage
            src={listing.photos[0]}
            alt={listing.title}
            fallbackTitle={listing.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <span
            className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-medium rounded-lg border ${statusStyles}`}
          >
            {listing.status}
          </span>
        </div>

        {/* Details */}
        <div className="p-5 flex flex-col flex-1 justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B] mb-1">
              <span>{listing.category}</span>
              {listing.featured && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[var(--accent)] font-semibold">
                    Featured
                  </span>
                </>
              )}
            </div>
            <h3 className="font-display text-base sm:text-lg font-semibold leading-snug text-[#141512] dark:text-[#F4F4F0] line-clamp-2">
              {listing.title}
            </h3>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-mono text-base font-medium text-[#141512] dark:text-[#F4F4F0] tabular-nums">
                ₹{formatINR(listing.pricePerDay)}
                <span className="text-xs font-sans font-normal text-[#5B5D54] dark:text-[#A3A69B]">
                  /day
                </span>
              </div>
              <div className="font-mono text-xs text-[#5B5D54] dark:text-[#A3A69B] tabular-nums">
                ₹{formatINR(listing.deposit)} deposit
              </div>
            </div>

            {(listing.city || listing.state || typeof listing.distanceKm === 'number') && (
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#5B5D54] dark:text-[#A3A69B]">
                <span className="inline-flex items-center gap-1 min-w-0 truncate">
                  <MapPin className="w-3 h-3 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                  <span className="truncate">
                    {[listing.city, listing.state].filter(Boolean).join(', ') ||
                      listing.pickupLocation}
                  </span>
                </span>
                {typeof listing.distanceKm === 'number' && (
                  <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400 shrink-0 tabular-nums">
                    {formatDistanceKm(listing.distanceKm)}
                  </span>
                )}
              </div>
            )}

            <div className="mt-2.5 pt-2.5 border-t border-[#E4E4DE] dark:border-[#2C2F29] flex items-center justify-between gap-2 text-xs text-[#5B5D54] dark:text-[#A3A69B]">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="font-medium text-[#141512] dark:text-[#F4F4F0]">
                  {listing.condition}
                </span>
                <span aria-hidden="true">·</span>
                <span>{listing.ownerFirstName}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{listing.ownerCollege}</span>
              </div>
              {((listing.ownerReviewCount ?? 0) > 0 || listing.isSeed) &&
                listing.ownerRating > 0 && (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[#141512] dark:text-[#F4F4F0] shrink-0 tabular-nums">
                    <Star
                      className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                      aria-hidden="true"
                    />
                    <span>{listing.ownerRating.toFixed(1)}</span>
                  </span>
                )}
            </div>
          </div>
        </div>
      </button>
    </article>
  );
}

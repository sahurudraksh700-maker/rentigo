import { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, Star, X } from 'lucide-react';
import { RentalRequest } from '../types/marketplace';
import { formatShortDate } from '../utils/dateUtils';

interface ReviewModalProps {
  request: RentalRequest;
  reviewerRole: 'renter' | 'owner';
  onClose: () => void;
  onSubmit: (payload: { rating: number; comment: string }) => Promise<void>;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor experience',
  2: 'Below expectations',
  3: 'Okay, as expected',
  4: 'Great experience',
  5: 'Excellent & trustworthy',
};

export function ReviewModal({
  request,
  reviewerRole,
  onClose,
  onSubmit,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const revieweeName =
    reviewerRole === 'renter' ? request.ownerName : request.renterName;
  const activeStars = hoveredRating ?? rating;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ rating, comment: comment.trim() });
      onClose();
    } catch (err) {
      let msg = 'Could not submit review. Please try again.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          msg = parsed?.error || err.message;
        } catch {
          msg = err.message;
        }
      }
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4DE] dark:border-[#2C2F29]">
          <h2
            id="review-modal-title"
            className="font-display text-lg font-bold text-[#141512] dark:text-[#F4F4F0]"
          >
            Leave a Review
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review dialog"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-3.5 rounded-xl bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29] space-y-1">
            <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
              Reviewing {reviewerRole === 'renter' ? 'Owner' : 'Renter'}
            </div>
            <div className="font-display text-base font-semibold text-[#141512] dark:text-[#F4F4F0]">
              {revieweeName}
            </div>
            <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
              {request.listingTitle} · {formatShortDate(request.startDate)} –{' '}
              {formatShortDate(request.endDate)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-2">
              Star Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => {
                const filled = value <= activeStars;
                return (
                  <button
                    key={value}
                    type="button"
                    onMouseEnter={() => setHoveredRating(value)}
                    onMouseLeave={() => setHoveredRating(null)}
                    onClick={() => setRating(value)}
                    aria-label={`Rate ${value} out of 5 stars`}
                    aria-pressed={rating === value}
                    className="p-1.5 rounded-xl hover:bg-[#EFEFEA] dark:hover:bg-[#222420] transition-colors cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        filled
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-[#C8C9C2] dark:text-[#444840]'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 font-mono text-sm font-semibold text-[#141512] dark:text-[#F4F4F0]">
                {activeStars}/5
              </span>
            </div>
            <p className="mt-1.5 text-xs font-medium text-[var(--accent)]">
              {RATING_LABELS[activeStars]}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="review-comment"
                className="text-xs font-semibold text-[#141512] dark:text-[#F4F4F0]"
              >
                Written Review (Optional)
              </label>
              <span className="font-mono text-[11px] text-[#8C8E85]">
                {comment.length}/600
              </span>
            </div>
            <textarea
              id="review-comment"
              rows={4}
              maxLength={600}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                reviewerRole === 'renter'
                  ? 'How was the item condition, pickup punctuality, and communication?'
                  : 'Did the renter return the item on time and in good condition?'
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle
                className="w-4 h-4 shrink-0 mt-0.5"
                aria-hidden="true"
              />
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
              className="px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

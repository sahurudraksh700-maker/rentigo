import { useEffect, useState, FormEvent } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Listing } from '../types/marketplace';
import {
  calculateRentalDays,
  formatINR,
  formatShortDate,
  hasDateOverlap,
  todayISO,
} from '../utils/dateUtils';

interface RequestModalProps {
  listing: Listing;
  onClose: () => void;
  onSubmit: (payload: {
    startDate: string;
    endDate: string;
    days: number;
    totalAmount: number;
    message: string;
  }) => Promise<void>;
}

export function RequestModal({ listing, onClose, onSubmit }: RequestModalProps) {
  const minDate =
    listing.availableFrom > todayISO() ? listing.availableFrom : todayISO();

  const [startDate, setStartDate] = useState(minDate);
  const [endDate, setEndDate] = useState(minDate);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const days = calculateRentalDays(startDate, endDate);
  const rentalCost = days * listing.pricePerDay;
  const totalAmount = days > 0 ? rentalCost + listing.deposit : 0;

  const validateDates = (): string | null => {
    if (!startDate || !endDate) {
      return 'Please select both start and end dates.';
    }
    if (startDate < minDate) {
      return `Start date cannot be earlier than ${formatShortDate(minDate)}.`;
    }
    if (endDate < startDate) {
      return 'End date cannot be before start date.';
    }
    if (endDate > listing.availableTo) {
      return `Listing is only available until ${formatShortDate(listing.availableTo)}.`;
    }
    if (days > 90) {
      return 'Maximum single rental duration is 90 days.';
    }
    if (hasDateOverlap(startDate, endDate, listing.bookedRanges)) {
      return 'Selected dates overlap with an existing booking. Please choose open dates.';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateDates();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        startDate,
        endDate,
        days,
        totalAmount,
        message: message.trim(),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to send rental request.'
      );
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4DE] dark:border-[#2C2F29]">
          <h2
            id="request-modal-title"
            className="font-display text-lg font-bold text-[#141512] dark:text-[#F4F4F0]"
          >
            Request to Rent
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-3.5 rounded-xl bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29]">
            <div className="text-sm font-semibold text-[#141512] dark:text-[#F4F4F0]">
              {listing.title}
            </div>
            <div className="mt-1 text-xs text-[#5B5D54] dark:text-[#A3A69B]">
              Owner: {listing.ownerName} · Pickup: {listing.pickupLocation}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="req-start"
                className="block text-xs font-medium text-[#141512] dark:text-[#F4F4F0] mb-1.5"
              >
                Start Date
              </label>
              <input
                id="req-start"
                type="date"
                min={minDate}
                max={listing.availableTo}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
              />
            </div>

            <div>
              <label
                htmlFor="req-end"
                className="block text-xs font-medium text-[#141512] dark:text-[#F4F4F0] mb-1.5"
              >
                End Date
              </label>
              <input
                id="req-end"
                type="date"
                min={startDate || minDate}
                max={listing.availableTo}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
              />
            </div>
          </div>

          {listing.bookedRanges.length > 0 && (
            <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
              Already booked:{' '}
              {listing.bookedRanges
                .map(
                  (r) =>
                    `${formatShortDate(r.startDate)}–${formatShortDate(r.endDate)}`
                )
                .join(', ')}
            </div>
          )}

          <div>
            <label
              htmlFor="req-message"
              className="block text-xs font-medium text-[#141512] dark:text-[#F4F4F0] mb-1.5"
            >
              Message to {listing.ownerFirstName} (Optional)
            </label>
            <textarea
              id="req-message"
              rows={3}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi! Need this for our club shoot on campus. Can pick up after 4 PM."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
            />
          </div>

          {/* Auto-Calculated Breakdown */}
          <div className="p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29] space-y-2 text-sm">
            <div className="flex justify-between text-[#5B5D54] dark:text-[#A3A69B]">
              <span>
                {days > 0
                  ? `${days} ${days === 1 ? 'day' : 'days'} × ₹${formatINR(listing.pricePerDay)}`
                  : 'Select valid dates'}
              </span>
              <span className="font-mono tabular-nums text-[#141512] dark:text-[#F4F4F0]">
                ₹{formatINR(rentalCost)}
              </span>
            </div>
            <div className="flex justify-between text-[#5B5D54] dark:text-[#A3A69B]">
              <span>Refundable security deposit</span>
              <span className="font-mono tabular-nums text-[#141512] dark:text-[#F4F4F0]">
                ₹{formatINR(listing.deposit)}
              </span>
            </div>
            <div className="pt-2 border-t border-[#E4E4DE] dark:border-[#2C2F29] flex justify-between font-semibold text-[#141512] dark:text-[#F4F4F0]">
              <span>Total at handover</span>
              <span className="font-mono tabular-nums">
                ₹{formatINR(totalAmount)}
              </span>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
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
              {submitting ? 'Sending Request...' : 'Send Rental Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

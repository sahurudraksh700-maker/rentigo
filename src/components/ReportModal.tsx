import { useEffect, useState, FormEvent } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Listing } from '../types/marketplace';

interface ReportModalProps {
  listing: Listing;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => Promise<void>;
}

const REPORT_REASONS = [
  'Misleading photos or description',
  'Prohibited or unsafe item on campus',
  'Suspicious pricing or scam attempt',
  'Duplicate or spam listing',
  'Other concern',
];

export function ReportModal({ listing, onClose, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (details.trim().length < 5) {
      setError('Please include a brief note explaining the issue.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit(reason, details.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit report.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4DE] dark:border-[#2C2F29]">
          <h2
            id="report-modal-title"
            className="font-display text-lg font-bold text-[#141512] dark:text-[#F4F4F0]"
          >
            Report Listing
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report dialog"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
            Reporting:{' '}
            <strong className="text-[#141512] dark:text-[#F4F4F0]">
              {listing.title}
            </strong>
          </div>

          <div>
            <label
              htmlFor="report-reason"
              className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
            >
              Reason
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="report-details"
              className="block text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] mb-1.5"
            >
              Details
            </label>
            <textarea
              id="report-details"
              rows={3}
              maxLength={500}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell our campus trust team what looks off."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#101110] text-[#141512] dark:text-[#F4F4F0]"
            />
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

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium text-[#5B5D54] dark:text-[#A3A69B] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

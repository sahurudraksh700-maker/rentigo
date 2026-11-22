import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4DE] dark:border-[#2C2F29]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={`w-5 h-5 ${
                danger
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-[var(--accent)]'
              }`}
              aria-hidden="true"
            />
            <h2
              id="confirm-dialog-title"
              className="font-display text-base font-bold text-[#141512] dark:text-[#F4F4F0]"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm leading-relaxed text-[#5B5D54] dark:text-[#A3A69B]">
            {description}
          </p>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2 min-h-[40px] rounded-xl text-sm font-medium text-[#5B5D54] dark:text-[#A3A69B] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={`px-5 py-2 min-h-[40px] rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 cursor-pointer ${
                danger
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[var(--accent)] hover:opacity-90'
              }`}
            >
              {busy ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

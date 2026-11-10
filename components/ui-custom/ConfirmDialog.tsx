'use client';

import { useEffect } from 'react';

export type ConfirmVariant = 'danger' | 'warning' | 'default';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const VARIANT_STYLES: Record<ConfirmVariant, {
  iconBg: string;
  iconColor: string;
  icon: string;
  confirmBtn: string;
}> = {
  danger: {
    iconBg: 'bg-[#ba1a1a]/10',
    iconColor: 'text-[#ba1a1a]',
    icon: 'delete',
    confirmBtn: 'bg-[#ba1a1a] hover:bg-[#a01616] text-white',
  },
  warning: {
    iconBg: 'bg-[#f59e0b]/10',
    iconColor: 'text-[#b45309]',
    icon: 'warning',
    confirmBtn: 'bg-[#f59e0b] hover:bg-[#d97706] text-white',
  },
  default: {
    iconBg: 'bg-[#00685f]/10',
    iconColor: 'text-[#00685f]',
    icon: 'help',
    confirmBtn: 'gradient-btn text-white',
  },
};

/**
 * ConfirmDialog — pengganti window.confirm() bawaan browser.
 *
 * Cara pakai singkat (lihat juga useConfirmDialog.ts untuk versi dengan hook):
 *
 *   const [open, setOpen] = useState(false);
 *
 *   <ConfirmDialog
 *     isOpen={open}
 *     title="Hapus data pasien?"
 *     description="Tindakan ini tidak dapat dibatalkan."
 *     variant="danger"
 *     onConfirm={() => { doDelete(); setOpen(false); }}
 *     onClose={() => setOpen(false)}
 *   />
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'default',
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isLoading) onClose();
    }
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const styles = VARIANT_STYLES[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0b1c30]/40 backdrop-blur-sm"
        onClick={() => { if (!isLoading) onClose(); }}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center mb-3`}>
            <span
              className={`material-symbols-outlined text-[24px] ${styles.iconColor}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {styles.icon}
            </span>
          </div>
          <h2 className="text-base font-bold text-[#0b1c30]">{title}</h2>
          {description && (
            <p className="text-sm text-[#3d4947] mt-1.5">{description}</p>
          )}
        </div>

        <div className="px-6 py-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-5 py-2.5 rounded-xl border border-[#bcc9c6] text-sm font-semibold text-[#3d4947] hover:bg-[#eff4ff] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${styles.confirmBtn}`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Memproses...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
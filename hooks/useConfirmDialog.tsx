'use client';

import { useState, useCallback } from 'react';
import type { ConfirmVariant } from '@/components/ui-custom/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  /** Dipanggil saat user klik tombol konfirmasi */
  onConfirm: () => unknown | Promise<unknown>;
}

/**
 * useConfirmDialog — pengganti window.confirm() dengan sedikit boilerplate.
 *
 * Cara pakai:
 *
 *   const { confirm, dialogProps } = useConfirmDialog();
 *
 *   function handleDelete(patient) {
 *     confirm({
 *       title: `Hapus data pasien ${patient.full_name}?`,
 *       description: 'Tindakan ini tidak dapat dibatalkan.',
 *       variant: 'danger',
 *       onConfirm: () => deleteMutation.mutate(patient.id),
 *     });
 *   }
 *
 *   return (
 *     <>
 *       ...
 *       <ConfirmDialog {...dialogProps} />
 *     </>
 *   );
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    setIsOpen(false);
    setOptions(null);
  }, [isLoading]);

  const handleConfirm = useCallback(async () => {
    if (!options) return;
    try {
      setIsLoading(true);
      await options.onConfirm();
      setIsOpen(false);
      setOptions(null);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  return {
    confirm,
    dialogProps: {
      isOpen,
      isLoading,
      title: options?.title ?? '',
      description: options?.description,
      confirmLabel: options?.confirmLabel,
      cancelLabel: options?.cancelLabel,
      variant: options?.variant,
      onConfirm: handleConfirm,
      onClose: handleClose,
    },
  };
}
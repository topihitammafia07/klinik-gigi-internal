'use client';

import { useEffect, useState } from 'react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  userName: string;
  onClose: () => void;
  onConfirm: (password: string, confirmation: string) => void;
  isLoading?: boolean;
}

export function ResetPasswordModal({
  isOpen,
  userName,
  onClose,
  onConfirm,
  isLoading,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmation('');
      setShowPassword(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isLoading, onClose]);

  if (!isOpen) return null;

  const valid = password.length >= 8 && password === confirmation;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Tutup modal"
        className="absolute inset-0 bg-[#0b1c30]/40 backdrop-blur-sm"
        onClick={() => { if (!isLoading) onClose(); }}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#bcc9c6]/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00685f]/10 text-[#00685f] flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">lock_reset</span>
          </div>
          <div>
            <h2 className="font-bold text-[#0b1c30]">Reset Password Staff</h2>
            <p className="text-xs text-[#3d4947] mt-0.5">Atur password baru untuk {userName}.</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-[#eff4ff] border border-[#bcc9c6]/30 px-4 py-3 text-xs text-[#3d4947] flex gap-2">
            <span className="material-symbols-outlined text-[17px] text-[#00685f]">info</span>
            Password lama tidak ditampilkan. Hanya Owner yang dapat melakukan reset akun staff.
          </div>

          <div>
            <label htmlFor="new-password" className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">Password Baru</label>
            <div className="flex items-center h-11 rounded-xl border border-[#bcc9c6] bg-white px-3 focus-within:border-[#00685f] focus-within:ring-2 focus-within:ring-[#00685f]/10">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="h-full flex-1 min-w-0 bg-transparent outline-none text-sm text-[#0b1c30]"
                placeholder="Minimal 8 karakter"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="p-1 text-[#6d7a77] hover:text-[#00685f]" aria-label="Tampilkan password">
                <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-xs font-semibold text-[#3d4947] uppercase tracking-wider mb-1.5">Konfirmasi Password</label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              className="h-11 w-full rounded-xl border border-[#bcc9c6] bg-white px-3 outline-none text-sm text-[#0b1c30] focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/10"
              placeholder="Ulangi password baru"
            />
            {confirmation && password !== confirmation && <p className="text-xs text-[#ba1a1a] mt-1.5">Konfirmasi password belum sama.</p>}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#bcc9c6]/60 flex justify-end gap-3">
          <button type="button" disabled={isLoading} onClick={onClose} className="px-5 py-2.5 rounded-xl border border-[#bcc9c6] text-sm font-semibold text-[#3d4947] hover:bg-[#eff4ff] disabled:opacity-50">Batal</button>
          <button type="button" disabled={!valid || isLoading} onClick={() => onConfirm(password, confirmation)} className="px-5 py-2.5 rounded-xl gradient-btn text-white text-sm font-semibold disabled:opacity-50">
            {isLoading ? 'Menyimpan...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

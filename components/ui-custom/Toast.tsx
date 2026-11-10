'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, string> = {
  success: 'check_circle',
  error:   'cancel',
  warning: 'warning',
  info:    'info',
};

const COLORS: Record<ToastType, { bg: string; icon: string; bar: string }> = {
  success: { bg: 'bg-white border-l-4 border-[#00873b]', icon: 'text-[#00873b]', bar: 'bg-[#00873b]' },
  error:   { bg: 'bg-white border-l-4 border-[#ba1a1a]', icon: 'text-[#ba1a1a]', bar: 'bg-[#ba1a1a]' },
  warning: { bg: 'bg-white border-l-4 border-[#d97706]', icon: 'text-[#d97706]', bar: 'bg-[#d97706]' },
  info:    { bg: 'bg-white border-l-4 border-[#0058be]', icon: 'text-[#0058be]', bar: 'bg-[#0058be]' },
};

const DURATION = 4500;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const colors = COLORS[toast.type];
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-xl shadow-lg min-w-[300px] max-w-sm ${colors.bg} animate-slideIn`}
      role="alert"
    >
      <div className="flex items-start gap-3 px-4 py-3 pr-8">
        <span
          className={`material-symbols-outlined text-[22px] mt-0.5 flex-shrink-0 ${colors.icon}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {ICONS[toast.type]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0b1c30]">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-[#3d4947] mt-0.5 leading-relaxed">{toast.message}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute top-2.5 right-2.5 text-[#6d7a77] hover:text-[#0b1c30] transition-colors"
        aria-label="Tutup notifikasi"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
      {/* Progress bar */}
      <div
        className={`h-0.5 ${colors.bar} transition-all duration-100 ease-linear`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }]);
    setTimeout(() => dismiss(id), DURATION + 200);
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) => addToast({ type: 'success', title, message }), [addToast]);
  const error   = useCallback((title: string, message?: string) => addToast({ type: 'error',   title, message }), [addToast]);
  const warning = useCallback((title: string, message?: string) => addToast({ type: 'warning', title, message }), [addToast]);
  const info    = useCallback((title: string, message?: string) => addToast({ type: 'info',    title, message }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

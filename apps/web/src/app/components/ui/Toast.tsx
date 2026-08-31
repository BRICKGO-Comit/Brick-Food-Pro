'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10000 }}>
        {toasts.map((toast) => {
          let bg = 'var(--info)';
          if (toast.type === 'success') bg = 'var(--success)';
          if (toast.type === 'error') bg = 'var(--primary)';
          if (toast.type === 'warning') bg = 'var(--warning)';

          return (
            <div key={toast.id} style={{
              background: bg, color: '#fff', padding: '12px 24px', borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow)', fontSize: '14px', fontWeight: '500', animation: 'fadeIn 0.3s ease-in-out'
            }}>
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

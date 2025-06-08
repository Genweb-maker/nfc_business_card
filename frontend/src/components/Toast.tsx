'use client';

import { useState, useEffect } from 'react';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

let toastId = 0;
let showToastFunction: ((message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void) | null = null;

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000) {
  if (showToastFunction) {
    showToastFunction(message, type, duration);
  }
}

export default function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000) => {
    const id = ++toastId;
    const newToast: ToastMessage = { id, message, type };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  };

  useEffect(() => {
    showToastFunction = addToast;
    return () => {
      showToastFunction = null;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast show ${toast.type} px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
} 
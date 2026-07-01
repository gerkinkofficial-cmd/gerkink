'use client';

import { useState, useCallback, useRef } from 'react';
import { getRandomRoast, HOVER_ROASTS, CART_ROASTS, ERROR_ROASTS } from '@/lib/utils/roasts';

interface ToastPayload {
  id: number;
  message: string;
  type: 'roast' | 'success' | 'error';
}

let nextId = 0;

export function useRoast() {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const toast = useCallback(
    (message: string, type: ToastPayload['type'] = 'roast', duration = 4000) => {
      const id = ++nextId;
      setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  const roast  = useCallback((msg?: string) => toast(msg ?? getRandomRoast(HOVER_ROASTS), 'roast'), [toast]);
  const cartMsg= useCallback((msg?: string) => toast(msg ?? getRandomRoast(CART_ROASTS), 'success'), [toast]);
  const error  = useCallback((msg?: string) => toast(msg ?? getRandomRoast(ERROR_ROASTS), 'error'), [toast]);

  return { toasts, toast, roast, cartMsg, error, dismiss };
}

// src/hooks/useToast.ts
// ═══════════════════════════════════════════════════════════════
// Hook لإدارة إشعارات Toast مع حذف تلقائي
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import type { ToastItem } from "../types";

export type ShowToastFn = (message: string, type?: "success" | "error" | "info") => void;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast: ShowToastFn = useCallback((message, type = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return { toasts, showToast };
}

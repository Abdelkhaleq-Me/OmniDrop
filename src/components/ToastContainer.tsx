// src/components/ToastContainer.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن الإشعارات العائمة (Toast Notifications Container)
// ═══════════════════════════════════════════════════════════════

import type { ToastItem } from "../types";

interface ToastContainerProps {
  toasts: ToastItem[];
}

export function ToastContainer({ toasts }: ToastContainerProps) {
  return (
    <div className="toast-wrap">
      {toasts.map((toast) => (
        <div className={`toast ${toast.type}`} key={toast.id}>
          {toast.type === "success" && <i className="ti ti-circle-check"></i>}
          {toast.type === "error" && <i className="ti ti-alert-triangle"></i>}
          {toast.type === "info" && <i className="ti ti-info-circle"></i>}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

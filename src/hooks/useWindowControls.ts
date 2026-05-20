// src/hooks/useWindowControls.ts
// ═══════════════════════════════════════════════════════════════
// Hook لأزرار التحكم بالنافذة (تصغير، تكبير/استعادة، إغلاق)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  // تتبع حالة التكبير عند تغيير حجم النافذة
  useEffect(() => {
    const updateMaxState = async () => {
      try {
        const win = getCurrentWindow();
        const max = await win.isMaximized();
        setIsMaximized(max);
      } catch (e) {
        console.error(e);
      }
    };
    updateMaxState();
    window.addEventListener("resize", updateMaxState);
    return () => {
      window.removeEventListener("resize", updateMaxState);
    };
  }, []);

  const handleMinimize = useCallback(async () => {
    try {
      const win = getCurrentWindow();
      await win.minimize();
    } catch (e) {
      console.error("Error minimizing window:", e);
    }
  }, []);

  const handleToggleMaximize = useCallback(async () => {
    try {
      const win = getCurrentWindow();
      await win.toggleMaximize();
    } catch (e) {
      console.error("Error maximizing window:", e);
    }
  }, []);

  const handleClose = useCallback(async () => {
    try {
      const win = getCurrentWindow();
      await win.close();
    } catch (e) {
      console.error("Error closing window:", e);
    }
  }, []);

  return { isMaximized, handleMinimize, handleToggleMaximize, handleClose };
}

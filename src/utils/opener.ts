// src/utils/opener.ts
// ═══════════════════════════════════════════════════════════════
// دالة مشتركة وموحدة لفتح مسار الملف/المجلد في نظام التشغيل
// ═══════════════════════════════════════════════════════════════

import { invoke } from "@tauri-apps/api/core";

/**
 * يفتح مسار ملف أو مجلد في مستكشف ملفات نظام التشغيل.
 * 
 * @param filePath المسار الكامل للملف أو المجلد
 * @param showToast دالة عرض الإشعارات لعرض الخطأ عند الفشل
 */
export async function openFileFolder(
  filePath: string,
  showToast: (msg: string, type: "success" | "error" | "info") => void
): Promise<void> {
  try {
    await invoke("plugin:opener|open_path", { path: filePath });
  } catch (err: any) {
    showToast(err.toString(), "error");
  }
}

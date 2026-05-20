import { revealItemInDir } from "@tauri-apps/plugin-opener";

/**
 * يفتح مسار ملف أو مجلد في مستكشف ملفات نظام التشغيل ويكشف عن الملف المختار.
 * 
 * @param filePath المسار الكامل للملف أو المجلد
 * @param showToast دالة عرض الإشعارات لعرض الخطأ عند الفشل
 */
export async function openFileFolder(
  filePath: string,
  showToast: (msg: string, type: "success" | "error" | "info") => void
): Promise<void> {
  try {
    await revealItemInDir(filePath);
  } catch (err: any) {
    showToast(err.toString(), "error");
  }
}

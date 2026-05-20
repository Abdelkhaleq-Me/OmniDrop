// src/utils/format.ts
// ═══════════════════════════════════════════════════════════════
// دوال التنسيق والمساعدة — مُستخرجة من App.tsx
// ═══════════════════════════════════════════════════════════════

/** تنسيق المدة بالثواني إلى h:mm:ss أو m:ss */
export const formatDuration = (sec: number | null | undefined): string => {
  if (!sec) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const sStr = s < 10 ? `0${s}` : `${s}`;
  if (h > 0) {
    const mStr = m < 10 ? `0${m}` : `${m}`;
    return `${h}:${mStr}:${sStr}`;
  }
  return `${m}:${sStr}`;
};

/** تنسيق الحجم بالبايت إلى وحدة مقروءة (B, KB, MB, GB) */
export const formatBytes = (bytes: number | null | undefined): string => {
  if (!bytes) return "—";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = 1;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/** تحقق ما إذا كانت الجودة المطلوبة مدعومة بناءً على أقصى ارتفاع متاح */
export const isQualitySupported = (qHeight: number, maxSupportedHeight: number | null | undefined): boolean => {
  if (!maxSupportedHeight) return true;
  if (qHeight === 360) return true; // baseline
  if (qHeight === 480) return maxSupportedHeight >= 400;
  if (qHeight === 720) return maxSupportedHeight >= 600;
  if (qHeight === 1080) return maxSupportedHeight >= 900;
  if (qHeight === 1440) return maxSupportedHeight >= 1200;
  if (qHeight === 2160) return maxSupportedHeight >= 1800;
  return qHeight <= maxSupportedHeight;
};

/** كشف نوع الرابط (فيديو مفرد / قائمة تشغيل / غير معروف) */
export const detectLinkType = (val: string): "video" | "playlist" | "unknown" | null => {
  if (!val || !val.trim()) return null;
  const trimmed = val.trim();

  // الأولوية للفيديو المفرد
  const isSingleVideo = /watch\?v=/i.test(trimmed) || /youtu\.be\//i.test(trimmed) ||
    /tiktok\.com/i.test(trimmed) || /instagram\.com/i.test(trimmed) ||
    /twitter\.com/i.test(trimmed) || /x\.com/i.test(trimmed);
  if (isSingleVideo) return "video";

  // قوائم التشغيل
  const isPlaylist = /list=/i.test(trimmed) || /playlist/i.test(trimmed) || /\/sets\//i.test(trimmed);
  if (isPlaylist) return "playlist";

  // منصات عامة
  const isGeneralVideoPlatform = /youtu|tiktok|instagram|twitter|x\.com/i.test(trimmed);
  if (isGeneralVideoPlatform) return "video";

  return "unknown";
};

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

  // الأولوية للفيديو المفرد (الرابط الذي يحتوي على watch?v= أو youtu.be/ يُعامل كفيديو فردي حتى لو احتوى على list=)
  const hasSingleVideoMarker = /watch\?v=/i.test(trimmed) || /youtu\.be\//i.test(trimmed);
  const isPlaylist = (/list=/i.test(trimmed) || /playlist/i.test(trimmed) || /\/sets\//i.test(trimmed)) && !hasSingleVideoMarker;
  if (isPlaylist) return "playlist";

  const isSingleVideo = hasSingleVideoMarker ||
    /tiktok\.com/i.test(trimmed) || /instagram\.com/i.test(trimmed) ||
    /twitter\.com/i.test(trimmed) || /x\.com/i.test(trimmed);
  if (isSingleVideo) return "video";

  // منصات عامة
  const isGeneralVideoPlatform = /youtu|tiktok|instagram|twitter|x\.com/i.test(trimmed);
  if (isGeneralVideoPlatform) return "video";

  return "unknown";
};

/** تحويل نص السرعة (بما في ذلك وحدات IEC و SI) إلى رقم بالبايت في الثانية */
export function parseSpeedToBytes(speed: string): number {
  if (!speed) return 0;
  const match = speed.match(/([\d.]+)\s*(GiB|MiB|KiB|GB|MB|KB)\/s/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    'gib': 1024**3, 'mib': 1024**2, 'kib': 1024,
    'gb': 1000**3,  'mb': 1000**2,  'kb': 1000,
  };
  return value * (multipliers[unit] || 0);
}

/** تنسيق السرعة الرقمية بالبايت في الثانية إلى وحدة مقروءة مناسبة (MB/s) */
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return "0.0 MB/s";
  const mb = bytesPerSec / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB/s`;
  }
  return `${mb.toFixed(1)} MB/s`;
}

import type { Translations } from "../i18n/translations";

/** الحصول على لون شريط الحالة المرتبط بالتحميل */
export const getLeftStripColor = (status: string): string => {
  switch (status) {
    case "downloading":
    case "fetching_metadata":
      return "var(--s-dl)";
    case "processing":
      return "var(--s-proc)";
    case "completed":
      return "var(--s-comp)";
    case "cancelled":
      return "var(--s-canc)";
    case "failed":
      return "var(--s-fail)";
    case "pending":
    default:
      return "var(--s-pend)";
  }
};

/** ترجمة حالة المهمة بشكل آمن من نصوص الترجمات */
export const getStatusTranslation = (t: Translations, status: string): string => {
  const keys: Record<string, keyof Translations> = {
    pending: "pending",
    downloading: "downloading",
    fetching_metadata: "fetching_metadata",
    processing: "processing",
    completed: "completed",
    cancelled: "cancelled",
    failed: "failed",
  };
  const key = keys[status];
  if (key && t[key]) {
    return t[key] as string;
  }
  return status;
};

/** تقدير حجم الصوت بالبايت بناءً على المدة بالثواني والصيغة */
export const getEstimatedAudioSize = (duration: number | null | undefined, format: string): number => {
  if (!duration || duration <= 0) return 0;
  const bitrates: Record<string, number> = {
    mp3: 192000,
    m4a: 128000,
    flac: 800000,
    opus: 128000,
  };
  const bps = bitrates[format.toLowerCase()] || 128000;
  return Math.round((duration * bps) / 8);
};


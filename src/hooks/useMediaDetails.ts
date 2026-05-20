// src/hooks/useMediaDetails.ts
// ═══════════════════════════════════════════════════════════════
// Hook لجلب البيانات الوصفية مسبقاً مع debounce + تقدير الأحجام
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { MediaDetails } from "../types";
import { isQualitySupported, formatBytes, detectLinkType } from "../utils/format";

interface UseMediaDetailsReturn {
  mediaDetails: MediaDetails | null;
  isPrefetching: boolean;
  getSelectedQualitySize: () => string | null;
}

export function useMediaDetails(
  url: string,
  quality: string,
  setQuality: (q: string) => void,
): UseMediaDetailsReturn {
  const [mediaDetails, setMediaDetails] = useState<MediaDetails | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const qualityRef = useRef(quality);

  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  // Debounced prefetch عند تغيير الرابط
  useEffect(() => {
    if (!url || !url.trim()) {
      setMediaDetails(null);
      return;
    }

    const type = detectLinkType(url);
    if (type === "unknown" || !type) {
      setMediaDetails(null);
      return;
    }

    let active = true;

    const delayDebounce = setTimeout(async () => {
      if (!active) return;
      setIsPrefetching(true);
      setMediaDetails(null);
      try {
        const details = await invoke<MediaDetails>("fetch_media_details", { url: url.trim() });
        if (!active) return;
        setMediaDetails(details);

        // تعديل تلقائي للجودة إذا كانت غير مدعومة
        if (!details.is_playlist && details.max_height > 0 && qualityRef.current !== "best") {
          const currentHeight = parseInt(qualityRef.current, 10);
          if (!isQualitySupported(currentHeight, details.max_height)) {
            const targetHeights = [360, 480, 720, 1080, 1440, 2160];
            const supported = targetHeights.filter(h => isQualitySupported(h, details.max_height));
            if (supported.length > 0) {
              const bestSupportedHeight = Math.max(...supported);
              setQuality(bestSupportedHeight.toString());
            }
          }
        }
      } catch (err) {
        if (active) {
          console.error("Failed to prefetch media details:", err);
        }
      } finally {
        if (active) {
          setIsPrefetching(false);
        }
      }
    }, 600);
    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [url, setQuality]);

  /** حساب الحجم المقدّر للجودة المحددة حالياً */
  const getSelectedQualitySize = (): string | null => {
    if (!mediaDetails || !mediaDetails.qualities || mediaDetails.qualities.length === 0) return null;
    
    if (quality === "best") {
      const best = mediaDetails.qualities.reduce((prev, current) => {
        return (current.size_bytes || 0) > (prev.size_bytes || 0) ? current : prev;
      });
      return best.size_bytes ? formatBytes(best.size_bytes) : null;
    }

    const currentHeight = parseInt(quality, 10);
    const qInfo = mediaDetails.qualities.find(q => q.height === currentHeight);
    if (qInfo && qInfo.size_bytes) {
      return formatBytes(qInfo.size_bytes);
    }
    return null;
  };

  return { mediaDetails, isPrefetching, getSelectedQualitySize };
}

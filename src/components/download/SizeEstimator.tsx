// src/components/download/SizeEstimator.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن شريط الحجم المتوقع والتحقق من أقصى دقة مدعومة
// ═══════════════════════════════════════════════════════════════

import { useLang } from "../../i18n/LangContext";
import type { MediaDetails } from "../../types";

interface SizeEstimatorProps {
  isPrefetching: boolean;
  mediaDetails: MediaDetails | null;
  getSelectedQualitySize: () => string | null;
}

export function SizeEstimator({
  isPrefetching,
  mediaDetails,
  getSelectedQualitySize,
}: SizeEstimatorProps) {
  const { t } = useLang();

  if (!isPrefetching && !mediaDetails) return null;

  return (
    <div className="size-bar">
      {isPrefetching ? (
        <>
          <div className="mini-spinner"></div>
          <span className="stxt">{t.fetchingDetails}</span>
        </>
      ) : (
        mediaDetails && (
          <>
            <i className="ti ti-database sico" style={{ color: "var(--bl)" }}></i>
            <span className="stxt">
              {mediaDetails.is_playlist ? t.estimatedPlaylistSize : t.estimatedVideoSize}
              <strong style={{ color: "var(--bl)", marginLeft: "4px" }}>
                {getSelectedQualitySize() || "—"}
              </strong>
              {!mediaDetails.is_playlist && mediaDetails.max_height > 0 && (
                <span style={{ opacity: 0.6, fontSize: "10px", marginInlineStart: "8px" }}>
                  ({t.maxSupportedRes} {mediaDetails.max_height}p)
                </span>
              )}
            </span>
          </>
        )
      )}
    </div>
  );
}

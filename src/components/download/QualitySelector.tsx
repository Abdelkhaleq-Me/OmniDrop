// src/components/download/QualitySelector.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن اختيار جودة الفيديو (من 360p إلى 4K) مع التحقق من الدعم
// ═══════════════════════════════════════════════════════════════

import { useLang } from "../../i18n/LangContext";
import type { MediaDetails } from "../../types";
import { isQualitySupported } from "../../utils/format";

interface QualitySelectorProps {
  quality: string;
  setQuality: (q: string) => void;
  mediaDetails: MediaDetails | null;
}

export function QualitySelector({ quality, setQuality, mediaDetails }: QualitySelectorProps) {
  const { t } = useLang();
  const qualities = ["2160", "1440", "1080", "720", "480", "360"];

  return (
    <div className="options-row">
      <span className="ol">{t.quality}</span>
      {qualities.map((q) => {
        const height = parseInt(q, 10);
        const isUnsupported =
          mediaDetails &&
          !mediaDetails.is_playlist &&
          mediaDetails.max_height > 0 &&
          !isQualitySupported(height, mediaDetails.max_height);

        const label =
          q === "2160"
            ? t.quality4K
            : q === "1440"
            ? t.quality2K
            : `${q}p`;

        return (
          <button
            key={q}
            className={`chip ${quality === q ? "ac" : ""} ${isUnsupported ? "unsupported" : ""}`}
            onClick={() => !isUnsupported && setQuality(q)}
            disabled={!!isUnsupported}
            title={isUnsupported ? t.qualityUnsupported : ""}
            style={
              isUnsupported
                ? { opacity: 0.35, cursor: "not-allowed", textDecoration: "line-through" }
                : {}
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

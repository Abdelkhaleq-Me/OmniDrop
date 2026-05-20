// src/components/download/OptionsDrawer.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن لوحة الخيارات المنسدلة (اختيار الوضع، الدقة، أو صيغة الصوت)
// ═══════════════════════════════════════════════════════════════

import { useLang } from "../../i18n/LangContext";
import type { MediaDetails } from "../../types";
import { QualitySelector } from "./QualitySelector";
import { AudioFormatSelector } from "./AudioFormatSelector";
import { SizeEstimator } from "./SizeEstimator";

interface OptionsDrawerProps {
  isOpen: boolean;
  mode: "video" | "audio";
  setMode: (mode: "video" | "audio") => void;
  quality: string;
  setQuality: (q: string) => void;
  afmt: string;
  setAfmt: (fmt: string) => void;
  mediaDetails: MediaDetails | null;
  isPrefetching: boolean;
  getSelectedQualitySize: () => string | null;
}

export function OptionsDrawer({
  isOpen,
  mode,
  setMode,
  quality,
  setQuality,
  afmt,
  setAfmt,
  mediaDetails,
  isPrefetching,
  getSelectedQualitySize,
}: OptionsDrawerProps) {
  const { t } = useLang();

  return (
    <div className={`op ${isOpen ? "open" : ""}`}>
      <div className="oi">
        {/* Mode Selection */}
        <div className="or">
          <span className="ol">{t.modeLabel}</span>
          <button
            className={`chip ${mode === "video" ? "ac" : ""}`}
            onClick={() => setMode("video")}
          >
            <i className="ti ti-video"></i>
            {t.videoMode}
          </button>
          <button
            className={`chip ${mode === "audio" ? "ac" : ""}`}
            onClick={() => setMode("audio")}
          >
            <i className="ti ti-music"></i>
            {t.audioMode}
          </button>
        </div>

        {/* Video Quality Options */}
        {mode === "video" && (
          <QualitySelector
            quality={quality}
            setQuality={setQuality}
            mediaDetails={mediaDetails}
          />
        )}

        {/* Audio Format Options */}
        {mode === "audio" && <AudioFormatSelector afmt={afmt} setAfmt={setAfmt} />}

        {/* Dynamic Description Strip */}
        <div className="sbar">
          <i className="ti ti-info-circle sico"></i>
          <span
            className="stxt"
            dangerouslySetInnerHTML={{
              __html:
                mode === "video"
                  ? t.singleInfo.replace("{q}", `${quality}p`)
                  : t.audioInfo.replace("{f}", afmt.toUpperCase()),
            }}
          />
        </div>

        {/* Size Estimator Strip */}
        {mode === "video" && (
          <SizeEstimator
            isPrefetching={isPrefetching}
            mediaDetails={mediaDetails}
            getSelectedQualitySize={getSelectedQualitySize}
          />
        )}
      </div>
    </div>
  );
}

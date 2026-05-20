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
    <div className={`options-panel ${isOpen ? "open" : ""}`}>
      <div className="option-item">
        {/* Mode Selection */}
        <div className="options-row">
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
        <div className="status-bar">
          <i className="ti ti-info-circle status-icon"></i>
          <span className="status-text">
            {mode === "video" ? (
              <>
                {t.singleInfoPre}
                <b>{quality}p</b>
                {t.singleInfoPost}
              </>
            ) : (
              <>
                {t.audioInfoPre}
                <b>{afmt.toUpperCase()}</b>
                {t.audioInfoPost}
              </>
            )}
          </span>
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

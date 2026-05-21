// src/components/download/OptionsDrawer.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن لوحة الخيارات المنسدلة (اختيار الوضع، الدقة، أو صيغة الصوت)
// ═══════════════════════════════════════════════════════════════

import { useLang } from "../../i18n/LangContext";
import type { MediaDetails } from "../../types";
import { QualitySelector } from "./QualitySelector";
import { AudioFormatSelector } from "./AudioFormatSelector";
import { getEstimatedAudioSize, formatBytes } from "../../utils/format";

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

  // مساعد لبناء نص الحالة الموحد مع الحجم المقدر
  const renderStatusContent = () => {
    if (!mediaDetails) {
      if (mode === "video") {
        return (
          <>
            {t.badgeVideo} · <b>{quality}p</b>
          </>
        );
      } else {
        return (
          <>
            {t.audioInfoPre.replace(" · ", "")} · <b>{afmt.toUpperCase()}</b>
          </>
        );
      }
    }

    const isPlaylist = mediaDetails.is_playlist;
    const typeLabel = isPlaylist ? t.badgePlaylist : (mode === "video" ? t.badgeVideo : t.audioInfoPre.replace(" · ", ""));

    if (mode === "video") {
      const sizeStr = getSelectedQualitySize();
      return (
        <>
          {typeLabel} · <b>{quality}p</b>
          {sizeStr && (
            <>
              {" · "}
              <b style={{ color: "var(--bl)" }}>{sizeStr}</b>
            </>
          )}
          {!isPlaylist && mediaDetails.max_height > 0 && (
            <span style={{ opacity: 0.6, fontSize: "10px", marginInlineStart: "8px" }}>
              ({t.maxSupportedRes} {mediaDetails.max_height}p)
            </span>
          )}
        </>
      );
    } else {
      const sizeBytes = getEstimatedAudioSize(mediaDetails.total_duration, afmt);
      const sizeStr = sizeBytes > 0 ? formatBytes(sizeBytes) : null;
      return (
        <>
          {typeLabel} · <b>{afmt.toUpperCase()}</b>
          {sizeStr && (
            <>
              {" · "}
              <b style={{ color: "var(--bl)" }}>{sizeStr}</b>
            </>
          )}
        </>
      );
    }
  };

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

        {/* Unified Status and Size Strip */}
        <div className="status-bar" style={{ marginTop: "12px" }}>
          {isPrefetching ? (
            <>
              <div className="mini-spinner"></div>
              <span className="status-text">{t.fetchingDetails}</span>
            </>
          ) : (
            <>
              <i className="ti ti-info-circle status-icon"></i>
              <span className="status-text">
                {renderStatusContent()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


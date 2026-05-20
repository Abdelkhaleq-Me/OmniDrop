// src/components/download/DownloadInput.tsx
// ═══════════════════════════════════════════════════════════════
// المكوّن الجامع لمنطقة الإدخال (شريط الرابط + لوحة الخيارات الإضافية)
// ═══════════════════════════════════════════════════════════════

import type { MediaDetails } from "../../types";
import { UrlBar } from "./UrlBar";
import { OptionsDrawer } from "./OptionsDrawer";

interface DownloadInputProps {
  url: string;
  setUrl: (url: string) => void;
  badgeType: "video" | "playlist" | "unknown" | "";
  setBadgeType: (type: "video" | "playlist" | "unknown" | "") => void;
  isOptionsOpen: boolean;
  setIsOptionsOpen: (open: boolean) => void;
  mode: "video" | "audio";
  setMode: (mode: "video" | "audio") => void;
  quality: string;
  setQuality: (q: string) => void;
  afmt: string;
  setAfmt: (fmt: string) => void;
  mediaDetails: MediaDetails | null;
  isPrefetching: boolean;
  getSelectedQualitySize: () => string | null;
  onPaste: () => void;
  onDownload: () => void;
}

export function DownloadInput({
  url,
  setUrl,
  badgeType,
  setBadgeType,
  isOptionsOpen,
  setIsOptionsOpen,
  mode,
  setMode,
  quality,
  setQuality,
  afmt,
  setAfmt,
  mediaDetails,
  isPrefetching,
  getSelectedQualitySize,
  onPaste,
  onDownload,
}: DownloadInputProps) {
  return (
    <div className="iz">
      <div className={`ush ${badgeType === 'video' ? 'valid' : badgeType === 'playlist' ? 'ispl' : badgeType === 'unknown' ? 'invalid' : ''} ${isOptionsOpen ? 'popen' : ''}`}>
        <UrlBar
          url={url}
          setUrl={setUrl}
          badgeType={badgeType}
          setBadgeType={setBadgeType}
          isOptionsOpen={isOptionsOpen}
          setIsOptionsOpen={setIsOptionsOpen}
          onPaste={onPaste}
          onDownload={onDownload}
        />
        <OptionsDrawer
          isOpen={isOptionsOpen}
          mode={mode}
          setMode={setMode}
          quality={quality}
          setQuality={setQuality}
          afmt={afmt}
          setAfmt={setAfmt}
          mediaDetails={mediaDetails}
          isPrefetching={isPrefetching}
          getSelectedQualitySize={getSelectedQualitySize}
        />
      </div>
    </div>
  );
}

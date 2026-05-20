// src/components/download/UrlBar.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن شريط إدخال الرابط (مع الشارات وأزرار اللصق والخيارات والتحميل)
// ═══════════════════════════════════════════════════════════════

import { useLang } from "../../i18n/LangContext";
import { detectLinkType } from "../../utils/format";

interface UrlBarProps {
  url: string;
  setUrl: (url: string) => void;
  badgeType: "video" | "playlist" | "unknown" | "";
  setBadgeType: (type: "video" | "playlist" | "unknown" | "") => void;
  isOptionsOpen: boolean;
  setIsOptionsOpen: (open: boolean) => void;
  onPaste: () => void;
  onDownload: () => void;
}

export function UrlBar({
  url,
  setUrl,
  badgeType,
  setBadgeType,
  isOptionsOpen,
  setIsOptionsOpen,
  onPaste,
  onDownload,
}: UrlBarProps) {
  const { lang, t } = useLang();

  const handleInputChange = (val: string) => {
    setUrl(val);
    setBadgeType(detectLinkType(val) || "");
  };

  const handleClear = () => {
    setUrl("");
    setBadgeType("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onDownload();
    }
  };

  const tbadgeTypeClass =
    badgeType === "video" ? "vid" : badgeType === "playlist" ? "progress-label" : "err";

  return (
    <div className="url-row">
      {/* 1. Link icon */}
      <i className="ti ti-link uico" aria-hidden="true"></i>

      {/* 2. Text Input */}
      <input
        type="text"
        className="uinp"
        placeholder={t.pastePlaceholder}
        value={url}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      {/* 3. BadgeType */}
      {badgeType && (
        <span className={`type-badge show ${tbadgeTypeClass}`}>
          {badgeType === "video" && (
            <>
              <i className="ti ti-video"></i>
              {t.badgeVideo}
            </>
          )}
          {badgeType === "playlist" && (
            <>
              <i className="ti ti-playlist"></i>
              {t.badgePlaylist}
            </>
          )}
          {badgeType === "unknown" && (
            <>
              <i className="ti ti-alert-circle"></i>
              {t.badgeUnknown}
            </>
          )}
        </span>
      )}

      {/* 4. Clear button (if URL is set) */}
      {url && (
        <button className="paste-btn" onClick={handleClear} aria-label={lang === "ar" ? "مسح" : "Clear"} style={{ marginInlineEnd: '4px' }}>
          <i className="ti ti-x"></i>
        </button>
      )}

      {/* 5. Paste button */}
      <button className="paste-btn" onClick={onPaste} title={t.pasteBtn} aria-label={t.pasteBtn}>
        <i className="ti ti-clipboard"></i>
      </button>

      {/* 6. Options button */}
      <button
        className={`toggle-btn ${isOptionsOpen ? "on" : ""}`}
        onClick={() => setIsOptionsOpen(!isOptionsOpen)}
        aria-expanded={isOptionsOpen}
      >
        <i className="ti ti-adjustments-horizontal"></i>
        {t.options}
        <i className="ti ti-chevron-down chev"></i>
      </button>

      {/* 7. Download button */}
      <button className="download-button" onClick={onDownload} disabled={!url.trim()} aria-label={t.downloadBtn}>
        <i className="ti ti-arrow-bar-to-down"></i>
        {t.downloadBtn}
      </button>
    </div>
  );
}

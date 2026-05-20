// src/components/Topbar.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن شريط العنوان العلوي (أزرار التحكم بالنافذة + الشعار)
// ═══════════════════════════════════════════════════════════════

import { useWindowControls } from "../hooks/useWindowControls";
import { useLang } from "../i18n/LangContext";

export function Topbar() {
  const { isMaximized, handleMinimize, handleToggleMaximize, handleClose } = useWindowControls();
  const { t } = useLang();

  return (
    <div className="topbar">
      <div className="logo">
        <div className="lm">
          <i className="ti ti-arrow-bar-to-down"></i>
        </div>
        <span className="ln">
          Omni<em>Drop</em>
        </span>
      </div>
      <div className="wc">
        <button
          className="wd min"
          onClick={handleMinimize}
          aria-label={t.minimize}
          title={t.minimize}
        >
          <i className="ti ti-minus"></i>
        </button>
        <button
          className="wd max"
          onClick={handleToggleMaximize}
          aria-label={isMaximized ? t.restore : t.maximize}
          title={isMaximized ? t.restore : t.maximize}
        >
          {isMaximized ? <i className="ti ti-copy"></i> : <i className="ti ti-square"></i>}
        </button>
        <button
          className="wd cls"
          onClick={handleClose}
          aria-label={t.close}
          title={t.close}
        >
          <i className="ti ti-x"></i>
        </button>
      </div>
    </div>
  );
}

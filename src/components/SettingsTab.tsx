// src/components/SettingsTab.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن تبويب الإعدادات (عرض إحصائيات قاعدة البيانات والتحميل)
// ═══════════════════════════════════════════════════════════════

import { useLang } from "../i18n/LangContext";

export function SettingsTab() {
  const { t } = useLang();

  return (
    <div className="settings-wrap">
      <div className="settings-card">
        <div className="settings-title">{t.settingsTitle}</div>
        <div className="settings-desc">{t.settingsDesc}</div>

        <div className="settings-row">
          <span className="settings-lbl">{t.parallelFragments}</span>
          <span className="settings-val">8 concurrent fragments</span>
        </div>

        <div className="settings-row">
          <span className="settings-lbl">{t.chunkSize}</span>
          <span className="settings-val">10 MB</span>
        </div>

        <div className="settings-row">
          <span className="settings-lbl">{t.activeLimits}</span>
          <span className="settings-val">3 concurrent tasks</span>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-title">{t.systemStats}</div>
        <div className="settings-desc" style={{ marginBottom: 0 }}>
          {t.dbStatus}
        </div>
      </div>
    </div>
  );
}

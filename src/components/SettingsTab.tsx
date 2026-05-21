import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLang } from "../i18n/LangContext";

interface AppConfigDto {
  download_path: string;
  concurrent_fragments: number;
  http_chunk_size_mb: number;
  max_concurrent_downloads: number;
}

export function SettingsTab() {
  const { t, lang } = useLang();
  const [config, setConfig] = useState<AppConfigDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // جلب الإعدادات الحالية عند فتح التبويب
  useEffect(() => {
    invoke<AppConfigDto>("get_app_config")
      .then(setConfig)
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      await invoke("update_app_config", { newConfig: config });
      setSaveMsg(lang === "ar" ? "تم الحفظ بنجاح ✓" : "Saved successfully ✓");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      setSaveMsg(String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickFolder = async () => {
    try {
      const folder = await invoke<string | null>("pick_download_folder");
      if (folder && config) {
        setConfig({ ...config, download_path: folder });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!config) return <div className="settings-wrap">جاري التحميل...</div>;

  return (
    <div className="settings-wrap">
      <div className="settings-card">
        <div className="settings-title">{t.settingsTitle}</div>
        <div className="settings-desc">{t.settingsDesc}</div>

        {/* مجلد التحميل */}
        <div className="settings-row">
          <span className="settings-lbl">{t.downloadFolder ?? "مجلد التحميل"}</span>
          <div style={{ display: "flex", gap: 8, flex: 1 }}>
            <input
              className="settings-input"
              value={config.download_path}
              onChange={(e) => setConfig({ ...config, download_path: e.target.value })}
              style={{ flex: 1, fontSize: 12 }}
            />
            <button className="settings-btn" onClick={handlePickFolder}>
              <i className="ti ti-folder-open" />
            </button>
          </div>
        </div>

        {/* الأجزاء المتوازية */}
        <div className="settings-row">
          <span className="settings-lbl">{t.parallelFragments}</span>
          <input
            type="number"
            className="settings-input"
            value={config.concurrent_fragments}
            min={1}
            max={32}
            onChange={(e) =>
              setConfig({ ...config, concurrent_fragments: parseInt(e.target.value) || 1 })
            }
          />
        </div>

        {/* حجم الـ Chunk */}
        <div className="settings-row">
          <span className="settings-lbl">{t.chunkSize}</span>
          <input
            type="number"
            className="settings-input"
            value={config.http_chunk_size_mb}
            min={1}
            max={100}
            onChange={(e) =>
              setConfig({ ...config, http_chunk_size_mb: parseInt(e.target.value) || 1 })
            }
          />
          <span style={{ fontSize: 11, opacity: 0.6 }}>MB</span>
        </div>

        {/* الحد الأقصى للتحميلات */}
        <div className="settings-row">
          <span className="settings-lbl">{t.activeLimits}</span>
          <span className="settings-val">{config.max_concurrent_downloads} concurrent tasks</span>
          {/* ملاحظة: هذا يتطلب إعادة تشغيل لتغييره فعلياً لأن Semaphore مُهيَّأ مرة واحدة */}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <button className="settings-save-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "..." : (lang === "ar" ? "حفظ الإعدادات" : "Save Settings")}
          </button>
          {saveMsg && (
            <span style={{ fontSize: 12, color: "var(--s-done)" }}>{saveMsg}</span>
          )}
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

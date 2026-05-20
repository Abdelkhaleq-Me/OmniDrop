// src/components/SettingsTab.tsx
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLang } from "../i18n/LangContext";
import { useToast } from "../hooks/useToast";

interface AppConfigPayload {
  default_download_path: string;
  max_concurrent_downloads: number;
  concurrent_fragments: number;
  http_chunk_size_mb: number;
}

interface DbStats {
  total_downloads: number;
  completed_downloads: number;
  failed_downloads: number;
  total_playlists: number;
}

export function SettingsTab() {
  const { t } = useLang();
  const { showToast } = useToast();

  const [config, setConfig] = useState<AppConfigPayload>({
    default_download_path: "",
    max_concurrent_downloads: 3,
    concurrent_fragments: 4,
    http_chunk_size_mb: 10,
  });

  const [stats, setStats] = useState<DbStats>({
    total_downloads: 0,
    completed_downloads: 0,
    failed_downloads: 0,
    total_playlists: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [loadedConfig, dbStats] = await Promise.all([
          invoke<AppConfigPayload>("get_config"),
          invoke<DbStats>("get_db_stats"),
        ]);
        if (!mounted) return;
        setConfig(loadedConfig);
        setStats(dbStats);
      } catch (err: any) {
        if (!mounted) return;
        showToast(err.toString(), "error");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [showToast]);

  const handleBrowse = async () => {
    try {
      const selected = await invoke<string | null>("select_directory");
      if (selected) {
        setConfig((prev) => ({ ...prev, default_download_path: selected }));
      }
    } catch (err: any) {
      showToast(err.toString(), "error");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await invoke("update_config", { newConfig: config });
      showToast(t.settingsSaved, "success");
    } catch (err: any) {
      showToast(t.settingsSaveError + err.toString(), "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="settings-wrap">
        <div className="settings-card" style={{ textAlign: "center", padding: "40px" }}>
          ...
        </div>
      </div>
    );
  }

  const inputStyle = {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "0.5px solid var(--bd2)",
    background: "var(--bg2)",
    color: "var(--t0)",
    fontFamily: "inherit",
    fontSize: "11px",
    outline: "none",
    transition: "all 0.15s ease",
  };

  return (
    <div className="settings-wrap">
      <div className="settings-card">
        <div className="settings-title">{t.settingsTitle}</div>
        <div className="settings-desc">{t.settingsDesc}</div>

        <div className="settings-row">
          <span className="settings-lbl">{t.savePathLabel}</span>
          <div style={{ display: "flex", gap: "8px", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
            <input 
              type="text" 
              readOnly 
              value={config.default_download_path} 
              style={{ ...inputStyle, flex: 1, minWidth: "150px", cursor: "default" }}
            />
            <button className="secondary-btn" onClick={handleBrowse}>{t.browseBtn}</button>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-lbl">{t.activeLimits}</span>
          <select 
            style={inputStyle}
            value={config.max_concurrent_downloads}
            onChange={(e) => setConfig({ ...config, max_concurrent_downloads: parseInt(e.target.value) })}
          >
            {[1, 2, 3, 4, 5, 6].map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <span className="settings-lbl">{t.parallelFragments}</span>
          <select 
            style={inputStyle}
            value={config.concurrent_fragments}
            onChange={(e) => setConfig({ ...config, concurrent_fragments: parseInt(e.target.value) })}
          >
            {[1, 2, 4, 8, 16].map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <span className="settings-lbl">{t.chunkSize}</span>
          <select 
            style={inputStyle}
            value={config.http_chunk_size_mb}
            onChange={(e) => setConfig({ ...config, http_chunk_size_mb: parseInt(e.target.value) })}
          >
            {[5, 10, 20, 50, 100].map(val => (
              <option key={val} value={val}>{val} MB</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
          <button className="primary-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "..." : t.saveBtn}
          </button>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-title">{t.systemStats}</div>
        <div className="settings-desc">{t.dbStatus}</div>
        <div className="settings-row">
          <span className="settings-lbl">{t.dbTotal}</span>
          <span className="settings-val" style={{ fontWeight: "bold" }}>{stats.total_downloads}</span>
        </div>
        <div className="settings-row">
          <span className="settings-lbl">{t.dbCompleted}</span>
          <span className="settings-val" style={{ color: "var(--green)" }}>{stats.completed_downloads}</span>
        </div>
        <div className="settings-row">
          <span className="settings-lbl">{t.dbFailed}</span>
          <span className="settings-val" style={{ color: "var(--red)" }}>{stats.failed_downloads}</span>
        </div>
        <div className="settings-row">
          <span className="settings-lbl">{t.dbPlaylists}</span>
          <span className="settings-val">{stats.total_playlists}</span>
        </div>
      </div>
    </div>
  );
}

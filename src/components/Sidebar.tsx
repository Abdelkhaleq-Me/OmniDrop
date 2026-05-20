// src/components/Sidebar.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن الشريط الجانبي (التنقل بين التبويبات + زر تبديل اللغة)
// ═══════════════════════════════════════════════════════════════

import { useLang } from "../i18n/LangContext";

interface SidebarProps {
  activeTab: "download" | "history" | "playlists" | "settings";
  setActiveTab: (tab: "download" | "history" | "playlists" | "settings") => void;
  activeCount: number;
}

export function Sidebar({ activeTab, setActiveTab, activeCount }: SidebarProps) {
  const { lang, t, toggleLang } = useLang();

  return (
    <nav className="sidebar" aria-label={lang === "ar" ? "التنقل" : "Navigation"}>
      <button
        className={`nb ${activeTab === "download" ? "on" : ""}`}
        onClick={() => setActiveTab("download")}
        title={t.downloadsTab}
      >
        <i className="ti ti-download"></i>
        {activeCount > 0 && <span className="nb-badge"></span>}
      </button>

      <button
        className={`nb ${activeTab === "history" ? "on" : ""}`}
        onClick={() => setActiveTab("history")}
        title={t.historyTab}
      >
        <i className="ti ti-history"></i>
      </button>

      <button
        className={`nb ${activeTab === "playlists" ? "on" : ""}`}
        onClick={() => setActiveTab("playlists")}
        title={t.playlistsTab}
      >
        <i className="ti ti-playlist"></i>
      </button>

      <div className="nb-sp"></div>
      <div className="nb-line"></div>

      <button
        className={`nb ${activeTab === "settings" ? "on" : ""}`}
        onClick={() => setActiveTab("settings")}
        title={t.settingsTab}
      >
        <i className="ti ti-settings"></i>
      </button>

      <button
        className="nb"
        onClick={toggleLang}
        title={lang === "ar" ? "English" : "العربية"}
      >
        <i className="ti ti-language"></i>
      </button>
    </nav>
  );
}

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

import {
  DownloadOptions,
  DownloadRecord,
  CollectionRecord,
  ProgressData,
  CompletedData,
  FailedData,
  PlaylistStartedData
} from "./types";

const translations = {
  ar: {
    appName: "أومني دروب",
    downloader: "محرك التحميل",
    downloadTab: "تحميل جديد",
    activeTab: "التحميلات الجارية",
    historyTab: "سجل التحميل",
    playlistsTab: "قوائم التشغيل",
    settingsTab: "الإعدادات",
    enterUrl: "أدخل رابط الفيديو أو قائمة التشغيل",
    urlPlaceholder: "مثال: https://www.youtube.com/watch?v=...",
    videoMode: "تحميل فيديو وبث مباشر",
    audioMode: "استخراج صوت فقط",
    quality: "جودة الفيديو",
    audioFormat: "صيغة الصوت",
    startDownload: "بدء التحميل الفردي",
    startPlaylist: "بدء تحميل القائمة",
    noActive: "لا توجد عمليات تحميل جارية حالياً",
    noHistory: "سجل التحميل فارغ",
    noPlaylists: "لم تقم بتحميل أي قائمة تشغيل بعد",
    status: "الحالة",
    speed: "السرعة",
    eta: "الوقت المتبقي",
    actions: "الإجراءات",
    cancelAll: "إلغاء جميع التحميلات",
    clearHistory: "تنظيف السجل",
    delete: "حذف",
    search: "بحث في سجل التحميلات...",
    all: "الكل",
    completed: "مكتمل",
    failed: "فشل",
    cancelled: "ملغى",
    settingsTitle: "إعدادات النظام والشبكة",
    settingsDesc: "عرض إعدادات محرك التحميل الحالية ونمط التزامن",
    defaultPath: "مسار الحفظ الافتراضي",
    parallelFragments: "أجزاء التحميل المتوازية (Concurrent Fragments)",
    chunkSize: "حجم الجزء لطلب HTTP (Chunk Size)",
    activeCount: "التحميلات النشطة",
    completedCount: "المكتملة",
    failedCount: "الفاشلة",
    toastCompleted: "تم اكتمال التحميل بنجاح!",
    toastFailed: "فشل التحميل:",
    toastCancelled: "تم إلغاء التحميل بنجاح",
    processing: "جاري المعالجة والدمج (FFmpeg)...",
    fetching_metadata: "جاري جلب معلومات الفيديو والبيانات الوصفية...",
    pending: "قيد الانتظار في الطابور...",
    downloading: "جاري التحميل",
    platform: "المنصة",
    title: "العنوان",
    uploader: "الناشر/القناة",
    size: "الحجم",
    duration: "المدة",
    date: "التاريخ",
    openFolder: "فتح الملف",
    options: "خيارات الجودة والصيغة",
    close: "إغلاق",
    yes: "نعم",
    no: "لا",
    langToggle: "English",
    systemStats: "إحصائيات النظام",
    parallelStatus: "WAL Mode نشط ومحسن لقاعدة البيانات لضمان أعلى أداء واستقرار."
  },
  en: {
    appName: "OmniDrop",
    downloader: "Download Engine",
    downloadTab: "New Download",
    activeTab: "Active Downloads",
    historyTab: "Download History",
    playlistsTab: "Playlists",
    settingsTab: "Settings",
    enterUrl: "Enter video or playlist URL",
    urlPlaceholder: "e.g. https://www.youtube.com/watch?v=...",
    videoMode: "Video & Streams Download",
    audioMode: "Audio Only (Extract)",
    quality: "Video Quality",
    audioFormat: "Audio Format",
    startDownload: "Start Single Download",
    startPlaylist: "Download Playlist",
    noActive: "No active downloads currently running",
    noHistory: "Download history is empty",
    noPlaylists: "No playlists downloaded yet",
    status: "Status",
    speed: "Speed",
    eta: "ETA",
    actions: "Actions",
    cancelAll: "Cancel All Downloads",
    clearHistory: "Clear History",
    delete: "Delete",
    search: "Search history...",
    all: "All",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
    settingsTitle: "System & Network Settings",
    settingsDesc: "View current download engine settings and concurrency mode",
    defaultPath: "Default Save Path",
    parallelFragments: "Parallel Download Fragments (Concurrent)",
    chunkSize: "HTTP Chunk Size",
    activeCount: "Active Downloads",
    completedCount: "Completed",
    failedCount: "Failed",
    toastCompleted: "Download completed successfully!",
    toastFailed: "Download failed:",
    toastCancelled: "Download cancelled successfully",
    processing: "Processing & Merging (FFmpeg)...",
    fetching_metadata: "Fetching video metadata...",
    pending: "Pending in queue...",
    downloading: "Downloading",
    platform: "Platform",
    title: "Title",
    uploader: "Uploader",
    size: "Size",
    duration: "Duration",
    date: "Date",
    openFolder: "Open File",
    options: "Quality & Format Options",
    close: "Close",
    yes: "Yes",
    no: "No",
    langToggle: "العربية",
    systemStats: "System Stats",
    parallelStatus: "WAL Mode is active and optimized for high-performance database writes."
  }
};

function App() {
  const [activeTab, setActiveTab] = useState<string>("download");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const t = translations[lang];

  // Form states
  const [url, setUrl] = useState<string>("");
  const [audioOnly, setAudioOnly] = useState<boolean>(false);
  const [quality, setQuality] = useState<string>("best");
  const [audioFormat, setAudioFormat] = useState<string>("mp3");

  // App & Database data
  const [activeDownloads, setActiveDownloads] = useState<DownloadRecord[]>([]);
  const [liveProgress, setLiveProgress] = useState<Record<string, ProgressData>>({});
  const [history, setHistory] = useState<DownloadRecord[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Apply document direction automatically
  useEffect(() => {
    document.body.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  // Toast auto-dismiss helper
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Fetch initial data
  const refreshData = async () => {
    try {
      const active = await invoke<DownloadRecord[]>("get_active_downloads");
      setActiveDownloads(active);

      const hist = await invoke<DownloadRecord[]>("get_download_history");
      setHistory(hist);

      const cols = await invoke<CollectionRecord[]>("get_collection_history");
      setCollections(cols);
    } catch (e) {
      console.error("Failed to load records", e);
    }
  };

  useEffect(() => {
    refreshData();

    // Listen to real-time events from Tauri backend
    const unlistenProgress = listen<ProgressData[]>("downloads-batch-progress", (event) => {
      const updates = event.payload;
      setLiveProgress((prev) => {
        const next = { ...prev };
        for (const update of updates) {
          next[update.task_id] = update;
        }
        return next;
      });
    });

    const unlistenMetadata = listen<any>("download-metadata", () => {
      refreshData();
    });

    const unlistenCompleted = listen<CompletedData>("download-completed", (event) => {
      const data = event.payload;
      showToast(`${t.toastCompleted} ${data.title || ""}`, "success");
      // Remove progress entry
      setLiveProgress((prev) => {
        const next = { ...prev };
        delete next[data.task_id];
        return next;
      });
      refreshData();
    });

    const unlistenFailed = listen<FailedData>("download-failed", (event) => {
      const data = event.payload;
      showToast(`${t.toastFailed} ${data.error}`, "error");
      setLiveProgress((prev) => {
        const next = { ...prev };
        delete next[data.task_id];
        return next;
      });
      refreshData();
    });

    const unlistenCancelled = listen<string>("download-cancelled", (event) => {
      const taskId = event.payload;
      showToast(t.toastCancelled, "info");
      setLiveProgress((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      refreshData();
    });

    const unlistenPlaylist = listen<PlaylistStartedData>("playlist-started", (event) => {
      const data = event.payload;
      showToast(lang === "ar" 
        ? `بدء تحميل قائمة التشغيل "${data.title || ""}" بـ ${data.total_items} فيديوهات`
        : `Started downloading playlist "${data.title || ""}" with ${data.total_items} items`, 
        "success"
      );
      refreshData();
    });

    return () => {
      unlistenProgress.then((f) => f());
      unlistenMetadata.then((f) => f());
      unlistenCompleted.then((f) => f());
      unlistenFailed.then((f) => f());
      unlistenCancelled.then((f) => f());
      unlistenPlaylist.then((f) => f());
    };
  }, [lang]);

  // Handle single download trigger
  const handleSingleDownload = async () => {
    if (!url.trim()) return;
    try {
      const opts: DownloadOptions = {
        quality,
        audio_only: audioOnly,
        audio_format: audioFormat
      };
      await invoke("start_download", { url: url.trim(), opts });
      setUrl("");
      setActiveTab("active");
      refreshData();
    } catch (e: any) {
      showToast(e.toString(), "error");
    }
  };

  // Handle playlist download trigger
  const handlePlaylistDownload = async () => {
    if (!url.trim()) return;
    try {
      const opts: DownloadOptions = {
        quality,
        audio_only: audioOnly,
        audio_format: audioFormat
      };
      await invoke("start_playlist_download", { url: url.trim(), opts });
      setUrl("");
      setActiveTab("active");
      refreshData();
    } catch (e: any) {
      showToast(e.toString(), "error");
    }
  };

  // Cancel download task
  const handleCancel = async (taskId: string) => {
    try {
      await invoke("cancel_download", { taskId });
      refreshData();
    } catch (e: any) {
      showToast(e.toString(), "error");
    }
  };

  // Cancel all downloads
  const handleCancelAll = async () => {
    try {
      await invoke("cancel_all_downloads");
      refreshData();
    } catch (e: any) {
      showToast(e.toString(), "error");
    }
  };

  // Delete download from history
  const handleDelete = async (taskId: string) => {
    try {
      await invoke("delete_download", { taskId });
      refreshData();
    } catch (e: any) {
      showToast(e.toString(), "error");
    }
  };

  // Clear completed downloads
  const handleClearCompleted = async () => {
    try {
      await invoke("clear_completed_downloads");
      refreshData();
    } catch (e: any) {
      showToast(e.toString(), "error");
    }
  };

  // Detect platform to show logo badge
  const detectPlatform = (urlStr: string) => {
    const trimmed = urlStr.trim().toLowerCase();
    if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) return "youtube";
    if (trimmed.includes("soundcloud.com")) return "soundcloud";
    if (trimmed.includes("tiktok.com")) return "tiktok";
    if (trimmed.includes("instagram.com")) return "instagram";
    if (trimmed.includes("twitter.com") || trimmed.includes("x.com")) return "twitter";
    return "unknown";
  };

  // Format file size
  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Format duration (seconds -> HH:MM:SS)
  const formatDuration = (secs: number | null) => {
    if (!secs) return "—";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const parts = [];
    if (h > 0) parts.push(h.toString().padStart(2, "0"));
    parts.push(m.toString().padStart(2, "0"));
    parts.push(s.toString().padStart(2, "0"));
    return parts.join(":");
  };

  // Filter history
  const filteredHistory = history.filter((item) => {
    const matchesSearch = 
      (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.uploader && item.uploader.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.url.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && item.status === statusFilter;
  });

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <h1 className="brand-name">{t.appName}</h1>
          </div>

          <nav className="nav-menu">
            <button className={`nav-item ${activeTab === "download" ? "active" : ""}`} onClick={() => setActiveTab("download")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t.downloadTab}
            </button>

            <button className={`nav-item ${activeTab === "active" ? "active" : ""}`} onClick={() => setActiveTab("active")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              {t.activeTab}
              {activeDownloads.length > 0 && (
                <span style={{
                  background: "var(--accent-primary)",
                  color: "white",
                  fontSize: "0.75rem",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  marginInlineStart: "auto",
                  fontWeight: "bold"
                }}>{activeDownloads.length}</span>
              )}
            </button>

            <button className={`nav-item ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {t.historyTab}
            </button>

            <button className={`nav-item ${activeTab === "playlists" ? "active" : ""}`} onClick={() => setActiveTab("playlists")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              {t.playlistsTab}
            </button>

            <button className={`nav-item ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              {t.settingsTab}
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="lang-switch">
            <span>Language / اللغة</span>
            <button className="lang-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
              {t.langToggle}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-panel">
        {/* Panel Header */}
        <header className="panel-header">
          <div className="panel-title">
            <h2>
              {activeTab === "download" && t.downloadTab}
              {activeTab === "active" && t.activeTab}
              {activeTab === "history" && t.historyTab}
              {activeTab === "playlists" && t.playlistsTab}
              {activeTab === "settings" && t.settingsTab}
            </h2>
            <p>{t.downloader} • OmniDrop v0.1.0</p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {activeTab === "history" && history.length > 0 && (
              <button className="btn btn-secondary" onClick={handleClearCompleted} style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                {t.clearHistory}
              </button>
            )}
            {activeTab === "active" && activeDownloads.length > 0 && (
              <button className="btn btn-danger" onClick={handleCancelAll} style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                {t.cancelAll}
              </button>
            )}
          </div>
        </header>

        {/* Content Tabs */}
        
        {/* 1. Download Tab */}
        {activeTab === "download" && (
          <div className="glass-card" style={{ maxWidth: "800px" }}>
            <div className="input-group">
              <label>{t.enterUrl}</label>
              <div className="input-container">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <input
                  type="text"
                  placeholder={t.urlPlaceholder}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Config & Options Grid */}
            <div className="options-grid">
              {/* Mode Selection */}
              <div className="input-group">
                <label>{t.options}</label>
                <div 
                  className={`toggle-option ${audioOnly ? "checked" : ""}`}
                  onClick={() => setAudioOnly(!audioOnly)}
                >
                  <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                    {audioOnly ? t.audioMode : t.videoMode}
                  </span>
                  <div className="toggle-switch">
                    <div className="toggle-thumb" />
                  </div>
                </div>
              </div>

              {/* Quality Select (conditional) */}
              {!audioOnly ? (
                <div className="input-group">
                  <label>{t.quality}</label>
                  <div className="select-wrapper">
                    <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                      <option value="best">Best Quality (أعلى جودة)</option>
                      <option value="2160">4K UHD (2160p)</option>
                      <option value="1080">Full HD (1080p)</option>
                      <option value="720">HD (720p)</option>
                      <option value="480">SD (480p)</option>
                      <option value="360">Low (360p)</option>
                      <option value="worst">Worst Quality (أقل حجم)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="input-group">
                  <label>{t.audioFormat}</label>
                  <div className="select-wrapper">
                    <select value={audioFormat} onChange={(e) => setAudioFormat(e.target.value)}>
                      <option value="mp3">MP3</option>
                      <option value="m4a">M4A</option>
                      <option value="opus">Opus</option>
                      <option value="flac">FLAC</option>
                      <option value="wav">WAV</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Platform Badge Display */}
            {url.trim().length > 0 && (
              <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{t.platform}:</span>
                <span className={`platform-badge ${detectPlatform(url)}`}>
                  {detectPlatform(url)}
                </span>
              </div>
            )}

            <div className="action-buttons">
              <button 
                className="btn btn-primary" 
                onClick={handleSingleDownload}
                disabled={!url.trim()}
                style={{ flexGrow: 1, opacity: url.trim() ? 1 : 0.5 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "20px", height: "20px" }}>
                  <polyline points="8 17 12 21 16 17" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
                </svg>
                {t.startDownload}
              </button>

              <button 
                className="btn btn-secondary" 
                onClick={handlePlaylistDownload}
                disabled={!url.trim()}
                style={{ flexGrow: 1, opacity: url.trim() ? 1 : 0.5 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "20px", height: "20px" }}>
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <polyline points="3 6 4 7 6 5" />
                  <polyline points="3 12 4 13 6 11" />
                  <polyline points="3 18 4 19 6 17" />
                </svg>
                {t.startPlaylist}
              </button>
            </div>
          </div>
        )}

        {/* 2. Active Downloads Tab */}
        {activeTab === "active" && (
          <div className="tasks-container">
            {activeDownloads.length === 0 ? (
              <div className="empty-state glass-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                <p>{t.noActive}</p>
              </div>
            ) : (
              activeDownloads.map((task) => {
                const progressInfo = liveProgress[task.id];
                const displayPercent = progressInfo?.percent || "0%";
                const numericPercent = parseFloat(displayPercent.replace("%", "")) || 0;
                const speed = progressInfo?.speed || "—";
                const eta = progressInfo?.eta || "—";
                const currentStatus = progressInfo?.status || task.status;

                let statusLabel = t.pending;
                if (currentStatus === "fetching_metadata") statusLabel = t.fetching_metadata;
                else if (currentStatus === "downloading") statusLabel = t.downloading;
                else if (currentStatus === "processing") statusLabel = t.processing;

                return (
                  <div className="task-card" key={task.id}>
                    <div 
                      className="task-thumbnail"
                      style={{ 
                        backgroundImage: task.thumbnail_url ? `url(${task.thumbnail_url})` : "none" 
                      }}
                    >
                      {!task.thumbnail_url && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                          <line x1="7" y1="2" x2="7" y2="22" />
                          <line x1="17" y1="2" x2="17" y2="22" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <line x1="2" y1="7" x2="7" y2="7" />
                          <line x1="2" y1="17" x2="7" y2="17" />
                          <line x1="17" y1="17" x2="22" y2="17" />
                          <line x1="17" y1="7" x2="22" y2="7" />
                        </svg>
                      )}
                    </div>

                    <div className="task-details">
                      <div className="task-meta">
                        <span className={`platform-badge ${detectPlatform(task.url)}`}>
                          {detectPlatform(task.url)}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "var(--accent-primary)", fontWeight: "600" }}>
                          {statusLabel}
                        </span>
                        {task.quality && (
                          <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: "4px" }}>
                            {task.quality}
                          </span>
                        )}
                      </div>

                      <div className="task-title" title={task.title || task.url}>
                        {task.title || task.url}
                      </div>

                      <div className="task-progress-bar-container">
                        <div className="task-progress-fill" style={{ width: `${numericPercent}%` }} />
                      </div>

                      <div className="task-stats">
                        <span>{displayPercent}</span>
                        <div className="task-stats-group">
                          {currentStatus === "downloading" && (
                            <>
                              <span>{t.speed}: {speed}</span>
                              <span>{t.eta}: {eta}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="task-actions">
                      <button className="btn-icon cancel" onClick={() => handleCancel(task.id)} title={t.close}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 3. History Tab */}
        {activeTab === "history" && (
          <div className="glass-card">
            {/* Filters Row */}
            <div className="filters-row">
              <div className="input-container search-input">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder={t.search}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: "10px 16px", paddingInlineStart: "40px" }}
                />
              </div>

              <div className="select-wrapper" style={{ minWidth: "160px" }}>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">{t.all}</option>
                  <option value="completed">{t.completed}</option>
                  <option value="failed">{t.failed}</option>
                  <option value="cancelled">{t.cancelled}</option>
                </select>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <p>{t.noHistory}</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>{t.title}</th>
                      <th>{t.platform}</th>
                      <th>{t.size}</th>
                      <th>{t.duration}</th>
                      <th>{t.status}</th>
                      <th>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            {item.thumbnail_url && (
                              <img 
                                src={item.thumbnail_url} 
                                alt="" 
                                style={{ width: "48px", height: "30px", borderRadius: "4px", objectFit: "cover" }} 
                              />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "300px" }}>
                                {item.title || item.url}
                              </div>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {item.uploader || "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`platform-badge ${item.platform}`}>
                            {item.platform}
                          </span>
                        </td>
                        <td>{formatSize(item.file_size)}</td>
                        <td>{formatDuration(item.duration)}</td>
                        <td>
                          <span className={`status-badge ${item.status}`}>
                            {item.status === "completed" && t.completed}
                            {item.status === "failed" && t.failed}
                            {item.status === "cancelled" && t.cancelled}
                            {item.status !== "completed" && item.status !== "failed" && item.status !== "cancelled" && item.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {item.file_path && (
                              <button 
                                className="btn-icon" 
                                title={t.openFolder}
                                onClick={async () => {
                                  try {
                                    // Use Tauri opener plugin to show item or path
                                    await invoke("plugin:opener|open_path", { path: item.file_path });
                                  } catch (e: any) {
                                    showToast(e.toString(), "error");
                                  }
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                </svg>
                              </button>
                            )}
                            <button className="btn-icon cancel" onClick={() => handleDelete(item.id)} title={t.delete}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. Playlists / Collections Tab */}
        {activeTab === "playlists" && (
          <div className="glass-card">
            {collections.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <p>{t.noPlaylists}</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>{t.title}</th>
                      <th>{t.platform}</th>
                      <th>{t.activeCount}</th>
                      <th>{t.status}</th>
                      <th>{t.date}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.map((col) => (
                      <tr key={col.id}>
                        <td style={{ fontWeight: "600" }}>{col.title || col.url}</td>
                        <td>
                          <span className={`platform-badge ${col.platform}`}>
                            {col.platform}
                          </span>
                        </td>
                        <td>{col.total_items || "—"}</td>
                        <td>
                          <span className="status-badge completed">
                            {col.status}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          {new Date(col.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. Settings Tab (Information panel) */}
        {activeTab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="glass-card">
              <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "8px" }}>{t.settingsTitle}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "24px" }}>{t.settingsDesc}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "12px" }}>
                  <span style={{ fontWeight: "500" }}>{t.parallelFragments}</span>
                  <span style={{ color: "var(--accent-primary)", fontWeight: "600" }}>4 Fragments</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "12px" }}>
                  <span style={{ fontWeight: "500" }}>{t.chunkSize}</span>
                  <span style={{ color: "var(--accent-primary)", fontWeight: "600" }}>10 MB</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "12px" }}>
                  <span style={{ fontWeight: "500" }}>{t.activeCount} Max Limits</span>
                  <span style={{ color: "var(--accent-primary)", fontWeight: "600" }}>3 Concurrent Downloads</span>
                </div>
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "8px" }}>{t.systemStats}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6" }}>
                {t.parallelStatus}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Global Toast Notification */}
      {toast && (
        <div className={`notification ${toast.type}`}>
          <div style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: toast.type === "success" ? "var(--accent-success)" : toast.type === "error" ? "var(--accent-error)" : "var(--accent-info)"
          }} />
          <span style={{ fontSize: "0.9rem", fontWeight: "500" }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;

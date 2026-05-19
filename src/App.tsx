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
    appTitle: "OmniDrop",
    pastePlaceholder: "الصق الرابط — يوتيوب، تيك توك، انستغرام، تويتر...",
    options: "خيارات",
    videoMode: "فيديو",
    audioMode: "صوت فقط",
    quality: "الدقة",
    format: "الصيغة",
    singleInfo: "فيديو · <b>{q}</b> · تحميل منفرد",
    audioInfo: "صوت · <b>{f}</b> · تحميل منفرد",
    downloadBtn: "تحميل",
    queueTitle: "قائمة التحميل",
    activeBadge: "{n} نشط",
    clearCompleted: "مسح المكتمل",
    downloadsTab: "التحميلات",
    historyTab: "السجل",
    playlistsTab: "القوائم",
    settingsTab: "الإعدادات",
    speedLabel: "السرعة",
    etaLabel: "متبقي",
    active: "نشط",
    processing: "معالجة",
    completed: "مكتمل",
    cancelled: "ملغى",
    failed: "فشل",
    pending: "في الانتظار",
    speedUnit: "ميجابايت/ث",
    activeCount: "نشط",
    processingCount: "معالجة",
    completedCount: "مكتمل",
    cancelledCount: "ملغى",
    failedCount: "فشل",
    settingsTitle: "إعدادات النظام والشبكة",
    settingsDesc: "عرض إعدادات محرك التحميل الحالية ونمط التزامن",
    parallelFragments: "أجزاء التحميل المتوازية (Concurrent Fragments)",
    chunkSize: "حجم الجزء لطلب HTTP (Chunk Size)",
    activeLimits: "الحد الأقصى للتحميلات النشطة",
    systemStats: "إحصائيات استقرار قاعدة البيانات",
    dbStatus: "وضع WAL نشط ومحسن لقاعدة البيانات لضمان أعلى أداء واستقرار.",
    modalTitle: "اختر مقاطع قائمة التشغيل",
    modalSub: "مجموعة مقاطع قائمة التشغيل · {n} مقطع",
    selectAll: "تحديد الكل",
    deselectAll: "إلغاء الكل",
    searchPlaylist: "بحث في القائمة...",
    selectedCount: "محدد: {n}",
    cancelModal: "إلغاء",
    downloadModal: "تحميل {n} مقطع",
    toastCompleted: "تم اكتمال التحميل بنجاح!",
    toastFailed: "فشل التحميل: ",
    toastCancelled: "تم إلغاء التحميل بنجاح",
    toastStarted: "بدء التحميل...",
    toastPlaylistStarted: "بدء تحميل قائمة التشغيل بـ {n} مقطع",
    emptyStateQueue: "قائمة التحميل فارغة حالياً. أضف رابطاً بالأعلى لبدء التحميل!",
    emptyStateHistory: "لا توجد سجلات في الأرشيف حالياً.",
    emptyStatePlaylists: "لم يتم تحميل أي قوائم تشغيل حتى الآن.",
    searchHistoryPlaceholder: "بحث في الأرشيف والسجل...",
    allFilter: "الكل",
    details: "التفاصيل",
    fileSize: "الحجم",
    duration: "المدة",
    date: "التاريخ",
    openFolder: "فتح الملف",
    deleteRecord: "حذف السجل"
  },
  en: {
    appTitle: "OmniDrop",
    pastePlaceholder: "Paste link — YouTube, TikTok, Instagram, Twitter...",
    options: "Options",
    videoMode: "Video",
    audioMode: "Audio Only",
    quality: "Quality",
    format: "Format",
    singleInfo: "Video · <b>{q}</b> · Single Download",
    audioInfo: "Audio · <b>{f}</b> · Single Extract",
    downloadBtn: "Download",
    queueTitle: "Download Queue",
    activeBadge: "{n} Active",
    clearCompleted: "Clear Completed",
    downloadsTab: "Downloads",
    historyTab: "History",
    playlistsTab: "Playlists",
    settingsTab: "Settings",
    speedLabel: "Speed",
    etaLabel: "Remaining",
    active: "Active",
    processing: "Processing",
    completed: "Completed",
    cancelled: "Cancelled",
    failed: "Failed",
    pending: "Pending",
    speedUnit: "MB/s",
    activeCount: "Active",
    processingCount: "Processing",
    completedCount: "Completed",
    cancelledCount: "Cancelled",
    failedCount: "Failed",
    settingsTitle: "System & Network Settings",
    settingsDesc: "View current download engine settings and concurrency mode",
    parallelFragments: "Parallel Download Fragments (Concurrent)",
    chunkSize: "HTTP Chunk Size",
    activeLimits: "Concurrent Downloads Max Limits",
    systemStats: "Database Optimization Stats",
    dbStatus: "WAL Mode is active and optimized for high-concurrency writes.",
    modalTitle: "Select Playlist Videos",
    modalSub: "Best of Lo-Fi Music 2026 · {n} videos",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    searchPlaylist: "Search in playlist...",
    selectedCount: "Selected: {n}",
    cancelModal: "Cancel",
    downloadModal: "Download {n} Videos",
    toastCompleted: "Download completed successfully!",
    toastFailed: "Download failed: ",
    toastCancelled: "Download cancelled successfully",
    toastStarted: "Started downloading...",
    toastPlaylistStarted: "Started downloading playlist with {n} videos",
    emptyStateQueue: "Download queue is currently empty. Add a link above to start!",
    emptyStateHistory: "No archived records found.",
    emptyStatePlaylists: "No playlists downloaded yet.",
    searchHistoryPlaceholder: "Search archived downloads...",
    allFilter: "All",
    details: "Details",
    fileSize: "Size",
    duration: "Duration",
    date: "Date",
    openFolder: "Open File",
    deleteRecord: "Delete Record"
  }
};

const playlistVideos = [
  { id: 0, t: 'Lofi Study Mix — 2 Hours', ch: 'ChillHop', dur: '2:03', vid: 'jfKfPfyJRdk' },
  { id: 1, t: 'Jazz Hop Café — Smooth Beats', ch: 'Jazz Hop', dur: '1:22', vid: 'Dx5qFachd3A' },
  { id: 2, t: 'Rainy Day Lofi — Focus Music', ch: 'Lofi Girl', dur: '58:32', vid: 'dQw4w9WgXcQ' },
  { id: 3, t: 'Late Night Coding Mix', ch: 'Coding in Flow', dur: '1:45', vid: 'jfKfPfyJRdk' },
  { id: 4, t: 'Morning Coffee Lofi', ch: 'College Music', dur: '44:12', vid: 'kJQP7kiw5Fk' },
  { id: 5, t: 'Aesthetic Lofi — Pink Vibes', ch: 'Aesthetic Lofi', dur: '1:10', vid: 'dQw4w9WgXcQ' },
  { id: 6, t: 'Midnight Drive Synthwave', ch: 'NightRide FM', dur: '2:20', vid: 'jfKfPfyJRdk' },
  { id: 7, t: 'Deep Focus — 4 Hours Mix', ch: 'Study Music', dur: '4:00', vid: 'kJQP7kiw5Fk' },
];

function App() {
  const [activeTab, setActiveTab] = useState<string>("download");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const t = translations[lang];

  // Forms
  const [url, setUrl] = useState<string>("");
  const [mode, setMode] = useState<"video" | "audio">("video");
  const [quality, setQuality] = useState<string>("1080");
  const [afmt, setAfmt] = useState<string>("mp3");
  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false);
  const [badgeType, setBadgeType] = useState<"video" | "playlist" | "unknown" | null>(null);

  // Layout View mode
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Database / State items
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [liveProgress, setLiveProgress] = useState<Record<string, ProgressData>>({});
  
  // Filtering & searching
  const [historySearch, setHistorySearch] = useState<string>("");
  const [historyFilter, setHistoryFilter] = useState<string>("all");

  // Playlist selection modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<number>>(new Set([0, 2, 5]));
  const [playlistSearch, setPlaylistSearch] = useState<string>("");

  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "success" | "error" | "info" }>>([]);

  // Auto direction
  useEffect(() => {
    document.body.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  // Show Toast Toast
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Detect link patterns
  const detectLink = (val: string) => {
    if (!val || !val.trim()) return null;
    const trimmed = val.trim();
    
    // Prioritize video check (e.g. watch?v= or youtu.be/) even if list= parameter is present
    const isSingleVideo = /watch\?v=/i.test(trimmed) || /youtu\.be\//i.test(trimmed) || /tiktok\.com/i.test(trimmed) || /instagram\.com/i.test(trimmed) || /twitter\.com/i.test(trimmed) || /x\.com/i.test(trimmed);
    if (isSingleVideo) return 'video';
    
    // Pure playlists
    const isPlaylist = /list=/i.test(trimmed) || /playlist/i.test(trimmed) || /\/sets\//i.test(trimmed);
    if (isPlaylist) return 'playlist';
    
    // Fallback platforms
    const isGeneralVideoPlatform = /youtu|tiktok|instagram|twitter|x\.com/i.test(trimmed);
    if (isGeneralVideoPlatform) return 'video';
    
    return 'unknown';
  };

  const detectAndSetBadge = (val: string) => {
    const type = detectLink(val);
    setBadgeType(type);
  };

  // Fetch Database lists
  const refreshData = async () => {
    try {
      // get_download_history is mapped to get all, which allows us to view queue + finished list
      const hist = await invoke<DownloadRecord[]>("get_download_history", { limit: 50, offset: 0 });
      setDownloads(hist);

      const colList = await invoke<CollectionRecord[]>("get_collection_history");
      setCollections(colList);
    } catch (e) {
      console.error("Error calling DB refresh", e);
    }
  };

  useEffect(() => {
    refreshData();

    // Listen to background Tauri download engine events
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
      showToast(t.toastPlaylistStarted.replace("{n}", data.total_items.toString()), "success");
      refreshData();
    });

    // Auto-refresh stats every 4 seconds to catch any completed tasks without active push
    const interval = setInterval(refreshData, 4000);

    return () => {
      unlistenProgress.then((f) => f());
      unlistenMetadata.then((f) => f());
      unlistenCompleted.then((f) => f());
      unlistenFailed.then((f) => f());
      unlistenCancelled.then((f) => f());
      unlistenPlaylist.then((f) => f());
      clearInterval(interval);
    };
  }, [lang]);

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        detectAndSetBadge(text);
        showToast(lang === "ar" ? "تم اللصق من الحافظة" : "Pasted from clipboard", "info");
      }
    } catch (e) {
      // Fallback
      const fallback = "https://youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknc9TTnkwVquh";
      setUrl(fallback);
      detectAndSetBadge(fallback);
      showToast(lang === "ar" ? "تم لصق رابط قائمة تشغيل تجريبية" : "Pasted demo playlist URL", "info");
    }
  };

  // Launch Download
  const handleDownloadTrigger = async () => {
    if (!url.trim()) return;
    const type = detectLink(url);

    if (type === 'playlist') {
      // Show custom checklist selection modal matching html final
      setIsModalOpen(true);
    } else if (type === 'video') {
      // Single video download
      try {
        const opts: DownloadOptions = {
          quality,
          audio_only: mode === "audio",
          audio_format: afmt
        };
        showToast(t.toastStarted, "info");
        await invoke("start_download", { url: url.trim(), options: opts });
        setUrl("");
        setBadgeType(null);
        refreshData();
      } catch (err: any) {
        showToast(err.toString(), "error");
      }
    } else {
      // Unknown link: we can either try starting the download anyway or show a warning toast
      try {
        const opts: DownloadOptions = {
          quality,
          audio_only: mode === "audio",
          audio_format: afmt
        };
        showToast(lang === "ar" ? "رابط غير معروف، محاولة التحميل..." : "Unknown link, attempting download...", "info");
        await invoke("start_download", { url: url.trim(), options: opts });
        setUrl("");
        setBadgeType(null);
        refreshData();
      } catch (err: any) {
        showToast(err.toString(), "error");
      }
    }
  };

  // Modal confirm download playlist
  const handlePlaylistModalDownload = async () => {
    setIsModalOpen(false);
    try {
      const opts: DownloadOptions = {
        quality,
        audio_only: mode === "audio",
        audio_format: afmt
      };
      await invoke("start_playlist_download", { url: url.trim(), options: opts });
      setUrl("");
      setBadgeType(null);
      refreshData();
    } catch (err: any) {
      showToast(err.toString(), "error");
    }
  };

  // Cancel task
  const handleCancelTask = async (taskId: string) => {
    try {
      await invoke("cancel_download", { taskId });
      refreshData();
    } catch (err: any) {
      showToast(err.toString(), "error");
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await invoke("delete_download", { taskId });
      refreshData();
    } catch (err: any) {
      showToast(err.toString(), "error");
    }
  };

  // Clear completed downloads
  const handleClearCompleted = async () => {
    try {
      await invoke("clear_completed_downloads");
      showToast(lang === "ar" ? "تم مسح التحميلات المكتملة" : "Cleared completed downloads", "success");
      refreshData();
    } catch (err: any) {
      showToast(err.toString(), "error");
    }
  };

  // Helper size formats
  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const dm = 1;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Helper duration
  const formatDur = (secs: number | null) => {
    if (!secs) return "—";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Select/unselect modal
  const handleTogglePlaylistItem = (id: number) => {
    setSelectedPlaylistIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllPlaylist = () => {
    if (selectedPlaylistIds.size === playlistVideos.length) {
      setSelectedPlaylistIds(new Set());
    } else {
      setSelectedPlaylistIds(new Set(playlistVideos.map((v) => v.id)));
    }
  };

  // Filter history records
  const filteredHistory = downloads.filter((item) => {
    const isHistoryStatus = item.status === "completed" || item.status === "failed" || item.status === "cancelled";
    if (!isHistoryStatus) return false;

    if (historyFilter !== "all" && item.status !== historyFilter) return false;

    if (historySearch.trim()) {
      const s = historySearch.toLowerCase();
      const titleMatch = item.title && item.title.toLowerCase().includes(s);
      const channelMatch = item.uploader && item.uploader.toLowerCase().includes(s);
      const urlMatch = item.url.toLowerCase().includes(s);
      return titleMatch || channelMatch || urlMatch;
    }
    return true;
  });

  // Calculate live count statistics
  const activeCount = downloads.filter(d => {
    const st = liveProgress[d.id]?.status || d.status;
    return st === "downloading" || st === "fetching_metadata" || st === "pending";
  }).length;

  const processingCount = downloads.filter(d => {
    const st = liveProgress[d.id]?.status || d.status;
    return st === "processing";
  }).length;

  const completedCount = downloads.filter(d => d.status === "completed").length;
  const cancelledCount = downloads.filter(d => d.status === "cancelled").length;
  const failedCount = downloads.filter(d => d.status === "failed").length;

  // Calculate active net speed
  let currentSpeed = "0.0 MB/s";
  Object.values(liveProgress).forEach((prog) => {
    if (prog.speed && prog.status === "downloading") {
      currentSpeed = prog.speed; // captures active speed
    }
  });

  return (
    <div className="app">
      {/* Topbar matching blue final */}
      <div className="tb">
        <div className="logo">
          <div className="lm"><i className="ti ti-arrow-bar-to-down"></i></div>
          <span className="ln">Omni<em>Drop</em></span>
        </div>
        <div className="wc"><div className="wd"></div><div className="wd"></div><div className="wd"></div></div>
      </div>

      <div className="main">
        {/* Sidebar matching blue final */}
        <nav className="sb" aria-label="التنقل">
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
            onClick={() => setLang(lang === "ar" ? "en" : "ar")} 
            title={lang === "ar" ? "English" : "العربية"}
          >
            <i className="ti ti-language"></i>
          </button>
        </nav>

        {/* Content Container */}
        <div className="ct">
          
          {/* TAB 1: DOWNLOADS */}
          {activeTab === "download" && (
            <>
              {/* Input Zone */}
              <div className="iz">
                <div className={`ush ${badgeType === 'video' ? 'valid' : badgeType === 'playlist' ? 'ispl' : badgeType === 'unknown' ? 'invalid' : ''} ${isOptionsOpen ? 'popen' : ''}`}>
                  <div className="ur">
                    <i className="ti ti-link uico"></i>
                    <input 
                      className="uinp" 
                      placeholder={t.pastePlaceholder} 
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        detectAndSetBadge(e.target.value);
                      }}
                    />
                    
                    {/* Dynamic Badge */}
                    {badgeType === 'video' && (
                      <div className="tbadge show vid">
                        <i className="ti ti-video"></i>{lang === "ar" ? "فيديو" : "Video"}
                      </div>
                    )}
                    {badgeType === 'playlist' && (
                      <div className="tbadge show pl">
                        <i className="ti ti-list"></i>{lang === "ar" ? "قائمة تشغيل" : "Playlist"}
                      </div>
                    )}
                    {badgeType === 'unknown' && (
                      <div className="tbadge show err">
                        <i className="ti ti-alert-triangle"></i>{lang === "ar" ? "رابط غير معروف" : "Unknown Link"}
                      </div>
                    )}

                    <button className="pbtn" onClick={handlePaste} title={lang === "ar" ? "لصق" : "Paste"}>
                      <i className="ti ti-clipboard"></i>
                    </button>
                    
                    <button 
                      className={`tbtn ${isOptionsOpen ? 'on' : ''}`} 
                      onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                    >
                      <i className="ti ti-adjustments-horizontal"></i>
                      {t.options}
                      <i className="ti ti-chevron-down chev"></i>
                    </button>

                    <button 
                      className="dlb" 
                      onClick={handleDownloadTrigger}
                      disabled={!url.trim()}
                    >
                      <i className="ti ti-arrow-bar-to-down"></i>
                      {t.downloadBtn}
                    </button>
                  </div>

                  {/* Options expandable drawer */}
                  <div className={`op ${isOptionsOpen ? 'open' : ''}`}>
                    <div className="oi">
                      {/* Mode selection */}
                      <div className="or">
                        <span className="ol">{lang === "ar" ? "الوضع" : "Mode"}</span>
                        <button 
                          className={`ch ${mode === 'video' ? 'ac' : ''}`} 
                          onClick={() => setMode('video')}
                        >
                          <i className="ti ti-video"></i>{lang === "ar" ? "فيديو" : "Video"}
                        </button>
                        <button 
                          className={`ch ${mode === 'audio' ? 'ac' : ''}`} 
                          onClick={() => setMode('audio')}
                        >
                          <i className="ti ti-music"></i>{lang === "ar" ? "صوت فقط" : "Audio Only"}
                        </button>
                      </div>

                      {/* Video quality options */}
                      {mode === 'video' && (
                        <div className="or">
                          <span className="ol">{t.quality}</span>
                          {["2160", "1080", "720", "480", "360", "best"].map((q) => (
                            <button 
                              key={q} 
                              className={`ch ${quality === q ? 'ac' : ''}`} 
                              onClick={() => setQuality(q)}
                            >
                              {q === "best" ? (lang === "ar" ? "أعلى" : "Best") : `${q}p`}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Audio format options */}
                      {mode === 'audio' && (
                        <div className="or">
                          <span className="ol">{t.format}</span>
                          {["mp3", "m4a", "flac", "opus"].map((fmt) => (
                            <button 
                              key={fmt} 
                              className={`ch ${afmt === fmt ? 'ac' : ''}`} 
                              onClick={() => setAfmt(fmt)}
                            >
                              {fmt.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Dynamic description strip */}
                      <div className="sbar">
                        <i className="ti ti-info-circle sico"></i>
                        <span 
                          className="stxt"
                          dangerouslySetInnerHTML={{
                            __html: mode === "video" 
                              ? t.singleInfo.replace("{q}", quality === "best" ? (lang === "ar" ? "أعلى جودة" : "Best Quality") : `${quality}p`) 
                              : t.audioInfo.replace("{f}", afmt.toUpperCase())
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Queue Header Controls */}
              <div className="qb">
                <span className="qtl">{t.queueTitle}</span>
                <div className="qm">
                  <span className="bdg">{t.activeBadge.replace("{n}", activeCount.toString())}</span>
                  <button className="clrb" onClick={handleClearCompleted}>{t.clearCompleted}</button>
                  
                  {/* View togglers list/grid */}
                  <div className="vtg">
                    <button 
                      className={`vb ${viewMode === 'list' ? 'ac' : ''}`} 
                      onClick={() => setViewMode('list')}
                    >
                      <i className="ti ti-list"></i>
                    </button>
                    <button 
                      className={`vb ${viewMode === 'grid' ? 'ac' : ''}`} 
                      onClick={() => setViewMode('grid')}
                    >
                      <i className="ti ti-layout-grid"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Downloads queue viewport */}
              <div className="iw">
                {downloads.length === 0 ? (
                  <div className="no-items">
                    <i className="ti ti-arrow-bar-to-down"></i>
                    <span>{t.emptyStateQueue}</span>
                  </div>
                ) : viewMode === 'list' ? (
                  
                  /* List View Mode */
                  <div className="lv">
                    {downloads.map((item) => {
                      const live = liveProgress[item.id];
                      const currentStatus = live?.status || item.status;
                      const percentVal = live?.percent || (currentStatus === "completed" ? "100%" : "0%");
                      const numericPercent = parseFloat(percentVal.replace("%", "")) || 0;
                      
                      let leftStripColor = "var(--s-pend)";
                      if (currentStatus === "downloading" || currentStatus === "fetching_metadata") leftStripColor = "var(--s-dl)";
                      else if (currentStatus === "processing") leftStripColor = "var(--s-proc)";
                      else if (currentStatus === "completed") leftStripColor = "var(--s-done)";
                      else if (currentStatus === "cancelled") leftStripColor = "var(--s-cancel)";
                      else if (currentStatus === "failed") leftStripColor = "var(--s-fail)";

                      return (
                        <div className="li" key={item.id}>
                          <div className="lac" style={{ background: leftStripColor }}></div>
                          <div className="lt">
                            {/* Thumbnail / Icon */}
                            <div className="lth">
                              {item.thumbnail_url ? (
                                <img src={item.thumbnail_url} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                              ) : (
                                <i className="lth-ic ti ti-brand-youtube"></i>
                              )}
                              {item.duration && <div className="tbd">{formatDur(item.duration)}</div>}
                            </div>

                            {/* Details */}
                            <div className="linf">
                              <div className="ltit" title={item.title || item.url}>
                                {item.title || item.url}
                              </div>
                              <div className="lsub">
                                {currentStatus === "downloading" && (
                                  <div className="sd pulse" style={{ background: "var(--s-dl)" }}></div>
                                )}
                                {currentStatus === "processing" && (
                                  <div className="sd spin" style={{ width: 5, height: 5, border: "1.5px solid var(--s-proc)", borderTopColor: "transparent", borderRadius: "50%" }}></div>
                                )}
                                {currentStatus !== "downloading" && currentStatus !== "processing" && (
                                  <div className="sd" style={{ background: leftStripColor }}></div>
                                )}
                                
                                <span className="stg" style={{ color: leftStripColor }}>
                                  {lang === "ar" ? translations.ar[currentStatus as keyof typeof translations.ar] || currentStatus : translations.en[currentStatus as keyof typeof translations.en] || currentStatus}
                                </span>
                                <span className="dot">·</span>
                                <span className="stg">
                                  {item.quality || "Original"} · {formatBytes(item.file_size)}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="lax">
                              {/* Open finished files */}
                              {currentStatus === "completed" && item.file_path && (
                                <button 
                                  className="iab" 
                                  title={t.openFolder}
                                  onClick={async () => {
                                    try {
                                      await invoke("plugin:opener|open_path", { path: item.file_path });
                                    } catch (err: any) {
                                      showToast(err.toString(), "error");
                                    }
                                  }}
                                >
                                  <i className="ti ti-folder-open"></i>
                                </button>
                              )}

                              {/* Cancel active downloads */}
                              {(currentStatus === "downloading" || currentStatus === "fetching_metadata" || currentStatus === "pending") && (
                                <button 
                                  className="iab dl" 
                                  onClick={() => handleCancelTask(item.id)}
                                  title={t.cancelModal}
                                >
                                  <i className="ti ti-x"></i>
                                </button>
                              )}

                              {/* Delete old or retry */}
                              {(currentStatus === "completed" || currentStatus === "failed" || currentStatus === "cancelled") && (
                                <button 
                                  className="iab dl" 
                                  onClick={() => handleDeleteTask(item.id)}
                                  title={t.deleteRecord}
                                >
                                  <i className="ti ti-trash"></i>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Progress bar info */}
                          <div className="pw">
                            <div className="pt">
                              <div className="pf" style={{ width: `${numericPercent}%`, background: leftStripColor }}></div>
                            </div>
                            <div className="pl">
                              <span className="plb" style={{ color: leftStripColor }}>
                                {percentVal} {live?.speed ? `· ${live.speed}` : ""}
                              </span>
                              <span className="plb">
                                {live?.eta ? `${t.etaLabel} ${live.eta}` : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  
                  /* Grid View Mode */
                  <div className="gv">
                    {downloads.map((item) => {
                      const live = liveProgress[item.id];
                      const currentStatus = live?.status || item.status;
                      const percentVal = live?.percent || (currentStatus === "completed" ? "100%" : "0%");
                      const numericPercent = parseFloat(percentVal.replace("%", "")) || 0;
                      
                      let leftStripColor = "var(--s-pend)";
                      if (currentStatus === "downloading" || currentStatus === "fetching_metadata") leftStripColor = "var(--s-dl)";
                      else if (currentStatus === "processing") leftStripColor = "var(--s-proc)";
                      else if (currentStatus === "completed") leftStripColor = "var(--s-done)";
                      else if (currentStatus === "cancelled") leftStripColor = "var(--s-cancel)";
                      else if (currentStatus === "failed") leftStripColor = "var(--s-fail)";

                      return (
                        <div className="gi" key={item.id}>
                          <div className="gth">
                            {item.thumbnail_url ? (
                              <img src={item.thumbnail_url} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            ) : (
                              <i className="gth-ic ti ti-brand-youtube"></i>
                            )}

                            {/* Overlays / Percent */}
                            <div className="gov">
                              {currentStatus === "downloading" && <span className="gpct">{percentVal}</span>}
                              {currentStatus === "processing" && <i className="ti ti-loader spin" style={{ fontSize: 18, color: "var(--s-proc)" }}></i>}
                              {currentStatus === "completed" && <i className="ti ti-check" style={{ fontSize: 22, color: "var(--s-done)" }}></i>}
                              {currentStatus === "cancelled" && <span className="gpct" style={{ fontSize: 11, color: "var(--s-cancel)" }}>{t.cancelled}</span>}
                              {currentStatus === "failed" && <i className="ti ti-alert-circle" style={{ fontSize: 22, color: "var(--s-fail)" }}></i>}
                              {currentStatus === "pending" && <span className="gpct" style={{ fontSize: 10, color: "var(--t2)" }}>{t.pending}</span>}
                            </div>

                            {/* Status label top corner */}
                            <div className="gst">
                              {currentStatus === "downloading" && (
                                <div className="gstd pulse" style={{ background: "var(--s-dl)" }}></div>
                              )}
                              {currentStatus === "processing" && (
                                <div className="gstd spin" style={{ border: "1px solid var(--s-proc)", borderTopColor: "transparent", borderRadius: "50%" }}></div>
                              )}
                              {currentStatus !== "downloading" && currentStatus !== "processing" && (
                                <div className="gstd" style={{ background: leftStripColor }}></div>
                              )}
                              <span className="gstt">
                                {lang === "ar" ? translations.ar[currentStatus as keyof typeof translations.ar] || currentStatus : translations.en[currentStatus as keyof typeof translations.en] || currentStatus}
                              </span>
                            </div>

                            {/* Progress bar overlay at bottom */}
                            <div className="gpp">
                              <div className="gpf" style={{ width: `${numericPercent}%`, background: leftStripColor }}></div>
                            </div>
                          </div>

                          <div className="gb">
                            <div className="gtit" title={item.title || item.url}>
                              {item.title || item.url}
                            </div>
                            <div className="gm">
                              <span className="gta">{item.quality || "Original"}</span>
                              <span className="gta" style={{ color: leftStripColor }}>
                                {live?.speed || formatBytes(item.file_size)}
                              </span>
                            </div>
                            <div className="gm">
                              <span className="gta">{item.platform}</span>
                              <div className="gas">
                                {/* Open */}
                                {currentStatus === "completed" && item.file_path && (
                                  <button 
                                    className="gab" 
                                    onClick={async () => {
                                      try {
                                        await invoke("plugin:opener|open_path", { path: item.file_path });
                                      } catch (err: any) {
                                        showToast(err.toString(), "error");
                                      }
                                    }}
                                  >
                                    <i className="ti ti-folder-open"></i>
                                  </button>
                                )}

                                {/* Cancel */}
                                {(currentStatus === "downloading" || currentStatus === "fetching_metadata" || currentStatus === "pending") && (
                                  <button className="gab" onClick={() => handleCancelTask(item.id)}>
                                    <i className="ti ti-x"></i>
                                  </button>
                                )}

                                {/* Delete */}
                                {(currentStatus === "completed" || currentStatus === "failed" || currentStatus === "cancelled") && (
                                  <button className="gab" onClick={() => handleDeleteTask(item.id)}>
                                    <i className="ti ti-trash"></i>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Bar matching blue final */}
              <div className="stb">
                <div className="sti">
                  <i className="ti ti-download"></i>
                  <span className="stv">{activeCount}</span>&nbsp;{t.activeCount}
                </div>
                <span className="sts">·</span>
                <div className="sti">
                  <i className="ti ti-loader spin"></i>
                  <span className="stv">{processingCount}</span>&nbsp;{t.processingCount}
                </div>
                <span className="sts">·</span>
                <div className="sti">
                  <i className="ti ti-check"></i>
                  <span className="stv">{completedCount}</span>&nbsp;{t.completedCount}
                </div>
                <span className="sts">·</span>
                <div className="sti">
                  <i className="ti ti-ban"></i>
                  <span className="stv">{cancelledCount}</span>&nbsp;{t.cancelledCount}
                </div>
                <span className="sts">·</span>
                <div className="sti">
                  <i className="ti ti-alert-circle"></i>
                  <span className="stv">{failedCount}</span>&nbsp;{t.failedCount}
                </div>
                <div className="stsp"></div>
                <div className="nsp">
                  <i className="ti ti-activity"></i>
                  {currentSpeed}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: ARCHIVED HISTORY */}
          {activeTab === "history" && (
            <div className="ct" style={{ padding: "0 0 9px" }}>
              {/* Search bar inside history matching html design rules */}
              <div className="search-row">
                <i className="ti ti-search"></i>
                <input 
                  placeholder={t.searchHistoryPlaceholder} 
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>

              {/* Filters categories */}
              <div className="filters-wrap">
                <button 
                  className={`filter-ch ${historyFilter === 'all' ? 'ac' : ''}`}
                  onClick={() => setHistoryFilter('all')}
                >
                  {t.allFilter}
                </button>
                <button 
                  className={`filter-ch ${historyFilter === 'completed' ? 'ac' : ''}`}
                  onClick={() => setHistoryFilter('completed')}
                >
                  {t.completed}
                </button>
                <button 
                  className={`filter-ch ${historyFilter === 'cancelled' ? 'ac' : ''}`}
                  onClick={() => setHistoryFilter('cancelled')}
                >
                  {t.cancelled}
                </button>
                <button 
                  className={`filter-ch ${historyFilter === 'failed' ? 'ac' : ''}`}
                  onClick={() => setHistoryFilter('failed')}
                >
                  {t.failed}
                </button>
                <button 
                  className="filter-ch" 
                  onClick={handleClearCompleted}
                  style={{ marginInlineStart: "auto", border: "0.5px solid rgba(248,113,113,0.18)", color: "var(--s-fail)" }}
                >
                  {t.clearCompleted}
                </button>
              </div>

              {/* History list */}
              <div className="iw" style={{ marginTop: 8 }}>
                {filteredHistory.length === 0 ? (
                  <div className="no-items">
                    <i className="ti ti-history"></i>
                    <span>{t.emptyStateHistory}</span>
                  </div>
                ) : (
                  <div className="lv">
                    {filteredHistory.map((item) => {
                      let tagColor = "var(--s-done)";
                      if (item.status === "cancelled") tagColor = "var(--s-cancel)";
                      else if (item.status === "failed") tagColor = "var(--s-fail)";

                      return (
                        <div className="hist-item" key={item.id}>
                          <div className="lth" style={{ width: 44, height: 28, borderRadius: 4 }}>
                            {item.thumbnail_url ? (
                              <img src={item.thumbnail_url} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            ) : (
                              <i className="lth-ic ti ti-brand-youtube"></i>
                            )}
                          </div>

                          <div className="hist-meta">
                            <div className="hist-title" title={item.title || item.url}>
                              {item.title || item.url}
                            </div>
                            <div className="hist-sub">
                              <span style={{ color: tagColor, fontWeight: 500 }}>{item.status.toUpperCase()}</span>
                              <span className="dot">·</span>
                              <span>{formatBytes(item.file_size)}</span>
                              <span className="dot">·</span>
                              <span>{item.platform}</span>
                            </div>
                          </div>

                          <div className="hist-action">
                            {item.file_path && item.status === "completed" && (
                              <button 
                                className="iab" 
                                title={t.openFolder}
                                onClick={async () => {
                                  try {
                                    await invoke("plugin:opener|open_path", { path: item.file_path });
                                  } catch (err: any) {
                                    showToast(err.toString(), "error");
                                  }
                                }}
                              >
                                <i className="ti ti-folder-open"></i>
                              </button>
                            )}
                            <button 
                              className="iab dl" 
                              onClick={() => handleDeleteTask(item.id)}
                              title={t.deleteRecord}
                            >
                              <i className="ti ti-trash"></i>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PLAYLISTS COLLECTIONS */}
          {activeTab === "playlists" && (
            <div className="iw" style={{ paddingTop: 14 }}>
              {collections.length === 0 ? (
                <div className="no-items">
                  <i className="ti ti-playlist"></i>
                  <span>{t.emptyStatePlaylists}</span>
                </div>
              ) : (
                <div className="lv">
                  {collections.map((col) => (
                    <div className="li" key={col.id} style={{ borderLeft: "2.5px solid var(--bl)" }}>
                      <div className="lt">
                        <div className="linf">
                          <div className="ltit">{col.title || col.url}</div>
                          <div className="lsub">
                            <span className="stg" style={{ color: "var(--bl)" }}>{col.status.toUpperCase()}</span>
                            <span className="dot">·</span>
                            <span className="stg">{col.total_items || 0} videos</span>
                            <span className="dot">·</span>
                            <span className="stg">{col.platform}</span>
                          </div>
                        </div>
                      </div>
                      <div className="pw">
                        <div className="pl">
                          <span className="plb">{new Date(col.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === "settings" && (
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
          )}

        </div>
      </div>

      {/* Playlist checklist selection modal matching blue final perfectly */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="mhd">
              <div className="mhl">
                <span className="mht">{t.modalTitle}</span>
                <span className="mhs">{t.modalSub.replace("{n}", playlistVideos.length.toString())}</span>
              </div>
              <div className="mhac">
                <button className="msa" onClick={handleSelectAllPlaylist}>
                  {selectedPlaylistIds.size === playlistVideos.length ? t.deselectAll : t.selectAll}
                </button>
                <button className="mcl" onClick={() => setIsModalOpen(false)} aria-label="إغلاق">
                  <i className="ti ti-x"></i>
                </button>
              </div>
            </div>
            
            <div className="mfi">
              <input 
                className="mfin" 
                placeholder={t.searchPlaylist} 
                value={playlistSearch}
                onChange={(e) => setPlaylistSearch(e.target.value)}
              />
              <span className="msc">
                {t.selectedCount.replace("{n}", selectedPlaylistIds.size.toString())}
              </span>
            </div>

            <div className="ml">
              {playlistVideos
                .filter((v) => !playlistSearch || v.t.toLowerCase().includes(playlistSearch.toLowerCase()))
                .map((video) => {
                  const isSel = selectedPlaylistIds.has(video.id);
                  return (
                    <div 
                      key={video.id} 
                      className={`mi ${isSel ? 'sel' : ''}`}
                      onClick={() => handleTogglePlaylistItem(video.id)}
                    >
                      <div className="mcb">
                        <i className="ti ti-check"></i>
                      </div>
                      <div className="mith">
                        <img src={`https://img.youtube.com/vi/${video.vid}/mqdefault.jpg`} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      </div>
                      <div className="miinf">
                        <div className="mitit">{video.t}</div>
                        <div className="misub">{video.ch}</div>
                      </div>
                      <div className="midr">{video.dur}</div>
                    </div>
                  );
                })}
            </div>

            <div className="mft">
              <button className="mcc" onClick={() => setIsModalOpen(false)}>{t.cancelModal}</button>
              <button 
                className="mdb" 
                onClick={handlePlaylistModalDownload}
                disabled={selectedPlaylistIds.size === 0}
              >
                <i className="ti ti-arrow-bar-to-down"></i>
                {t.downloadModal.replace("{n}", selectedPlaylistIds.size.toString())}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global premium Toast Notifications */}
      <div className="toast-wrap">
        {toasts.map((toast) => (
          <div className={`toast ${toast.type}`} key={toast.id}>
            {toast.type === "success" && <i className="ti ti-circle-check"></i>}
            {toast.type === "error" && <i className="ti ti-alert-triangle"></i>}
            {toast.type === "info" && <i className="ti ti-info-circle"></i>}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;

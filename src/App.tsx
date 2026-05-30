// src/App.tsx
// ═══════════════════════════════════════════════════════════════
// المكوّن الرئيسي للتطبيق بعد إعادة الهيكلة الكاملة وتفكيك الأجزاء
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { useLang } from "./i18n/LangContext";
import { useToast } from "./hooks/useToast";
import { useDownloadEngine } from "./hooks/useDownloadEngine";
import { useMediaDetails } from "./hooks/useMediaDetails";
import { usePlaylistModal } from "./hooks/usePlaylistModal";

import { Topbar } from "./components/Topbar";
import { Sidebar } from "./components/Sidebar";
import { ToastContainer } from "./components/ToastContainer";
import { SettingsTab } from "./components/SettingsTab";
import { PlaylistsTab } from "./components/PlaylistsTab";
import { DownloadInput } from "./components/download/DownloadInput";
import { QueueHeader } from "./components/queue/QueueHeader";
import { QueueList } from "./components/queue/QueueList";
import { QueueGrid } from "./components/queue/QueueGrid";
import { HistoryTab } from "./components/HistoryTab";
import { PlaylistModal } from "./components/PlaylistModal";

import { detectLinkType, parseSpeedToBytes, formatSpeed } from "./utils/format";
import type { DownloadOptions } from "./types";
import "./App.css";

function App() {
  const { t, lang } = useLang();
  const { toasts, showToast } = useToast();

  // state حقول الإدخال والخيارات
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"video" | "audio">("video");
  const [quality, setQuality] = useState("1080");
  const [afmt, setAfmt] = useState("mp3");
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [badgeType, setBadgeType] = useState<"" | "video" | "playlist" | "unknown">("");

  // نمط عرض قائمة الانتظار
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [activeTab, setActiveTab] = useState<"download" | "history" | "playlists" | "settings">("download");

  // محرك التحميل
  const {
    downloads,
    collections,
    liveProgress,
    refreshData,
    startDownload,
    startPlaylistDownload,
    cancelTask,
    deleteTask,
    loadMore,
    hasMore,
    deleteCollection,
    clearAll,
    clearCompleted,
  } = useDownloadEngine(showToast, t);

  // جلب البيانات الوصفية مسبقاً
  const { mediaDetails, isPrefetching, getSelectedQualitySize } = useMediaDetails(
    url,
    quality,
    setQuality
  );

  // نافذة قائمة التشغيل
  const {
    isOpen: isModalOpen,
    isLoading: isLoadingPlaylist,
    isSubmitting: isSubmittingPlaylist,
    videos: playlistVideos,
    selectedIds: selectedPlaylistIds,
    search: playlistSearch,
    setSearch: setPlaylistSearch,
    openAndFetch: openPlaylistModal,
    handleConfirmDownload: confirmPlaylistDownload,
    toggleItem: handleTogglePlaylistItem,
    toggleSelectAll: handleSelectAllPlaylist,
    close: closePlaylistModal,
  } = usePlaylistModal(showToast, t, startPlaylistDownload);

  // تحديث نوع الرابط والبادج عند التغيير
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setBadgeType(detectLinkType(newUrl) || "");
  };

  // اللصق من الحافظة
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        setBadgeType(detectLinkType(text) || "");
        showToast(lang === "ar" ? "تم اللصق من الحافظة" : "Pasted from clipboard", "info");
      }
    } catch (e) {
      showToast(
        lang === "ar" ? "تعذر الوصول للحافظة. يرجى لصق الرابط يدوياً." : "Failed to access clipboard. Please paste manually.",
        "error"
      );
    }
  };

  // معالجة بدء التحميل عند الضغط على الزر الرئيسي
  const handleDownloadTrigger = async () => {
    if (!url.trim()) return;
    const type = detectLinkType(url);

    const opts: DownloadOptions = {
      quality,
      audio_only: mode === "audio",
      audio_format: afmt,
    };

    if (type === "playlist") {
      openPlaylistModal(url);
    } else {
      try {
        if (type !== "video") {
          showToast(
            lang === "ar" ? "رابط غير معروف، محاولة التحميل..." : "Unknown link, attempting download...",
            "info"
          );
        }
        await startDownload(url, opts, mediaDetails?.media_info);
        setUrl("");
        setBadgeType("");
      } catch (err: any) {
        showToast(err.toString(), "error");
      }
    }
  };

  // تأكيد تحميل فيديوهات قائمة التشغيل المحددة من النافذة المنبثقة
  const handlePlaylistModalConfirm = async () => {
    const opts: DownloadOptions = {
      quality,
      audio_only: mode === "audio",
      audio_format: afmt,
    };
    await confirmPlaylistDownload(
      url,
      opts,
      () => {
        setUrl("");
        setBadgeType("");
        refreshData();
      }
    );
  };

  // إحصائيات الحالة لشريط المعلومات السفلي
  const activeCount = downloads.filter((d) => {
    const st = liveProgress[d.id]?.status || d.status;
    return st === "downloading" || st === "fetching_metadata" || st === "pending";
  }).length;

  const processingCount = downloads.filter((d) => {
    const st = liveProgress[d.id]?.status || d.status;
    return st === "processing";
  }).length;

  const completedCount = downloads.filter((d) => d.status === "completed").length;
  const cancelledCount = downloads.filter((d) => d.status === "cancelled").length;
  const failedCount = downloads.filter((d) => d.status === "failed").length;

  let totalSpeedBytes = 0;
  Object.values(liveProgress).forEach((prog) => {
    if (prog.status === "downloading" && prog.speed) {
      totalSpeedBytes += parseSpeedToBytes(prog.speed);
    }
  });
  const currentSpeed = formatSpeed(totalSpeedBytes);

  // تصفية المهام المعروضة في قائمة الانتظار الحالية (المهام غير المؤرشفة النشطة/قيد المعالجة)
  const activeQueueItems = downloads.filter((item) => {
    const liveStatus = liveProgress[item.id]?.status || item.status;
    const isHistoryStatus =
      liveStatus === "completed" || liveStatus === "failed" || liveStatus === "cancelled";
    return !isHistoryStatus;
  });

  // تصفية مهام الأرشيف والسجل التاريخي الممررة
  const historyItems = downloads.filter((item) => {
    const liveStatus = liveProgress[item.id]?.status || item.status;
    return liveStatus === "completed" || liveStatus === "failed" || liveStatus === "cancelled";
  });

  return (
    <div className="app">
      {/* شريط العنوان Drag & Window Controls */}
      <Topbar />

      <div className="main">
        {/* شريط التنقل الجانبي Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} activeCount={activeCount} />

        {/* منطقة المحتوى الرئيسي Content Container */}
        <div className="ct">
          {/* تبويب التحميلات الرئيسي */}
          {activeTab === "download" && (
            <>
              {/* حقل الرابط والخيارات وحساب الحجم التقديري */}
              <DownloadInput
                url={url}
                setUrl={handleUrlChange}
                badgeType={badgeType}
                setBadgeType={setBadgeType}
                isOptionsOpen={isOptionsOpen}
                setIsOptionsOpen={setIsOptionsOpen}
                mode={mode}
                setMode={setMode}
                quality={quality}
                setQuality={setQuality}
                afmt={afmt}
                setAfmt={setAfmt}
                mediaDetails={mediaDetails}
                isPrefetching={isPrefetching}
                getSelectedQualitySize={getSelectedQualitySize}
                onPaste={handlePaste}
                onDownload={handleDownloadTrigger}
              />

              {/* رأس قائمة التحميل مع خيار التحويل لشبكة/قائمة ومسح المكتمل */}
              <QueueHeader
                viewMode={viewMode}
                setViewMode={setViewMode}
                onClearAll={clearAll}
                activeCount={activeCount}
              />

              {/* محتوى قائمة التحميل أو حالة فارغة */}
              <div className="items-wrapper">
                {activeQueueItems.length === 0 ? (
                  <div className="no-items">
                    <i className="ti ti-download"></i>
                    <span>{t.emptyStateQueue}</span>
                  </div>
                ) : viewMode === "list" ? (
                  <QueueList
                    downloads={activeQueueItems}
                    liveProgress={liveProgress}
                    onCancelTask={cancelTask}
                    onDeleteTask={deleteTask}
                    showToast={showToast}
                  />
                ) : (
                  <QueueGrid
                    downloads={activeQueueItems}
                    liveProgress={liveProgress}
                    onCancelTask={cancelTask}
                    onDeleteTask={deleteTask}
                    showToast={showToast}
                  />
                )}
              </div>

              {/* شريط حالة المحرك السفلي (Status Bar) */}
              <div className="status-bar">
                <div className="status-item">
                  <i className="ti ti-download"></i>
                  <span className="status-value">{activeCount}</span>&nbsp;{t.activeCount}
                </div>
                <span className="status-separator">·</span>
                <div className="status-item">
                  <i className="ti ti-loader spin"></i>
                  <span className="status-value">{processingCount}</span>&nbsp;{t.processingCount}
                </div>
                <span className="status-separator">·</span>
                <div className="status-item">
                  <i className="ti ti-check"></i>
                  <span className="status-value">{completedCount}</span>&nbsp;{t.completedCount}
                </div>
                <span className="status-separator">·</span>
                <div className="status-item">
                  <i className="ti ti-ban"></i>
                  <span className="status-value">{cancelledCount}</span>&nbsp;{t.cancelledCount}
                </div>
                <span className="status-separator">·</span>
                <div className="status-item">
                  <i className="ti ti-alert-circle"></i>
                  <span className="status-value">{failedCount}</span>&nbsp;{t.failedCount}
                </div>
                <div className="status-spacer"></div>
                <div className="network-speed">
                  <i className="ti ti-activity"></i>
                  {currentSpeed}
                </div>
              </div>
            </>
          )}

          {/* تبويب الأرشيف والسجل التاريخي */}
          {activeTab === "history" && (
            <HistoryTab
              downloads={historyItems}
              onClearCompleted={clearCompleted}
              onDeleteTask={deleteTask}
              onLoadMore={loadMore}
              hasMore={hasMore}
              showToast={showToast}
            />
          )}

          {/* تبويب قوائم التشغيل */}
          {activeTab === "playlists" && (
            <PlaylistsTab
              collections={collections}
              downloads={downloads}
              onDeleteCollection={deleteCollection}
            />
          )}

          {/* تبويب إعدادات النظام */}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </div>

      {/* نافذة اختيار وتعديل فيديوهات قائمة التشغيل */}
      <PlaylistModal
        isOpen={isModalOpen}
        isLoading={isLoadingPlaylist}
        isSubmitting={isSubmittingPlaylist}
        videos={playlistVideos}
        selectedIds={selectedPlaylistIds}
        search={playlistSearch}
        setSearch={setPlaylistSearch}
        onToggleItem={handleTogglePlaylistItem}
        onSelectAll={handleSelectAllPlaylist}
        onClose={closePlaylistModal}
        onConfirmDownload={handlePlaylistModalConfirm}
      />

      {/* شريط الإشعارات المنبثقة */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default App;

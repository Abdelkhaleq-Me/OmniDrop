// src/hooks/useDownloadEngine.ts
// ═══════════════════════════════════════════════════════════════
// Hook مركزي لمنطق التحميل: أحداث، polling، إجراءات
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  DownloadRecord,
  CollectionRecord,
  ProgressData,
  CompletedData,
  FailedData,
  PlaylistStartedData,
  DownloadOptions,
  MediaInfo,
} from "../types";
import type { ShowToastFn } from "./useToast";
import type { Translations } from "../i18n/translations";

interface UseDownloadEngineReturn {
  downloads: DownloadRecord[];
  collections: CollectionRecord[];
  liveProgress: Record<string, ProgressData>;
  refreshData: () => Promise<void>;
  startDownload: (url: string, options: DownloadOptions, metadata?: MediaInfo | null) => Promise<void>;
  startPlaylistDownload: (url: string, options: DownloadOptions, selectedIndices?: number[]) => Promise<void>;
  cancelTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  clearCompleted: () => Promise<void>;
}

export function useDownloadEngine(
  showToast: ShowToastFn,
  t: Translations
): UseDownloadEngineReturn {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [liveProgress, setLiveProgress] = useState<Record<string, ProgressData>>({});

  // مرجع ثابت لـ t لتجنب إعادة تسجيل listeners عند تغيير اللغة
  const tRef = useRef(t);
  tRef.current = t;

  const refreshData = useCallback(async () => {
    try {
      const hist = await invoke<DownloadRecord[]>("get_download_history", { limit: 50, offset: 0 });
      setDownloads(hist);
      const colList = await invoke<CollectionRecord[]>("get_collection_history");
      setCollections(colList);
    } catch (e) {
      console.error("Error calling DB refresh", e);
    }
  }, []);

  const [isReady, setIsReady] = useState(false);  // ← حالة جاهزية الباكأند

  // الاستماع لحدث جاهزية الباكأند أولاً
  useEffect(() => {
    // احتمال أن التطبيق جاهز قبل أن تُسجَّل هذه الـ listener
    // لذا نحاول الاتصال بـ DB مباشرةً — إذا نجح فالباكأند جاهز
    const tryConnect = async () => {
      try {
        await invoke("get_download_history", { limit: 1, offset: 0 });
        setIsReady(true);
      } catch {
        // لم يجهز بعد — ننتظر app-ready
      }
    };
    tryConnect();

    // الاستماع لـ app-ready كـ fallback موثوق
    const unlistenReady = listen("app-ready", () => {
      setIsReady(true);
    });

    return () => {
      unlistenReady.then((f) => f());
    };
  }, []);

  // refreshData يُستدعى فقط بعد أن يكون الباكأند جاهزاً
  useEffect(() => {
    if (!isReady) return;
    refreshData();
  }, [isReady, refreshData]);

  // ── تسجيل أحداث Tauri ─────────────────────────────────────
  useEffect(() => {
    if (!isReady) return;

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

    const unlistenMetadata = listen<{ task_id: string, info: MediaInfo }>("download-metadata", (event) => {
      const payload = event.payload;
      setDownloads((prev) => 
        prev.map(d => 
          d.id === payload.task_id 
            ? { 
                ...d, 
                title: payload.info.title || d.title,
                uploader: payload.info.uploader || d.uploader,
                thumbnail_url: payload.info.thumbnail || d.thumbnail_url,
                file_size: payload.info.filesize || payload.info.filesize_approx || d.file_size,
                duration: payload.info.duration || d.duration,
              } 
            : d
        )
      );
    });

    const unlistenCompleted = listen<CompletedData>("download-completed", (event) => {
      const data = event.payload;
      showToast(`${tRef.current.toastCompleted} ${data.title || ""}`, "success");
      setLiveProgress((prev) => {
        const next = { ...prev };
        delete next[data.task_id];
        return next;
      });
      refreshData();
    });

    const unlistenFailed = listen<FailedData>("download-failed", (event) => {
      const data = event.payload;
      showToast(`${tRef.current.toastFailed} ${data.error}`, "error");
      setLiveProgress((prev) => {
        const next = { ...prev };
        delete next[data.task_id];
        return next;
      });
      refreshData();
    });

    const unlistenCancelled = listen<string>("download-cancelled", (event) => {
      const taskId = event.payload;
      showToast(tRef.current.toastCancelled, "info");
      setLiveProgress((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      refreshData();
    });

    const unlistenPlaylist = listen<PlaylistStartedData>("playlist-started", (event) => {
      const data = event.payload;
      showToast(tRef.current.toastPlaylistStarted.replace("{n}", data.total_items.toString()), "success");
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
  }, [isReady, refreshData, showToast]);

  // ── Polling ذكي يعتمد على وجود تنزيلات نشطة ─────────────────
  useEffect(() => {
    const hasActiveDownloads = downloads.some((d) =>
      ["pending", "fetching_metadata", "downloading", "processing"].includes(d.status)
    );

    if (!hasActiveDownloads) return;

    const interval = setInterval(refreshData, 4000);
    return () => clearInterval(interval);
  }, [downloads, refreshData]);

  // ── إجراءات التحميل ────────────────────────────────────────

  const startDownload = useCallback(async (url: string, options: DownloadOptions, metadata?: MediaInfo | null) => {
    showToast(tRef.current.toastStarted, "info");
    await invoke("start_download", { url: url.trim(), options, metadata: metadata || null });
    refreshData();
  }, [refreshData, showToast]);

  /** تحميل قائمة تشغيل كاملة عبر أمر IPC المخصص */
  const startPlaylistDownload = useCallback(async (url: string, options: DownloadOptions, selectedIndices?: number[]) => {
    await invoke("start_playlist_download", { url: url.trim(), options, selectedIndices: selectedIndices || null });
    refreshData();
  }, [refreshData]);

  const cancelTask = useCallback(async (taskId: string) => {
    try {
      await invoke("cancel_download", { taskId });
      refreshData();
    } catch (err: unknown) {
      showToast(String(err), "error");
    }
  }, [refreshData, showToast]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await invoke("delete_download", { taskId });
      refreshData();
    } catch (err: unknown) {
      showToast(String(err), "error");
    }
  }, [refreshData, showToast]);

  const deleteCollection = useCallback(async (collectionId: string) => {
    try {
      await invoke("delete_collection", { collectionId });
      refreshData();
    } catch (err: unknown) {
      showToast(String(err), "error");
    }
  }, [refreshData, showToast]);

  const clearAll = useCallback(async () => {
    try {
      await invoke("clear_all_downloads");
      showToast(tRef.current.clearedAll || "Cleared all downloads", "success");
      refreshData();
    } catch (err: unknown) {
      showToast(String(err), "error");
    }
  }, [refreshData, showToast]);

  const clearCompleted = useCallback(async () => {
    try {
      await invoke("clear_completed_downloads");
      showToast(tRef.current.clearedCompleted || "Cleared completed downloads", "success");
      refreshData();
    } catch (err: unknown) {
      showToast(String(err), "error");
    }
  }, [refreshData, showToast]);

  return {
    downloads,
    collections,
    liveProgress,
    refreshData,
    startDownload,
    startPlaylistDownload,
    cancelTask,
    deleteTask,
    deleteCollection,
    clearAll,
    clearCompleted,
  };
}

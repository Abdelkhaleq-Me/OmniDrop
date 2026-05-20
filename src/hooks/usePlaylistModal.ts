// src/hooks/usePlaylistModal.ts
// ═══════════════════════════════════════════════════════════════
// Hook لإدارة نافذة اختيار فيديوهات قائمة التشغيل
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PlaylistVideoItem, PlaylistInfoResponse, DownloadOptions } from "../types";
import type { ShowToastFn } from "./useToast";
import type { Translations } from "../i18n/translations";
import { formatDuration } from "../utils/format";

interface UsePlaylistModalReturn {
  isOpen: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  videos: PlaylistVideoItem[];
  selectedIds: Set<number>;
  search: string;
  setSearch: (s: string) => void;
  openAndFetch: (url: string) => Promise<void>;
  handleConfirmDownload: (
    url: string,
    options: DownloadOptions,
    onDone: () => void,
  ) => Promise<void>;
  toggleItem: (id: number) => void;
  toggleSelectAll: () => void;
  close: () => void;
}

export function usePlaylistModal(
  showToast: ShowToastFn,
  t: Translations,
  startPlaylistDownload: (url: string, options: DownloadOptions, selectedIndices?: number[]) => Promise<void>,
): UsePlaylistModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videos, setVideos] = useState<PlaylistVideoItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  const tRef = useRef(t);
  tRef.current = t;

  /** فتح النافذة وجلب فيديوهات القائمة */
  const openAndFetch = useCallback(async (url: string) => {
    setIsOpen(true);
    setIsLoading(true);
    setVideos([]);
    setSelectedIds(new Set());
    setSearch("");

    try {
      showToast(tRef.current.fetchingPlaylistDetails, "info");

      const info = await invoke<PlaylistInfoResponse>("fetch_playlist_info", { url: url.trim() });
      const entries = info.entries || [];

      const parsed: PlaylistVideoItem[] = entries.map((entry, index) => ({
        id: index,
        title: entry.title || tRef.current.defaultVideoTitle.replace("{n}", (index + 1).toString()),
        channel: info.uploader || tRef.current.unknownChannel,
        duration: formatDuration(entry.duration),
        videoId: entry.id || "",
        url: entry.url || "",
      }));

      setVideos(parsed);
      setSelectedIds(new Set(parsed.map(v => v.id)));
      setIsLoading(false);
      showToast(tRef.current.foundVideos.replace("{n}", parsed.length.toString()), "success");
    } catch (err) {
      console.error(err);
      setIsOpen(false);
      setIsLoading(false);
      showToast(`${tRef.current.failedFetchPlaylist}${err}`, "error");
    }
  }, [showToast]);

  /** تأكيد التحميل — يستخدم start_playlist_download بدلاً من فيديوهات فردية */
  const handleConfirmDownload = useCallback(async (
    url: string,
    options: DownloadOptions,
    onDone: () => void,
  ) => {
    if (selectedIds.size === 0) {
      showToast(tRef.current.selectAtLeastOne, "error");
      return;
    }

    setIsSubmitting(true);

    showToast(
      tRef.current.startingSelectedDownload.replace("{n}", selectedIds.size.toString()),
      "success",
    );

    try {
      // ═══ إصلاح: استخدام start_playlist_download بدلاً من إرسال فيديوهات فردية ═══
      const indices = Array.from(selectedIds);
      await startPlaylistDownload(url, options, indices);
      setIsOpen(false);
      onDone();
    } catch (err) {
      console.error("Failed to start playlist download:", err);
      showToast(String(err), "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIds, showToast, startPlaylistDownload]);

  const toggleItem = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === videos.length) return new Set();
      return new Set(videos.map(v => v.id));
    });
  }, [videos]);

  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    isLoading,
    isSubmitting,
    videos,
    selectedIds,
    search,
    setSearch,
    openAndFetch,
    handleConfirmDownload,
    toggleItem,
    toggleSelectAll,
    close,
  };
}

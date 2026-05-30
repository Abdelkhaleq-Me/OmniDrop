// src/components/HistoryTab.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن تبويب سجل التحميلات المؤرشفة (البحث والفلترة والحذف)
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { openFileFolder } from "../utils/opener";
import { useLang } from "../i18n/LangContext";
import type { DownloadRecord } from "../types";
import { formatBytes } from "../utils/format";

interface HistoryTabProps {
  downloads: DownloadRecord[];
  onClearCompleted: () => void;
  onDeleteTask: (id: string) => void;
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

type FilterType = "all" | "completed" | "cancelled" | "failed";

export function HistoryTab({
  downloads,
  onClearCompleted,
  onDeleteTask,
  onLoadMore,
  hasMore,
  showToast,
}: HistoryTabProps) {
  const { lang, t } = useLang();
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<FilterType>("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await onLoadMore();
    setIsLoadingMore(false);
  };

  const handleOpenFolder = async (filePath: string) => {
    await openFileFolder(filePath, showToast);
  };

  // Filter history records
  const filteredHistory = downloads.filter((item) => {
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

  return (
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
          className={`filter-ch ${historyFilter === "all" ? "ac" : ""}`}
          onClick={() => setHistoryFilter("all")}
        >
          {t.allFilter}
        </button>
        <button
          className={`filter-ch ${historyFilter === "completed" ? "ac" : ""}`}
          onClick={() => setHistoryFilter("completed")}
        >
          {t.completed}
        </button>
        <button
          className={`filter-ch ${historyFilter === "cancelled" ? "ac" : ""}`}
          onClick={() => setHistoryFilter("cancelled")}
        >
          {t.cancelled}
        </button>
        <button
          className={`filter-ch ${historyFilter === "failed" ? "ac" : ""}`}
          onClick={() => setHistoryFilter("failed")}
        >
          {t.failed}
        </button>
        <button
          className="filter-ch"
          onClick={() => setShowClearConfirm(true)}
          style={{
            marginInlineStart: "auto",
            border: "0.5px solid rgba(248,113,113,0.18)",
            color: "var(--s-fail)",
          }}
        >
          {t.clearCompleted}
        </button>
      </div>

      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 380, marginTop: "15vh" }}>
            <div className="modal-header">
              <span className="modal-header-title">
                {lang === "ar" ? "تأكيد مسح السجل" : "Confirm Clear History"}
              </span>
            </div>
            <div style={{ padding: "16px 15px", fontSize: "11.5px", color: "var(--t1)", lineHeight: "1.4" }}>
              {lang === "ar"
                ? "هل أنت متأكد من رغبتك في حذف جميع التحميلات المكتملة والمؤرشفة من السجل؟ لن يتم حذف الملفات الفعلية من جهازك."
                : "Are you sure you want to clear all completed and archived downloads from history? The actual files on your disk will not be deleted."}
            </div>
            <div className="modal-footer" style={{ borderTop: "0.5px solid var(--bd)" }}>
              <button
                className="modal-cancel-btn"
                onClick={() => setShowClearConfirm(false)}
              >
                {t.cancelModal}
              </button>
              <button
                className="modal-download-btn"
                style={{ background: "var(--s-fail)" }}
                onClick={() => {
                  onClearCompleted();
                  setShowClearConfirm(false);
                }}
              >
                {t.clearCompleted}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History list */}
      <div className="items-wrapper" style={{ marginTop: 8 }}>
        {filteredHistory.length === 0 ? (
          <div className="no-items">
            <i className="ti ti-history"></i>
            <span>{t.emptyStateHistory}</span>
          </div>
        ) : (
          <div className="list-view">
            {filteredHistory.map((item) => {
              let tagColor = "var(--s-done)";
              if (item.status === "cancelled") {
                tagColor = "var(--s-cancel)";
              } else if (item.status === "failed") {
                tagColor = "var(--s-fail)";
              }

              return (
                <div className="hist-item" key={item.id}>
                  <div className="list-thumbnail-img" style={{ width: 44, height: 28, borderRadius: 4 }}>
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt=""
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    ) : (
                      <i className="list-thumb-icon ti ti-brand-youtube"></i>
                    )}
                  </div>

                  <div className="hist-meta">
                    <div className="hist-title" title={item.title || item.url}>
                      {item.title || item.url}
                    </div>
                    <div className="hist-sub">
                      <span style={{ color: tagColor, fontWeight: 500 }}>
                        {item.status.toUpperCase()}
                      </span>
                      <span className="dot-separator">·</span>
                      <span>{formatBytes(item.file_size)}</span>
                      <span className="dot-separator">·</span>
                      <span>{item.platform}</span>
                    </div>
                  </div>

                  <div className="hist-action">
                    {item.file_path && item.status === "completed" && (
                      <button
                        className="item-action-btn"
                        title={t.openFolder}
                        onClick={() => handleOpenFolder(item.file_path!)}
                      >
                        <i className="ti ti-folder-open"></i>
                      </button>
                    )}
                    <button
                      className="item-action-btn dl"
                      onClick={() => onDeleteTask(item.id)}
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

      {/* زر تحميل المزيد — يظهر فقط عند وجود صفحات إضافية في DB */}
      {hasMore && !historySearch && historyFilter === "all" && (
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <button
            className="filter-ch"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            style={{
              padding: "5px 20px",
              color: "var(--accent)",
              border: "0.5px solid var(--accent)",
              opacity: isLoadingMore ? 0.5 : 1,
              cursor: isLoadingMore ? "not-allowed" : "pointer",
            }}
          >
            {isLoadingMore
              ? (lang === "ar" ? "جاري التحميل..." : "Loading...")
              : (lang === "ar" ? "تحميل المزيد" : "Load More")}
          </button>
        </div>
      )}
    </div>
  );
}

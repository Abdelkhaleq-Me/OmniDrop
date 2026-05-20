// src/components/HistoryTab.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن تبويب سجل التحميلات المؤرشفة (البحث والفلترة والحذف)
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLang } from "../i18n/LangContext";
import type { DownloadRecord } from "../types";
import { formatBytes } from "../utils/format";

interface HistoryTabProps {
  downloads: DownloadRecord[];
  onClearCompleted: () => void;
  onDeleteTask: (id: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

type FilterType = "all" | "completed" | "cancelled" | "failed";

export function HistoryTab({
  downloads,
  onClearCompleted,
  onDeleteTask,
  showToast,
}: HistoryTabProps) {
  const { t } = useLang();
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<FilterType>("all");

  const handleOpenFolder = async (filePath: string) => {
    try {
      await invoke("plugin:opener|open_path", { path: filePath });
    } catch (err: any) {
      showToast(err.toString(), "error");
    }
  };

  // Filter history records
  const filteredHistory = downloads.filter((item) => {
    const isHistoryStatus =
      item.status === "completed" || item.status === "failed" || item.status === "cancelled";
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
          onClick={onClearCompleted}
          style={{
            marginInlineStart: "auto",
            border: "0.5px solid rgba(248,113,113,0.18)",
            color: "var(--s-fail)",
          }}
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
              if (item.status === "cancelled") {
                tagColor = "var(--s-cancel)";
              } else if (item.status === "failed") {
                tagColor = "var(--s-fail)";
              }

              return (
                <div className="hist-item" key={item.id}>
                  <div className="lth" style={{ width: 44, height: 28, borderRadius: 4 }}>
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt=""
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    ) : (
                      <i className="lth-ic ti ti-brand-youtube"></i>
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
                        onClick={() => handleOpenFolder(item.file_path!)}
                      >
                        <i className="ti ti-folder-open"></i>
                      </button>
                    )}
                    <button
                      className="iab dl"
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
    </div>
  );
}

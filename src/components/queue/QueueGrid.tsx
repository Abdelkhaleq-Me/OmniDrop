// src/components/queue/QueueGrid.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن عرض التحميلات كشبكة (Grid View)
// ═══════════════════════════════════════════════════════════════

import { openFileFolder } from "../../utils/opener";
import { useLang } from "../../i18n/LangContext";
import type { DownloadRecord, ProgressData } from "../../types";
import { formatBytes, getLeftStripColor, getStatusTranslation } from "../../utils/format";

interface QueueGridProps {
  downloads: DownloadRecord[];
  liveProgress: Record<string, ProgressData>;
  onCancelTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function QueueGrid({
  downloads,
  liveProgress,
  onCancelTask,
  onDeleteTask,
  showToast,
}: QueueGridProps) {
  const { t } = useLang();

  const handleOpenFolder = async (filePath: string) => {
    await openFileFolder(filePath, showToast);
  };

  return (
    <div className="grid-view">
      {downloads.map((item) => {
        const live = liveProgress[item.id];
        const currentStatus = live?.status || item.status;
        const percentVal = live?.percent || (currentStatus === "completed" ? "100%" : "0%");
        const numericPercent = parseFloat(percentVal.replace("%", "")) || 0;

        const leftStripColor = getLeftStripColor(currentStatus);

        return (
          <div className="grid-item" key={item.id}>
            <div className="grid-thumbnail">
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt=""
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : (
                <i className="grid-thumbnail-icon ti ti-brand-youtube"></i>
              )}

              {/* Overlays / Percent */}
              <div className="grid-overlay">
                {currentStatus === "downloading" && <span className="grid-percent">{percentVal}</span>}
                {currentStatus === "processing" && (
                  <i className="ti ti-loader spin" style={{ fontSize: 18, color: "var(--s-proc)" }}></i>
                )}
                {currentStatus === "completed" && (
                  <i className="ti ti-check" style={{ fontSize: 22, color: "var(--s-done)" }}></i>
                )}
                {currentStatus === "cancelled" && (
                  <span className="grid-percent" style={{ fontSize: 11, color: "var(--s-cancel)" }}>
                    {t.cancelled}
                  </span>
                )}
                {currentStatus === "failed" && (
                  <i className="ti ti-alert-circle" style={{ fontSize: 22, color: "var(--s-fail)" }}></i>
                )}
                {currentStatus === "pending" && (
                  <span className="grid-percent" style={{ fontSize: 10, color: "var(--t2)" }}>
                    {t.pending}
                  </span>
                )}
              </div>

              {/* Status label top corner */}
              <div className="grid-status">
                {currentStatus === "downloading" && (
                  <div className="grid-status-dot pulse" style={{ background: "var(--s-dl)" }}></div>
                )}
                {currentStatus === "processing" && (
                  <div
                    className="grid-status-dot spin"
                    style={{
                      border: "1px solid var(--s-proc)",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                    }}
                  ></div>
                )}
                {currentStatus !== "downloading" && currentStatus !== "processing" && (
                  <div className="grid-status-dot" style={{ background: leftStripColor }}></div>
                )}
                <span className="grid-status-text">
                  {getStatusTranslation(t, currentStatus)}
                </span>
              </div>

              {/* Progress bar overlay at bottom */}
              <div className="grid-progress-track">
                <div
                  className="grid-progress-fill"
                  style={{ width: `${numericPercent}%`, background: leftStripColor }}
                ></div>
              </div>
            </div>

            <div className="grid-body">
              <div className="grid-title" title={item.title || item.url}>
                {item.title || item.url}
              </div>
              <div className="grid-meta">
                <span className="grid-tag">{item.quality || "Original"}</span>
                <span className="grid-tag" style={{ color: leftStripColor }}>
                  {live?.speed ? (
                    <>
                      {live.speed}
                      {item.file_size ? ` · ${formatBytes(item.file_size)}` : ""}
                    </>
                  ) : (
                    formatBytes(item.file_size)
                  )}
                </span>
              </div>
              <div className="grid-meta">
                <span className="grid-tag">{item.platform}</span>
                <div className="grid-actions">
                  {/* Open */}
                  {currentStatus === "completed" && item.file_path && (
                    <button className="grid-action-btn" onClick={() => handleOpenFolder(item.file_path!)}>
                      <i className="ti ti-folder-open"></i>
                    </button>
                  )}

                  {/* Cancel */}
                  {(currentStatus === "downloading" ||
                    currentStatus === "fetching_metadata" ||
                    currentStatus === "pending") && (
                    <button className="grid-action-btn" onClick={() => onCancelTask(item.id)}>
                      <i className="ti ti-x"></i>
                    </button>
                  )}

                  {/* Delete */}
                  {(currentStatus === "completed" ||
                    currentStatus === "failed" ||
                    currentStatus === "cancelled") && (
                    <button className="grid-action-btn" onClick={() => onDeleteTask(item.id)}>
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
  );
}

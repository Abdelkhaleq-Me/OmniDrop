// src/components/queue/QueueList.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن عرض التحميلات كقائمة (List View)
// ═══════════════════════════════════════════════════════════════

import { openFileFolder } from "../../utils/opener";
import { useLang } from "../../i18n/LangContext";
import type { DownloadRecord, ProgressData } from "../../types";
import { formatDuration, formatBytes, getLeftStripColor, getStatusTranslation } from "../../utils/format";

interface QueueListProps {
  downloads: DownloadRecord[];
  liveProgress: Record<string, ProgressData>;
  onCancelTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function QueueList({
  downloads,
  liveProgress,
  onCancelTask,
  onDeleteTask,
  showToast,
}: QueueListProps) {
  const { t } = useLang();

  const handleOpenFolder = async (filePath: string) => {
    await openFileFolder(filePath, showToast);
  };

  return (
    <div className="list-view">
      {downloads.map((item) => {
        const live = liveProgress[item.id];
        const currentStatus = live?.status || item.status;
        const percentVal = live?.percent || (currentStatus === "completed" ? "100%" : "0%");
        const numericPercent = parseFloat(percentVal.replace("%", "")) || 0;

        const leftStripColor = getLeftStripColor(currentStatus);

        return (
          <div className="list-item" key={item.id}>
            <div className="list-accent" style={{ background: leftStripColor }}></div>
            <div className="list-thumb">
              {/* Thumbnail / Icon */}
              <div className="list-thumbnail-img">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt=""
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <i className="list-thumb-icon ti ti-brand-youtube"></i>
                )}
                {item.duration && (
                  <div className="time-badge">{formatDuration(item.duration)}</div>
                )}
              </div>

              {/* Details */}
              <div className="list-info">
                <div className="list-title" title={item.title || item.url}>
                  {item.title || item.url}
                </div>
                <div className="list-subtitle">
                  {currentStatus === "downloading" && (
                    <div className="status-dot pulse" style={{ background: "var(--s-dl)" }}></div>
                  )}
                  {currentStatus === "processing" && (
                    <div
                      className="status-dot spin"
                      style={{
                        width: 5,
                        height: 5,
                        border: "1.5px solid var(--s-proc)",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                      }}
                    ></div>
                  )}
                  {currentStatus !== "downloading" && currentStatus !== "processing" && (
                    <div className="status-dot" style={{ background: leftStripColor }}></div>
                  )}

                  <span className="status-tag" style={{ color: leftStripColor }}>
                    {getStatusTranslation(t, currentStatus)}
                  </span>
                  <span className="dot-separator">·</span>
                  <span className="status-tag">
                    {item.quality || "Original"} · {formatBytes(item.file_size)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="list-actions">
                {/* Open finished files */}
                {currentStatus === "completed" && item.file_path && (
                  <button
                    className="item-action-btn"
                    title={t.openFolder}
                    onClick={() => handleOpenFolder(item.file_path!)}
                  >
                    <i className="ti ti-folder-open"></i>
                  </button>
                )}

                {/* Cancel active downloads */}
                {(currentStatus === "downloading" ||
                  currentStatus === "fetching_metadata" ||
                  currentStatus === "pending") && (
                  <button
                    className="item-action-btn dl"
                    onClick={() => onCancelTask(item.id)}
                    title={t.cancelModal}
                  >
                    <i className="ti ti-x"></i>
                  </button>
                )}

                {/* Delete old options-row retry */}
                {(currentStatus === "completed" ||
                  currentStatus === "failed" ||
                  currentStatus === "cancelled") && (
                  <button
                    className="item-action-btn dl"
                    onClick={() => onDeleteTask(item.id)}
                    title={t.deleteRecord}
                  >
                    <i className="ti ti-trash"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar info */}
            <div className="progress-wrapper">
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${numericPercent}%`, background: leftStripColor }}
                ></div>
              </div>
              <div className="progress-label">
                <span className="progress-label-bar" style={{ color: leftStripColor }}>
                  {percentVal} {live?.speed ? `· ${live.speed}` : ""}
                </span>
                <span className="progress-label-bar">
                  {live?.eta ? `${t.etaLabel} ${live.eta}` : ""}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

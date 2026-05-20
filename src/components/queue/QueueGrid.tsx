// src/components/queue/QueueGrid.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن عرض التحميلات كشبكة (Grid View)
// ═══════════════════════════════════════════════════════════════

import { openFileFolder } from "../../utils/opener";
import { useLang } from "../../i18n/LangContext";
import type { DownloadRecord, ProgressData } from "../../types";
import { formatBytes } from "../../utils/format";

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
    <div className="gv">
      {downloads.map((item) => {
        const live = liveProgress[item.id];
        const currentStatus = live?.status || item.status;
        const percentVal = live?.percent || (currentStatus === "completed" ? "100%" : "0%");
        const numericPercent = parseFloat(percentVal.replace("%", "")) || 0;

        let leftStripColor = "var(--s-pend)";
        if (currentStatus === "downloading" || currentStatus === "fetching_metadata") {
          leftStripColor = "var(--s-dl)";
        } else if (currentStatus === "processing") {
          leftStripColor = "var(--s-proc)";
        } else if (currentStatus === "completed") {
          leftStripColor = "var(--s-done)";
        } else if (currentStatus === "cancelled") {
          leftStripColor = "var(--s-cancel)";
        } else if (currentStatus === "failed") {
          leftStripColor = "var(--s-fail)";
        }

        return (
          <div className="gi" key={item.id}>
            <div className="gth">
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt=""
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : (
                <i className="gth-ic ti ti-brand-youtube"></i>
              )}

              {/* Overlays / Percent */}
              <div className="gov">
                {currentStatus === "downloading" && <span className="gpct">{percentVal}</span>}
                {currentStatus === "processing" && (
                  <i className="ti ti-loader spin" style={{ fontSize: 18, color: "var(--s-proc)" }}></i>
                )}
                {currentStatus === "completed" && (
                  <i className="ti ti-check" style={{ fontSize: 22, color: "var(--s-done)" }}></i>
                )}
                {currentStatus === "cancelled" && (
                  <span className="gpct" style={{ fontSize: 11, color: "var(--s-cancel)" }}>
                    {t.cancelled}
                  </span>
                )}
                {currentStatus === "failed" && (
                  <i className="ti ti-alert-circle" style={{ fontSize: 22, color: "var(--s-fail)" }}></i>
                )}
                {currentStatus === "pending" && (
                  <span className="gpct" style={{ fontSize: 10, color: "var(--t2)" }}>
                    {t.pending}
                  </span>
                )}
              </div>

              {/* Status label top corner */}
              <div className="gst">
                {currentStatus === "downloading" && (
                  <div className="gstd pulse" style={{ background: "var(--s-dl)" }}></div>
                )}
                {currentStatus === "processing" && (
                  <div
                    className="gstd spin"
                    style={{
                      border: "1px solid var(--s-proc)",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                    }}
                  ></div>
                )}
                {currentStatus !== "downloading" && currentStatus !== "processing" && (
                  <div className="gstd" style={{ background: leftStripColor }}></div>
                )}
                <span className="gstt">
                  {t[currentStatus as keyof typeof t] || currentStatus}
                </span>
              </div>

              {/* Progress bar overlay at bottom */}
              <div className="gpp">
                <div
                  className="gpf"
                  style={{ width: `${numericPercent}%`, background: leftStripColor }}
                ></div>
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
                    <button className="gab" onClick={() => handleOpenFolder(item.file_path!)}>
                      <i className="ti ti-folder-open"></i>
                    </button>
                  )}

                  {/* Cancel */}
                  {(currentStatus === "downloading" ||
                    currentStatus === "fetching_metadata" ||
                    currentStatus === "pending") && (
                    <button className="gab" onClick={() => onCancelTask(item.id)}>
                      <i className="ti ti-x"></i>
                    </button>
                  )}

                  {/* Delete */}
                  {(currentStatus === "completed" ||
                    currentStatus === "failed" ||
                    currentStatus === "cancelled") && (
                    <button className="gab" onClick={() => onDeleteTask(item.id)}>
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

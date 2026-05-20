// src/components/queue/QueueList.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن عرض التحميلات كقائمة (List View)
// ═══════════════════════════════════════════════════════════════

import { invoke } from "@tauri-apps/api/core";
import { useLang } from "../../i18n/LangContext";
import type { DownloadRecord, ProgressData } from "../../types";
import { formatDuration, formatBytes } from "../../utils/format";

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
    try {
      await invoke("plugin:opener|open_path", { path: filePath });
    } catch (err: any) {
      showToast(err.toString(), "error");
    }
  };

  return (
    <div className="lv">
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
          <div className="li" key={item.id}>
            <div className="lac" style={{ background: leftStripColor }}></div>
            <div className="lt">
              {/* Thumbnail / Icon */}
              <div className="lth">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt=""
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <i className="lth-ic ti ti-brand-youtube"></i>
                )}
                {item.duration && (
                  <div className="tbd">{formatDuration(item.duration)}</div>
                )}
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
                    <div
                      className="sd spin"
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
                    <div className="sd" style={{ background: leftStripColor }}></div>
                  )}

                  <span className="stg" style={{ color: leftStripColor }}>
                    {t[currentStatus as keyof typeof t] || currentStatus}
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
                    className="iab dl"
                    onClick={() => onCancelTask(item.id)}
                    title={t.cancelModal}
                  >
                    <i className="ti ti-x"></i>
                  </button>
                )}

                {/* Delete old or retry */}
                {(currentStatus === "completed" ||
                  currentStatus === "failed" ||
                  currentStatus === "cancelled") && (
                  <button
                    className="iab dl"
                    onClick={() => onDeleteTask(item.id)}
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
                <div
                  className="pf"
                  style={{ width: `${numericPercent}%`, background: leftStripColor }}
                ></div>
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
  );
}

// src/components/PlaylistsTab.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن تبويب قوائم التشغيل (عرض المحتويات المنزلة كدفعات/قوائم)
// ═══════════════════════════════════════════════════════════════

import type { CollectionRecord, DownloadRecord } from "../types";
import { useLang } from "../i18n/LangContext";

interface PlaylistsTabProps {
  collections: CollectionRecord[];
  downloads: DownloadRecord[];
  onDeleteCollection: (id: string) => void;
}

export function PlaylistsTab({ collections, downloads, onDeleteCollection }: PlaylistsTabProps) {
  const { t } = useLang();

  return (
    <div className="items-wrapper" style={{ paddingTop: 14 }}>
      {collections.length === 0 ? (
        <div className="no-items">
          <i className="ti ti-playlist" />
          <span>{t.emptyStatePlaylists}</span>
        </div>
      ) : (
        <div className="list-view">
          {collections.map((col) => {
            // ربط التحميلات بمجموعتها عبر collection_id
            const colDownloads = downloads.filter((d) => d.collection_id === col.id);
            const completedCount = colDownloads.filter((d) => d.status === "completed").length;
            const failedCount   = colDownloads.filter((d) => d.status === "failed").length;
            const total         = col.total_items ?? colDownloads.length;
            const progressPct   = total > 0 ? Math.round((completedCount / total) * 100) : 0;

            // لون شريط التقدم حسب حالة المجموعة
            const barColor =
              col.status === "completed" ? "var(--s-done)"
              : failedCount > 0         ? "var(--s-fail)"
              :                           "var(--accent)";

            return (
              <div className="list-item" key={col.id} style={{ borderLeft: "2.5px solid var(--bl)" }}>
                <div className="list-thumb">
                  <div className="list-info">
                    <div className="list-title">{col.title || col.url}</div>
                    <div className="list-subtitle">
                      <span className="status-tag" style={{ color: "var(--bl)" }}>
                        {col.status.toUpperCase()}
                      </span>
                      <span className="dot-separator">·</span>
                      {/* إجمالي العناصر من DB إن وجد، وإلا من عدد المربوطة فعلاً */}
                      <span className="status-tag">{total} videos</span>
                      <span className="dot-separator">·</span>
                      <span className="status-tag">{col.platform}</span>
                      {colDownloads.length > 0 && (
                        <>
                          <span className="dot-separator">·</span>
                          <span className="status-tag" style={{ color: "var(--s-done)" }}>
                            {completedCount} ✓
                          </span>
                          {failedCount > 0 && (
                            <>
                              <span className="dot-separator">·</span>
                              <span className="status-tag" style={{ color: "var(--s-fail)" }}>
                                {failedCount} ✗
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="progress-wrapper" style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  {/* شريط تقدم المجموعة */}
                  {colDownloads.length > 0 && (
                    <div style={{
                      height: 3,
                      borderRadius: 2,
                      background: "var(--bd)",
                      overflow: "hidden",
                      marginBottom: 2,
                    }}>
                      <div style={{
                        width: `${progressPct}%`,
                        height: "100%",
                        background: barColor,
                        borderRadius: 2,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div className="progress-label">
                      <span className="progress-label-bar">{new Date(col.created_at).toLocaleString()}</span>
                    </div>
                    <div className="hist-action" style={{ display: "flex", gap: 6 }}>
                      <button
                        className="item-action-btn dl"
                        onClick={() => onDeleteCollection(col.id)}
                        title={t.deleteRecord}
                        style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          color: "rgb(239, 68, 68)",
                          border: "none",
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          transition: "all 0.2s",
                        }}
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

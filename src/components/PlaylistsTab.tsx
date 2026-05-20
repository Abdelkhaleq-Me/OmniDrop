// src/components/PlaylistsTab.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن تبويب قوائم التشغيل (عرض المحتويات المنزلة كدفعات/قوائم)
// ═══════════════════════════════════════════════════════════════

import type { CollectionRecord } from "../types";
import { useLang } from "../i18n/LangContext";

interface PlaylistsTabProps {
  collections: CollectionRecord[];
  onDeleteCollection: (id: string) => void;
}

export function PlaylistsTab({ collections, onDeleteCollection }: PlaylistsTabProps) {
  const { t } = useLang();

  return (
    <div className="items-wrapper" style={{ paddingTop: 14 }}>
      {collections.length === 0 ? (
        <div className="no-items">
          <i className="ti ti-playlist"></i>
          <span>{t.emptyStatePlaylists}</span>
        </div>
      ) : (
        <div className="list-view">
          {collections.map((col) => (
            <div className="list-item" key={col.id} style={{ borderLeft: "2.5px solid var(--bl)" }}>
              <div className="list-thumb">
                <div className="list-info">
                  <div className="list-title">{col.title || col.url}</div>
                  <div className="list-subtitle">
                    <span className="status-tag" style={{ color: "var(--bl)" }}>
                      {col.status.toUpperCase()}
                    </span>
                    <span className="dot-separator">·</span>
                    <span className="status-tag">{col.total_items || 0} videos</span>
                    <span className="dot-separator">·</span>
                    <span className="status-tag">{col.platform}</span>
                  </div>
                </div>
              </div>
              <div className="progress-wrapper" style={{ display: "flex", alignItems: "center" }}>
                <div className="progress-label">
                  <span className="progress-label-bar">{new Date(col.created_at).toLocaleString()}</span>
                </div>
                <div className="hist-action" style={{ marginInlineStart: 12, display: "flex", gap: 6 }}>
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
                      transition: "all 0.2s"
                    }}
                  >
                    <i className="ti ti-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

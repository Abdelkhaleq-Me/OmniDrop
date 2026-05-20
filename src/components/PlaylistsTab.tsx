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
    <div className="iw" style={{ paddingTop: 14 }}>
      {collections.length === 0 ? (
        <div className="no-items">
          <i className="ti ti-playlist"></i>
          <span>{t.emptyStatePlaylists}</span>
        </div>
      ) : (
        <div className="lv">
          {collections.map((col) => (
            <div className="li" key={col.id} style={{ borderLeft: "2.5px solid var(--bl)" }}>
              <div className="lt">
                <div className="linf">
                  <div className="ltit">{col.title || col.url}</div>
                  <div className="lsub">
                    <span className="stg" style={{ color: "var(--bl)" }}>
                      {col.status.toUpperCase()}
                    </span>
                    <span className="dot">·</span>
                    <span className="stg">{col.total_items || 0} videos</span>
                    <span className="dot">·</span>
                    <span className="stg">{col.platform}</span>
                  </div>
                </div>
              </div>
              <div className="pw" style={{ display: "flex", alignItems: "center" }}>
                <div className="pl">
                  <span className="plb">{new Date(col.created_at).toLocaleString()}</span>
                </div>
                <div className="hist-action" style={{ marginInlineStart: 12, display: "flex", gap: 6 }}>
                  <button
                    className="iab dl"
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

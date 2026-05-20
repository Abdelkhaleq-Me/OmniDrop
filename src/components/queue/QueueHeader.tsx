// src/components/queue/QueueHeader.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن ترويسة قائمة التحميل (عدد التحميلات، زر الحذف، وتبديل العرض)
// ═══════════════════════════════════════════════════════════════

import { useLang } from "../../i18n/LangContext";

interface QueueHeaderProps {
  activeCount: number;
  onClearAll: () => void;
  viewMode: "list" | "grid";
  setViewMode: (mode: "list" | "grid") => void;
}

export function QueueHeader({
  activeCount,
  onClearAll,
  viewMode,
  setViewMode,
}: QueueHeaderProps) {
  const { t } = useLang();

  return (
    <div className="queue-bar">
      <span className="queue-title">{t.queueTitle}</span>
      <div className="queue-menu">
        <span className="active-badge">{t.activeBadge.replace("{n}", activeCount.toString())}</span>
        <button className="clear-btn" onClick={onClearAll}>
          {t.clearAll}
        </button>

        {/* View togglers list/grid */}
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === "list" ? "ac" : ""}`}
            onClick={() => setViewMode("list")}
            title={viewMode === "list" ? "" : t.queueTitle} // simple titles
          >
            <i className="ti ti-list"></i>
          </button>
          <button
            className={`view-btn ${viewMode === "grid" ? "ac" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <i className="ti ti-layout-grid"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

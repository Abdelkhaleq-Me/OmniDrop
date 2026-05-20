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
    <div className="qb">
      <span className="qtl">{t.queueTitle}</span>
      <div className="qm">
        <span className="bdg">{t.activeBadge.replace("{n}", activeCount.toString())}</span>
        <button className="clrb" onClick={onClearAll}>
          {t.clearAll}
        </button>

        {/* View togglers list/grid */}
        <div className="vtg">
          <button
            className={`vb ${viewMode === "list" ? "ac" : ""}`}
            onClick={() => setViewMode("list")}
            title={viewMode === "list" ? "" : t.queueTitle} // simple titles
          >
            <i className="ti ti-list"></i>
          </button>
          <button
            className={`vb ${viewMode === "grid" ? "ac" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <i className="ti ti-layout-grid"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

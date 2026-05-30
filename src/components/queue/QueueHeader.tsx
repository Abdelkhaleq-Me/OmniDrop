// src/components/queue/QueueHeader.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن ترويسة قائمة التحميل (عدد التحميلات، زر الحذف، وتبديل العرض)
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
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
  const { t, lang } = useLang();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    onClearAll();
    setShowConfirm(false);
  };

  return (
    <>
      <div className="queue-bar">
        <span className="queue-title">{t.queueTitle}</span>
        <div className="queue-menu">
          <span className="active-badge">{t.activeBadge.replace("{n}", activeCount.toString())}</span>
          <button className="clear-btn" onClick={() => setShowConfirm(true)}>
            {t.clearAll}
          </button>

          {/* View togglers list/grid */}
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === "list" ? "ac" : ""}`}
              onClick={() => setViewMode("list")}
              title={viewMode === "list" ? "" : t.queueTitle}
            >
              <i className="ti ti-list" />
            </button>
            <button
              className={`view-btn ${viewMode === "grid" ? "ac" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <i className="ti ti-layout-grid" />
            </button>
          </div>
        </div>
      </div>

      {/* نافذة تأكيد مسح الكل — تحذّر من إلغاء التحميلات النشطة */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400, marginTop: "15vh" }}>
            <div className="modal-header">
              <span className="modal-header-title">
                {lang === "ar" ? "تأكيد مسح قائمة التحميل" : "Confirm Clear Queue"}
              </span>
            </div>
            <div style={{ padding: "16px 15px", fontSize: "11.5px", color: "var(--t1)", lineHeight: "1.6" }}>
              {lang === "ar" ? (
                <>
                  سيتم <strong>إلغاء جميع التحميلات النشطة</strong> وحذف كامل السجل من قاعدة البيانات.
                  <br />
                  لن يتم حذف الملفات الفعلية الموجودة على جهازك.
                  <br /><br />
                  <span style={{ color: "var(--s-fail)" }}>⚠ هذا الإجراء لا يمكن التراجع عنه.</span>
                </>
              ) : (
                <>
                  All <strong>active downloads will be cancelled</strong> and the entire queue will be removed from the database.
                  <br />
                  Files already saved to your disk will not be deleted.
                  <br /><br />
                  <span style={{ color: "var(--s-fail)" }}>⚠ This action cannot be undone.</span>
                </>
              )}
            </div>
            <div className="modal-footer" style={{ borderTop: "0.5px solid var(--bd)" }}>
              <button
                className="modal-cancel-btn"
                onClick={() => setShowConfirm(false)}
              >
                {t.cancelModal}
              </button>
              <button
                className="modal-download-btn"
                style={{ background: "var(--s-fail)" }}
                onClick={handleConfirm}
              >
                {t.clearAll}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

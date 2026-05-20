// src/components/PlaylistModal.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن نافذة اختيار وتعديل فيديوهات قائمة التشغيل قبل التحميل
// ═══════════════════════════════════════════════════════════════

import { useLang } from "../i18n/LangContext";
import type { PlaylistVideoItem } from "../types";

interface PlaylistModalProps {
  isOpen: boolean;
  isLoading: boolean;
  isSubmitting?: boolean;
  videos: PlaylistVideoItem[];
  selectedIds: Set<number>;
  search: string;
  setSearch: (s: string) => void;
  onToggleItem: (id: number) => void;
  onSelectAll: () => void;
  onClose: () => void;
  onConfirmDownload: () => void;
}

export function PlaylistModal({
  isOpen,
  isLoading,
  isSubmitting = false,
  videos,
  selectedIds,
  search,
  setSearch,
  onToggleItem,
  onSelectAll,
  onClose,
  onConfirmDownload,
}: PlaylistModalProps) {
  const { lang, t } = useLang();

  if (!isOpen) return null;

  const filteredVideos = videos.filter(
    (v) => !search || v.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="mhd">
          <div className="mhl">
            <span className="mht">{t.modalTitle}</span>
            <span className="mhs">
              {isSubmitting
                ? lang === "ar"
                  ? "جاري إعداد وإرسال طلب التحميل..."
                  : "Preparing and starting download..."
                : isLoading
                ? lang === "ar"
                  ? "جاري قراءة البيانات..."
                  : "Loading metadata..."
                : t.modalSub.replace("{n}", videos.length.toString())}
            </span>
          </div>
          <div className="mhac">
            <button
              className="msa"
              onClick={onSelectAll}
              disabled={isLoading || isSubmitting || videos.length === 0}
            >
              {selectedIds.size === videos.length ? t.deselectAll : t.selectAll}
            </button>
            <button
              className="mcl"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label={lang === "ar" ? "إغلاق" : "Close"}
            >
              <i className="ti ti-x"></i>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="modal-loading-container">
            <div className="glowing-spinner"></div>
            <span className="modal-loading-text">
              {lang === "ar"
                ? "جاري جلب تفاصيل وفيديوهات قائمة التشغيل..."
                : "Fetching playlist details & videos..."}
            </span>
          </div>
        ) : (
          <>
            <div className="mfi">
              <input
                className="mfin"
                placeholder={t.searchPlaylist}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="msc">
                {t.selectedCount.replace("{n}", selectedIds.size.toString())}
              </span>
            </div>

            <div className="ml">
              {filteredVideos.length === 0 ? (
                <div className="no-items" style={{ padding: "40px 20px" }}>
                  <i className="ti ti-video-off" style={{ fontSize: 24, opacity: 0.5 }}></i>
                  <span style={{ fontSize: 13, opacity: 0.7, marginTop: 8 }}>
                    {lang === "ar" ? "لم يتم العثور على أي فيديوهات." : "No videos found."}
                  </span>
                </div>
              ) : (
                filteredVideos.map((video) => {
                  const isSel = selectedIds.has(video.id);
                  return (
                    <div
                      key={video.id}
                      className={`mi ${isSel ? "sel" : ""}`}
                      onClick={() => onToggleItem(video.id)}
                    >
                      <div className="mcb">
                        <i className="ti ti-check"></i>
                      </div>
                      <div className="mith">
                        {video.videoId ? (
                          <img
                            src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                            alt=""
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        ) : (
                          <div className="mith-placeholder">
                            <i className="ti ti-video"></i>
                          </div>
                        )}
                      </div>
                      <div className="miinf">
                        <div className="mitit">{video.title}</div>
                        <div className="misub">{video.channel}</div>
                      </div>
                      <div className="midr">{video.duration}</div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        <div className="mft">
          <button className="mcc" onClick={onClose} disabled={isSubmitting}>
            {t.cancelModal}
          </button>
          <button
            className="mdb"
            onClick={onConfirmDownload}
            disabled={isLoading || isSubmitting || selectedIds.size === 0}
          >
            {isSubmitting ? (
              <>
                <i className="ti ti-loader spin"></i>
                <span>{lang === "ar" ? "جاري البدء..." : "Starting..."}</span>
              </>
            ) : (
              <>
                <i className="ti ti-arrow-bar-to-down"></i>
                <span>{t.downloadModal.replace("{n}", selectedIds.size.toString())}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface DownloadOptions {
  quality: string;
  audio_only: boolean;
  audio_format: string;
}

export interface DownloadRecord {
  id: string;
  url: string;
  platform: string;
  title: string | null;
  uploader: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  file_path: string | null;
  file_size: number | null;
  extension: string | null;
  quality: string | null;
  status: 'pending' | 'fetching_metadata' | 'downloading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error_msg: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CollectionRecord {
  id: string;
  title: string | null;
  url: string;
  platform: string;
  total_items: number | null;
  status: string;
  created_at: string;
}

export interface ProgressData {
  task_id: string;
  percent: string | null;
  speed: string | null;
  eta: string | null;
  status: string;
}

export interface MediaInfo {
  title: string | null;
  uploader: string | null;
  thumbnail: string | null;
  duration: number | null;
  ext: string | null;
  filesize: number | null;
  filesize_approx: number | null;
}

export interface CompletedData {
  task_id: string;
  title: string | null;
  file_path: string | null;
}

export interface FailedData {
  task_id: string;
  error: string;
}

export interface PlaylistStartedData {
  collection_id: string;
  title: string | null;
  total_items: number;
  task_ids: string[];
}

// ── أنواع الواجهة الجديدة ─────────────────────────────

/** بيانات وصفية مُجلبة مسبقاً من الباكأند */
export interface QualityInfo {
  height: number;
  size_bytes: number | null;
}

export interface MediaDetails {
  is_playlist: boolean;
  max_height: number;
  total_duration: number;
  qualities: QualityInfo[];
  media_info: MediaInfo | null;
}

/** عنصر فيديو في نافذة اختيار قائمة التشغيل */
export interface PlaylistVideoItem {
  id: number;
  title: string;
  channel: string;
  duration: string;
  videoId: string;
  url: string;
}

/** إشعار Toast */
export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

/** بيانات قائمة التشغيل المُجلبة من الباكأند */
export interface PlaylistInfoResponse {
  title: string | null;
  uploader: string | null;
  entries: Array<{
    title: string | null;
    id: string | null;
    url: string | null;
    duration: number | null;
  }>;
}

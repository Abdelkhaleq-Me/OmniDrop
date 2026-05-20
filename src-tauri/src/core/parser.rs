// src-tauri/src/core/parser.rs
// ═══════════════════════════════════════════════════════════════
// تحليل مخرجات yt-dlp المنظمة بصيغة JSON — لا Regex هشة أبداً
//
// يدعم:
// - تحليل بيانات التقدم (progress template)
// - تحليل البيانات الوصفية (metadata JSON)
// - تحليل بيانات قوائم التشغيل (playlist flat JSON)
// ═══════════════════════════════════════════════════════════════

use serde::{Deserialize, Serialize};

// ═══════════════════════════════════════════════════════════════
//  خيارات التحميل — تُرسل من الواجهة الأمامية
// ═══════════════════════════════════════════════════════════════

/// خيارات التحميل الديناميكية التي يحددها المستخدم من الواجهة.
///
/// ## أمثلة الاستخدام:
/// - فيديو بأعلى جودة: `{ quality: "best", audio_only: false, audio_format: "mp3" }`
/// - صوت فقط MP3: `{ quality: "best", audio_only: true, audio_format: "mp3" }`
/// - فيديو 720p: `{ quality: "720", audio_only: false, audio_format: "mp3" }`
/// - قائمة تشغيل: `{ quality: "best", audio_only: false, audio_format: "mp3" }`
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadOptions {
    /// الجودة المطلوبة:
    /// - "best" → أعلى جودة متاحة
    /// - "2160" → 4K
    /// - "1080" → Full HD
    /// - "720"  → HD
    /// - "480"  → SD
    /// - "360"  → منخفضة
    /// - "worst" → أقل جودة (أصغر حجم)
    #[serde(default = "default_quality")]
    pub quality: String,

    /// هل نريد استخراج الصوت فقط؟
    #[serde(default)]
    pub audio_only: bool,

    /// صيغة الصوت عند استخراج الصوت فقط:
    /// "mp3", "m4a", "opus", "wav", "flac"
    #[serde(default = "default_audio_format")]
    pub audio_format: String,
}

fn default_quality() -> String { "best".to_string() }
fn default_audio_format() -> String { "mp3".to_string() }

impl Default for DownloadOptions {
    fn default() -> Self {
        Self {
            quality: default_quality(),
            audio_only: false,
            audio_format: default_audio_format(),
        }
    }
}

impl DownloadOptions {
    /// يبني معاملات yt-dlp الخاصة بالجودة والصيغة.
    ///
    /// ## القواعد:
    /// - صوت فقط: `-x --audio-format <fmt> --audio-quality 0`
    /// - جودة محددة: `-f "bestvideo[height<=N]+bestaudio/best[height<=N]"`
    /// - أعلى جودة: لا معاملات إضافية (السلوك الافتراضي لـ yt-dlp)
    pub fn to_ytdlp_args(&self) -> Vec<String> {
        let mut args: Vec<String> = Vec::new();

        if self.audio_only {
            // ═══ وضع الصوت فقط ═══
            args.push("-x".to_string());
            args.push("--audio-format".to_string());
            args.push(self.audio_format.clone());
            args.push("--audio-quality".to_string());
            args.push("0".to_string()); // أعلى جودة صوت
        } else {
            // ═══ وضع الفيديو ═══
            match self.quality.as_str() {
                "best" | "" => {
                    // أعلى جودة — السلوك الافتراضي (لا معاملات)
                }
                "worst" => {
                    args.push("-f".to_string());
                    args.push("worst".to_string());
                }
                height => {
                    // جودة محددة: 2160, 1080, 720, 480, 360
                    args.push("-f".to_string());
                    args.push(format!(
                        "bestvideo[height<={}]+bestaudio/best[height<={}]",
                        height, height
                    ));
                }
            }
        }

        args
    }

    /// يُرجع وصف الجودة المقروء (لحفظه في DB)
    pub fn quality_label(&self) -> String {
        if self.audio_only {
            format!("audio-only ({})", self.audio_format)
        } else {
            match self.quality.as_str() {
                "best" | "" => "best".to_string(),
                "worst" => "worst".to_string(),
                "2160" => "4K".to_string(),
                "1080" => "1080p".to_string(),
                "720" => "720p".to_string(),
                "480" => "480p".to_string(),
                "360" => "360p".to_string(),
                other => format!("{}p", other),
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  هياكل البيانات المُرسَلة للواجهة عبر IPC Events
// ═══════════════════════════════════════════════════════════════

/// بيانات تقدم التحميل — تُرسل في الوقت الفعلي للواجهة
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProgressData {
    pub task_id: String,
    pub percent: Option<String>,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub status: String,
}

/// البيانات الوصفية للمحتوى — تُستخرج من yt-dlp
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MediaInfo {
    pub title: Option<String>,
    pub uploader: Option<String>,
    pub thumbnail: Option<String>,
    pub duration: Option<f64>,
    pub ext: Option<String>,
    pub filesize: Option<i64>,
    pub filesize_approx: Option<i64>,
}

#[derive(Debug, Serialize, Clone)]
pub struct MetadataPayload {
    pub task_id: String,
    pub info: MediaInfo,
}

/// بيانات اكتمال التحميل — تُرسل عند انتهاء التحميل بنجاح
#[derive(Debug, Serialize, Clone)]
pub struct CompletedData {
    pub task_id: String,
    pub title: Option<String>,
    pub file_path: Option<String>,
}

/// بيانات الفشل — تُرسل عند فشل التحميل
#[derive(Debug, Serialize, Clone)]
pub struct FailedData {
    pub task_id: String,
    pub error: String,
}

/// عنصر واحد في قائمة تشغيل — يُستخرج من --flat-playlist --dump-single-json
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlaylistEntry {
    pub url: Option<String>,
    pub title: Option<String>,
    pub duration: Option<f64>,
    pub id: Option<String>,
}

/// بيانات قائمة تشغيل كاملة — يُستخرج من --flat-playlist --dump-single-json
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlaylistInfo {
    pub title: Option<String>,
    pub uploader: Option<String>,
    pub webpage_url: Option<String>,
    pub playlist_count: Option<i64>,
    pub entries: Option<Vec<PlaylistEntry>>,
}

/// بيانات بدء قائمة تشغيل — تُرسل للواجهة لإبلاغها بعدد العناصر
#[derive(Debug, Serialize, Clone)]
pub struct PlaylistStartedData {
    pub collection_id: String,
    pub title: Option<String>,
    pub total_items: i64,
    pub task_ids: Vec<String>,
}

// ═══════════════════════════════════════════════════════════════
//  الهيكل الخام الذي يُستقبل من yt-dlp بصيغة --progress-template
// ═══════════════════════════════════════════════════════════════

#[derive(Deserialize)]
struct RawProgress {
    progress: Option<String>,
    speed: Option<String>,
    eta: Option<String>,
}

// ═══════════════════════════════════════════════════════════════
//  دوال التحليل
// ═══════════════════════════════════════════════════════════════

/// محاولة تحليل سطر stdout كبيانات تقدم JSON.
pub fn try_parse_progress(line: &str, task_id: &str) -> Option<ProgressData> {
    let trimmed = line.trim();
    if !trimmed.starts_with('{') {
        return None;
    }

    serde_json::from_str::<RawProgress>(trimmed).ok().map(|raw| ProgressData {
        task_id: task_id.to_string(),
        percent: raw.progress,
        speed: raw.speed,
        eta: raw.eta,
        status: "downloading".to_string(),
    })
}

/// محاولة تحليل سطر كبيانات وصفية كاملة (Metadata JSON).
pub fn try_parse_media_info(line: &str) -> Option<MediaInfo> {
    let trimmed = line.trim();
    if !trimmed.starts_with('{') {
        return None;
    }

    serde_json::from_str::<MediaInfo>(trimmed).ok()
}

/// تحليل مخرجات --flat-playlist --dump-single-json لاستخراج بيانات قائمة التشغيل.
pub fn try_parse_playlist_info(json_str: &str) -> Option<PlaylistInfo> {
    let trimmed = json_str.trim();
    if !trimmed.starts_with('{') {
        return None;
    }

    serde_json::from_str::<PlaylistInfo>(trimmed).ok()
}

// ═══════════════════════════════════════════════════════════════
//  اختبارات الوحدة
// ═══════════════════════════════════════════════════════════════
#[cfg(test)]
mod tests {
    use super::*;

    // ── اختبارات التقدم ────────────────────────────────────────

    #[test]
    fn test_valid_json_progress() {
        let line = r#"{"progress":"45.2%","speed":"1.2MiB/s","eta":"00:30"}"#;
        let result = try_parse_progress(line, "test-id-001");
        assert!(result.is_some());
        let p = result.unwrap();
        assert_eq!(p.task_id, "test-id-001");
        assert_eq!(p.percent, Some("45.2%".to_string()));
        assert_eq!(p.speed, Some("1.2MiB/s".to_string()));
        assert_eq!(p.eta, Some("00:30".to_string()));
        assert_eq!(p.status, "downloading");
    }

    #[test]
    fn test_partial_json_progress() {
        let line = r#"{"progress":"99.9%"}"#;
        let result = try_parse_progress(line, "test-id-002");
        assert!(result.is_some());
        let p = result.unwrap();
        assert_eq!(p.percent, Some("99.9%".to_string()));
        assert_eq!(p.speed, None);
        assert_eq!(p.eta, None);
    }

    #[test]
    fn test_non_json_line_ignored() {
        let line = "[youtube] Extracting URL: https://youtube.com/watch?v=abc";
        let result = try_parse_progress(line, "test-id");
        assert!(result.is_none());
    }

    #[test]
    fn test_warning_line_ignored() {
        let line = "WARNING: Unable to download webpage";
        let result = try_parse_progress(line, "test-id");
        assert!(result.is_none());
    }

    #[test]
    fn test_empty_line_ignored() {
        let result = try_parse_progress("", "test-id");
        assert!(result.is_none());
    }

    #[test]
    fn test_whitespace_line_ignored() {
        let result = try_parse_progress("   \t  ", "test-id");
        assert!(result.is_none());
    }

    #[test]
    fn test_malformed_json_ignored() {
        let line = r#"{ broken json }"#;
        let result = try_parse_progress(line, "test-id");
        assert!(result.is_none());
    }

    #[test]
    fn test_valid_media_info() {
        let line = r#"{"title":"Test Video","uploader":"TestUser","thumbnail":"https://img.com/t.jpg","duration":120.5,"ext":"mp4","filesize":50000000}"#;
        let result = try_parse_media_info(line);
        assert!(result.is_some());
        let info = result.unwrap();
        assert_eq!(info.title, Some("Test Video".to_string()));
        assert_eq!(info.uploader, Some("TestUser".to_string()));
        assert_eq!(info.duration, Some(120.5));
        assert_eq!(info.ext, Some("mp4".to_string()));
    }

    // ── اختبارات خيارات التحميل ────────────────────────────────

    #[test]
    fn test_options_best_quality() {
        let opts = DownloadOptions {
            quality: "best".to_string(),
            audio_only: false,
            audio_format: "mp3".to_string(),
        };
        let args = opts.to_ytdlp_args();
        assert!(args.is_empty()); // best = لا معاملات إضافية
        assert_eq!(opts.quality_label(), "best");
    }

    #[test]
    fn test_options_1080p() {
        let opts = DownloadOptions {
            quality: "1080".to_string(),
            audio_only: false,
            audio_format: "mp3".to_string(),
        };
        let args = opts.to_ytdlp_args();
        assert_eq!(args, vec!["-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]"]);
        assert_eq!(opts.quality_label(), "1080p");
    }

    #[test]
    fn test_options_720p() {
        let opts = DownloadOptions {
            quality: "720".to_string(),
            audio_only: false,
            audio_format: "mp3".to_string(),
        };
        let args = opts.to_ytdlp_args();
        assert!(args.contains(&"-f".to_string()));
        assert_eq!(opts.quality_label(), "720p");
    }

    #[test]
    fn test_options_audio_only_mp3() {
        let opts = DownloadOptions {
            quality: "best".to_string(),
            audio_only: true,
            audio_format: "mp3".to_string(),
        };
        let args = opts.to_ytdlp_args();
        assert_eq!(args, vec!["-x", "--audio-format", "mp3", "--audio-quality", "0"]);
        assert_eq!(opts.quality_label(), "audio-only (mp3)");
    }

    #[test]
    fn test_options_audio_only_flac() {
        let opts = DownloadOptions {
            quality: "best".to_string(),
            audio_only: true,
            audio_format: "flac".to_string(),
        };
        let args = opts.to_ytdlp_args();
        assert!(args.contains(&"--audio-format".to_string()));
        assert!(args.contains(&"flac".to_string()));
        assert_eq!(opts.quality_label(), "audio-only (flac)");
    }

    #[test]
    fn test_options_worst_quality() {
        let opts = DownloadOptions {
            quality: "worst".to_string(),
            audio_only: false,
            audio_format: "mp3".to_string(),
        };
        let args = opts.to_ytdlp_args();
        assert_eq!(args, vec!["-f", "worst"]);
        assert_eq!(opts.quality_label(), "worst");
    }

    #[test]
    fn test_options_default() {
        let opts = DownloadOptions::default();
        assert_eq!(opts.quality, "best");
        assert!(!opts.audio_only);
        assert_eq!(opts.audio_format, "mp3");
    }

    // ── اختبارات قوائم التشغيل ─────────────────────────────────

    #[test]
    fn test_parse_playlist_info() {
        let json = r#"{
            "title": "My Playlist",
            "uploader": "TestUser",
            "webpage_url": "https://youtube.com/playlist?list=PL123",
            "playlist_count": 3,
            "entries": [
                {"url": "https://youtube.com/watch?v=a", "title": "Video A", "duration": 120.0, "id": "a"},
                {"url": "https://youtube.com/watch?v=b", "title": "Video B", "duration": 240.0, "id": "b"},
                {"url": "https://youtube.com/watch?v=c", "title": "Video C", "duration": 360.0, "id": "c"}
            ]
        }"#;
        let result = try_parse_playlist_info(json);
        assert!(result.is_some());
        let info = result.unwrap();
        assert_eq!(info.title, Some("My Playlist".to_string()));
        assert_eq!(info.playlist_count, Some(3));
        let entries = info.entries.unwrap();
        assert_eq!(entries.len(), 3);
        assert_eq!(entries[0].title, Some("Video A".to_string()));
    }
}

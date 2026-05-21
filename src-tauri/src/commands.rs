// src-tauri/src/commands.rs
// ═══════════════════════════════════════════════════════════════
// بوابة IPC — الأوامر المُتاحة للواجهة الأمامية
//
// يدعم:
// - تحميل فيديو فردي بأي جودة أو صوت فقط
// - تحميل قوائم تشغيل كاملة
// - إلغاء / حذف / تنظيف
// ═══════════════════════════════════════════════════════════════

use std::sync::Arc;
use uuid::Uuid;

use crate::core::downloader;
use crate::core::parser::{DownloadOptions, MediaInfo};
use crate::db::queries;
use crate::error::AppError;
use crate::state::AppState;

// ═══════════════════════════════════════════════════════════════
//  أمر بدء تحميل فيديو فردي (مع خيارات الجودة)
// ═══════════════════════════════════════════════════════════════

/// يُنظِّف بيانات MediaInfo الواردة من الواجهة قبل حفظها في DB:
/// - يُحدِّد العنوان بـ 500 حرف
/// - يُحدِّد اسم الرافع بـ 200 حرف
/// - يتحقق من أن الـ thumbnail رابط http/https صالح
/// - يُحدِّد امتداد الملف بـ 20 حرف
fn sanitize_media_info(info: &mut MediaInfo) {
    if let Some(ref t) = info.title {
        info.title = Some(t.chars().take(500).collect());
    }
    if let Some(ref u) = info.uploader {
        info.uploader = Some(u.chars().take(200).collect());
    }
    if let Some(ref thumb) = info.thumbnail {
        if let Ok(parsed) = url::Url::parse(thumb) {
            match parsed.scheme() {
                "https" | "http" => {
                    info.thumbnail = Some(thumb.chars().take(1024).collect());
                }
                _ => info.thumbnail = None,
            }
        } else {
            info.thumbnail = None;
        }
    }
    if let Some(ref ext) = info.ext {
        info.ext = Some(ext.chars().take(20).collect());
    }
}

/// يبدأ تحميل فيديو فردي مع خيارات ديناميكية.
///
/// ## المعاملات من الواجهة:
/// - `url`: رابط الفيديو
/// - `options`: خيارات الجودة والصوت
/// - `metadata`: بيانات وصفية مُجلبة مسبقاً (اختيارية)
///
/// ## الإرجاع:
/// - `Ok(task_id)`: معرف المهمة (UUID)
/// - `Err(AppError)`: خطأ في الإدخال أو DB
#[tauri::command]
pub async fn start_download(
    url: String,
    options: Option<DownloadOptions>,
    metadata: Option<MediaInfo>,
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<String, AppError> {
    // التحقق من المدخلات وصحة الرابط بصرامة لمنع ثغرات الحقن والروابط الخبيثة
    let url = url.trim().to_string();
    validate_url(&url)?;

    // استخدام الخيارات المُرسلة أو الافتراضية
    let opts = options.unwrap_or_default();

    let mut metadata = metadata;
    if let Some(ref mut info) = metadata {
        sanitize_media_info(info);
    }

    let task_id = Uuid::new_v4().to_string();
    let platform = detect_platform(&url);

    // إدراج في DB مع الجودة المطلوبة
    queries::insert_download_with_options(
        &state.db_pool,
        &task_id,
        &url,
        &platform,
        &opts.quality_label(),
    ).await?;

    // تسجيل Token وإطلاق المهمة
    let token = tokio_util::sync::CancellationToken::new();
    state.register_task(&task_id, token.clone());
    let state_clone = Arc::clone(&state);
    let task_id_clone = task_id.clone();
    let app_handle_clone = app_handle.clone();

    tokio::spawn(async move {
        downloader::run_download(
            app_handle_clone,
            state_clone,
            task_id_clone,
            url,
            opts,
            token,
            false, // لا نتخطى جلب البيانات الوصفية مبكراً للفيديو الفردي
            metadata,
        ).await;
    });

    Ok(task_id)
}

// ═══════════════════════════════════════════════════════════════
//  أمر بدء تحميل قائمة تشغيل
// ═══════════════════════════════════════════════════════════════

/// يبدأ تحميل قائمة تشغيل كاملة.
///
/// ## الآلية:
/// 1. يُنشئ سجل `collection` في قاعدة البيانات
/// 2. يستدعي yt-dlp لاستخراج قائمة الفيديوهات
/// 3. يُطلق تحميل كل فيديو بنفس خيارات الجودة
///
/// ## الإرجاع:
/// - `Ok(collection_id)`: معرف المجموعة (UUID)
#[tauri::command]
pub async fn start_playlist_download(
    url: String,
    options: Option<DownloadOptions>,
    selected_indices: Option<Vec<usize>>,
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<String, AppError> {
    // التحقق من المدخلات وصحة الرابط بصرامة لمنع ثغرات الحقن والروابط الخبيثة
    let url = url.trim().to_string();
    validate_url(&url)?;

    let opts = options.unwrap_or_default();
    let collection_id = Uuid::new_v4().to_string();
    let platform = detect_platform(&url);

    // إنشاء سجل المجموعة في DB
    queries::insert_collection(
        &state.db_pool,
        &collection_id,
        &url,
        &platform,
    ).await?;

    // تسجيل Token للمجموعة (يُلغي جميع الفرعيات عند الإلغاء)
    let token = tokio_util::sync::CancellationToken::new();
    state.register_task(&collection_id, token.clone());
    let state_clone = Arc::clone(&state);
    let cid_clone = collection_id.clone();
    let app_handle_clone = app_handle.clone();

    tokio::spawn(async move {
        downloader::run_playlist_download(
            app_handle_clone,
            state_clone,
            cid_clone,
            url,
            opts,
            selected_indices,
            token,
        ).await;
    });

    Ok(collection_id)
}

// ═══════════════════════════════════════════════════════════════
//  أمر استخراج بيانات قائمة التشغيل (بدون تحميل)
// ═══════════════════════════════════════════════════════════════

/// يستخرج معلومات الفيديوهات المكونة لقائمة التشغيل بدون تحميلها.
#[tauri::command]
pub async fn fetch_playlist_info(
    url: String,
    app_handle: tauri::AppHandle,
) -> Result<crate::core::parser::PlaylistInfo, AppError> {
    let url = url.trim().to_string();
    validate_url(&url)?;

    let info = downloader::fetch_playlist_info(&app_handle, &url).await?;
    Ok(info)
}

// ═══════════════════════════════════════════════════════════════
//  بيانات تفاصيل المحتوى والجودات والأحجام التقريبية
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, serde::Serialize)]
pub struct QualityInfo {
    pub label: String,
    pub height: i32,
    pub size_bytes: i64,
}

#[derive(Debug, serde::Serialize)]
pub struct MediaDetails {
    pub title: String,
    pub is_playlist: bool,
    pub total_duration: f64,
    pub max_height: i32,
    pub qualities: Vec<QualityInfo>,
    pub media_info: Option<MediaInfo>,
}

/// يستخرج تفاصيل المحتوى والجودات والأحجام التقريبية لكل جودة.
#[tauri::command]
pub async fn fetch_media_details(
    url: String,
    app_handle: tauri::AppHandle,
) -> Result<MediaDetails, AppError> {
    use crate::core::downloader::resolve_ffmpeg_path;
    use tauri_plugin_shell::ShellExt;

    let url = url.trim().to_string();
    validate_url(&url)?;

    let has_single_video_marker = url.contains("watch?v=") || url.contains("youtu.be/");
    let is_playlist_link = (url.contains("list=") || url.contains("playlist") || url.contains("/sets/"))
        && !has_single_video_marker;

    if is_playlist_link {
        // جلب بيانات قائمة التشغيل
        let info = downloader::fetch_playlist_info(&app_handle, &url).await?;
        let title = info.title.unwrap_or_else(|| "قائمة تشغيل".to_string());
        
        let mut total_duration = 0.0;
        if let Some(entries) = info.entries {
            for entry in entries {
                if let Some(dur) = entry.duration {
                    total_duration += dur;
                }
            }
        }

        // إنشاء الأحجام التقديرية لكل جودة مستهدفة
        let mut qualities = Vec::new();
        let target_heights = [
            ("360p", 360, 40_000),
            ("480p", 480, 80_000),
            ("720p", 720, 150_000),
            ("1080p", 1080, 300_000),
            ("2K", 1440, 600_000),
            ("4K", 2160, 1_500_000),
        ];

        for (label, height, bps) in target_heights {
            let size_bytes = (total_duration * bps as f64) as i64;
            qualities.push(QualityInfo {
                label: label.to_string(),
                height,
                size_bytes,
            });
        }

        Ok(MediaDetails {
            title,
            is_playlist: true,
            total_duration,
            max_height: 2160,
            qualities,
            media_info: None,
        })
    } else {
        // جلب بيانات فيديو فردي باستخدام --dump-json
        let ffmpeg_location = resolve_ffmpeg_path(&app_handle)?;
        let shell = app_handle.shell();
        let output = shell
            .sidecar("yt-dlp")
            .map_err(|e| AppError::SidecarError(format!("فشل إنشاء Sidecar: {}", e)))?
            .args([
                "--dump-json",
                "--no-download",
                "--no-playlist",
                "--no-warnings",
                "--ffmpeg-location", &ffmpeg_location,
                &url,
            ])
            .output()
            .await
            .map_err(|e| AppError::SidecarError(format!("فشل تشغيل yt-dlp: {}", e)))?;

        if output.status.code() != Some(0) {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::SidecarError(format!(
                "فشل جلب البيانات: {}", stderr
            )));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let json: serde_json::Value = serde_json::from_str(&stdout)
            .map_err(|e| AppError::SerializationError(e))?;

        let title = json["title"].as_str().unwrap_or("فيديو").to_string();
        let duration = json["duration"].as_f64().unwrap_or(0.0);
        let max_height = json["height"].as_i64().unwrap_or(1080) as i32;

        let mut qualities = Vec::new();
        let target_heights = [
            ("360p", 360, 40_000),
            ("480p", 480, 80_000),
            ("720p", 720, 150_000),
            ("1080p", 1080, 300_000),
            ("2K", 1440, 600_000),
            ("4K", 2160, 1_500_000),
        ];

        let formats = json["formats"].as_array();

        for (label, height, bps) in target_heights {
            let mut found_size: Option<i64> = None;
            if let Some(formats_arr) = formats {
                let mut best_v_size = 0;
                let mut best_a_size = 0;
                for fmt in formats_arr {
                    let f_height = fmt["height"].as_i64().unwrap_or(0) as i32;
                    let vcodec = fmt["vcodec"].as_str().unwrap_or("none");
                    let acodec = fmt["acodec"].as_str().unwrap_or("none");
                    let size = fmt["filesize"].as_i64()
                        .or_else(|| fmt["filesize_approx"].as_i64())
                        .unwrap_or(0);

                    if f_height == height && vcodec != "none" {
                        if size > best_v_size {
                            best_v_size = size;
                        }
                    }
                    if vcodec == "none" && acodec != "none" {
                        if size > best_a_size {
                            best_a_size = size;
                        }
                    }
                }
                if best_v_size > 0 {
                    found_size = Some(best_v_size + best_a_size);
                }
            }

            let size_bytes = found_size.unwrap_or_else(|| (duration * bps as f64) as i64);

            qualities.push(QualityInfo {
                label: label.to_string(),
                height,
                size_bytes,
            });
        }

        let media_info = crate::core::parser::try_parse_media_info(&stdout);

        Ok(MediaDetails {
            title,
            is_playlist: false,
            total_duration: duration,
            max_height,
            qualities,
            media_info,
        })
    }
}

// ═══════════════════════════════════════════════════════════════
//  أمر إلغاء التحميل
// ═══════════════════════════════════════════════════════════════

/// يُلغي تحميلاً نشطاً أو قائمة تشغيل نشطة عبر معرفها.
#[tauri::command]
pub fn cancel_download(
    task_id: String,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<(), AppError> {
    match state.active_tasks.get(&task_id) {
        Some(entry) => {
            entry.value().cancel();
            Ok(())
        }
        None => Err(AppError::TaskNotFound(task_id)),
    }
}

// ═══════════════════════════════════════════════════════════════
//  أمر إلغاء جميع التحميلات
// ═══════════════════════════════════════════════════════════════

/// يُلغي جميع التحميلات النشطة — يُستدعى عند إغلاق التطبيق.
#[tauri::command]
pub fn cancel_all_downloads(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<(), AppError> {
    state.cancel_all();
    Ok(())
}

// ═══════════════════════════════════════════════════════════════
//  أوامر الاستعراض
// ═══════════════════════════════════════════════════════════════

/// يُرجع سجل التحميلات مع دعم الصفحات (Pagination).
#[tauri::command]
pub async fn get_download_history(
    limit: Option<i64>,
    offset: Option<i64>,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<Vec<queries::DownloadRecord>, AppError> {
    queries::get_all_downloads(&state.db_pool, limit.unwrap_or(50), offset.unwrap_or(0)).await
}

/// يُرجع سجل جميع المجموعات/قوائم التشغيل (آخر 100 سجل) مرتبة من الأحدث.
#[tauri::command]
pub async fn get_collection_history(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<Vec<queries::CollectionRecord>, AppError> {
    queries::get_all_collections(&state.db_pool).await
}

/// يُرجع قائمة التحميلات النشطة (pending أو downloading).
#[tauri::command]
pub async fn get_active_downloads(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<Vec<queries::DownloadRecord>, AppError> {
    queries::get_active_downloads(&state.db_pool).await
}

// ═══════════════════════════════════════════════════════════════
//  أوامر الحذف
// ═══════════════════════════════════════════════════════════════

/// يحذف سجل تحميل من قاعدة البيانات.
/// إذا كان التحميل نشطاً، يُلغيه أولاً ثم يحذفه.
#[tauri::command]
pub async fn delete_download(
    task_id: String,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<(), AppError> {
    if let Some(entry) = state.active_tasks.get(&task_id) {
        entry.value().cancel();
    }
    queries::delete_download(&state.db_pool, &task_id).await
}

/// يحذف سجل مجموعة (قائمة تشغيل) وجميع تحميلاتها من قاعدة البيانات.
/// إذا كانت المجموعة نشطة، يُلغي مهامها أولاً.
#[tauri::command]
pub async fn delete_collection(
    collection_id: String,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<(), AppError> {
    // 1. إلغاء المهمة النشطة للمجموعة (والتي بدورها تلغي المهام الفرعية عبر Cancellation Token الأب)
    if let Some(entry) = state.active_tasks.get(&collection_id) {
        entry.value().cancel();
    }

    // 2. إلغاء أي مهام فرعية نشطة بشكل منفصل للاحتياط
    let child_ids: Vec<String> = sqlx::query_scalar("SELECT id FROM downloads WHERE collection_id = ?")
        .bind(&collection_id)
        .fetch_all(&state.db_pool)
        .await?;

    for child_id in child_ids {
        if let Some(entry) = state.active_tasks.get(&child_id) {
            entry.value().cancel();
        }
    }

    // 3. حذف من قاعدة البيانات
    queries::delete_collection(&state.db_pool, &collection_id).await
}

/// يحذف جميع سجلات التحميلات المكتملة من قاعدة البيانات.
#[tauri::command]
pub async fn clear_completed_downloads(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<u64, AppError> {
    queries::clear_completed(&state.db_pool).await
}

/// يلغي جميع التحميلات النشطة ويحذف كافة السجلات من قاعدة البيانات بالكامل.
#[tauri::command]
pub async fn clear_all_downloads(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<u64, AppError> {
    // 1. إلغاء كافة المهام النشطة
    state.cancel_all();

    // 2. مسح قاعدة البيانات
    queries::clear_all(&state.db_pool).await
}

// ═══════════════════════════════════════════════════════════════
//  دوال مساعدة
// ═══════════════════════════════════════════════════════════════

/// يستنتج المنصة من الرابط (تقريبي — yt-dlp يحدده بدقة لاحقاً)
pub fn detect_platform(url: &str) -> String {
    let parsed = match url::Url::parse(url) {
        Ok(u) => u,
        Err(_) => return "other".to_string(),
    };

    let host = match parsed.host_str() {
        Some(h) => h.to_lowercase(),
        None => return "other".to_string(),
    };

    if host.contains("youtube.com") || host.contains("youtu.be") {
        "youtube".to_string()
    } else if host.contains("twitter.com") || host.contains("x.com") {
        "twitter".to_string()
    } else if host.contains("tiktok.com") {
        "tiktok".to_string()
    } else if host.contains("instagram.com") {
        "instagram".to_string()
    } else if host.contains("facebook.com") || host.contains("fb.watch") {
        "facebook".to_string()
    } else if host.contains("twitch.tv") {
        "twitch".to_string()
    } else if host.contains("reddit.com") {
        "reddit".to_string()
    } else if host.contains("vimeo.com") {
        "vimeo".to_string()
    } else if host.contains("dailymotion.com") {
        "dailymotion".to_string()
    } else if host.contains("soundcloud.com") {
        "soundcloud".to_string()
    } else {
        "other".to_string()
    }
}

/// يتحقق من صحة الرابط بصرامة ويمنع ثغرات الـ SSRF وعناوين الشبكة المحلية
fn validate_url(url: &str) -> Result<(), AppError> {
    let parsed = url::Url::parse(url)
        .map_err(|_| AppError::InvalidUrl("الرابط المدخل غير صالح أو ذو صيغة خاطئة".into()))?;
    
    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return Err(AppError::InvalidUrl("يُسمح فقط بالروابط التي تبدأ بـ http أو https".into()));
    }
    
    if let Some(host) = parsed.host_str() {
        let lower = host.to_lowercase();
        if lower == "localhost"
            || lower == "127.0.0.1"
            || lower == "[::1]"
            || lower == "0.0.0.0"
            || lower.starts_with("192.168.")
            || lower.starts_with("10.")
            || lower.starts_with("172.16.")
            || lower.starts_with("172.17.")
            || lower.starts_with("172.18.")
            || lower.starts_with("172.19.")
            || lower.starts_with("172.2")
            || lower.starts_with("172.3")
        {
            return Err(AppError::InvalidUrl("الروابط المحلية أو الداخلية غير مسموح بها لأسباب أمنية".into()));
        }
    }
    
    Ok(())
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct AppConfigDto {
    pub download_path: String,
    pub concurrent_fragments: u8,
    pub http_chunk_size_mb: u8,
    pub max_concurrent_downloads: usize,
}

/// يُرجع الإعدادات الحالية للواجهة
#[tauri::command]
pub async fn get_app_config(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<AppConfigDto, AppError> {
    let config = state.config.read().await;
    Ok(AppConfigDto {
        download_path: config.default_download_path.to_string_lossy().into_owned(),
        concurrent_fragments: config.concurrent_fragments,
        http_chunk_size_mb: config.http_chunk_size_mb,
        max_concurrent_downloads: config.max_concurrent_downloads,
    })
}

/// يُحدِّث الإعدادات من الواجهة
#[tauri::command]
pub async fn update_app_config(
    new_config: AppConfigDto,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<(), AppError> {
    let new_path = std::path::PathBuf::from(&new_config.download_path);
    
    // التحقق من أن المجلد موجود أو يمكن إنشاؤه
    if !new_path.exists() {
        tokio::fs::create_dir_all(&new_path).await
            .map_err(|e| AppError::IoError(e))?;
    }
    
    // التحقق من أن القيم في نطاق معقول
    if new_config.concurrent_fragments == 0 || new_config.concurrent_fragments > 32 {
        return Err(AppError::Internal("concurrent_fragments يجب أن يكون بين 1 و32".into()));
    }
    if new_config.http_chunk_size_mb == 0 || new_config.http_chunk_size_mb > 100 {
        return Err(AppError::Internal("http_chunk_size_mb يجب أن يكون بين 1 و100".into()));
    }
    
    // 1. Update the database settings
    queries::set_setting(&state.db_pool, "default_download_path", &new_config.download_path).await?;
    queries::set_setting(&state.db_pool, "concurrent_fragments", &new_config.concurrent_fragments.to_string()).await?;
    queries::set_setting(&state.db_pool, "http_chunk_size_mb", &new_config.http_chunk_size_mb.to_string()).await?;
    queries::set_setting(&state.db_pool, "max_concurrent_downloads", &new_config.max_concurrent_downloads.to_string()).await?;

    // 2. Update config RwLock in AppState
    {
        let mut config = state.config.write().await;
        config.default_download_path = new_path;
        config.concurrent_fragments = new_config.concurrent_fragments;
        config.http_chunk_size_mb = new_config.http_chunk_size_mb;
        config.max_concurrent_downloads = new_config.max_concurrent_downloads;
    }
    
    // 3. Update download semaphore dynamically
    {
        let mut sem_guard = state.download_semaphore.write().await;
        *sem_guard = Arc::new(tokio::sync::Semaphore::new(new_config.max_concurrent_downloads));
    }
    
    Ok(())
}

/// يفتح نافذة اختيار مجلد
#[tauri::command]
pub async fn pick_download_folder(
    app_handle: tauri::AppHandle,
) -> Result<Option<String>, AppError> {
    use tauri_plugin_dialog::DialogExt;
    let folder = app_handle.dialog()
        .file()
        .blocking_pick_folder();
    
    if let Some(file_path) = folder {
        if let Ok(path_buf) = file_path.into_path() {
            return Ok(Some(path_buf.to_string_lossy().into_owned()));
        }
    }
    Ok(None)
}


#[derive(Debug, serde::Serialize)]
pub struct DbStats {
    pub total_downloads: i64,
    pub completed_downloads: i64,
    pub failed_downloads: i64,
    pub total_playlists: i64,
}

#[tauri::command]
pub async fn get_db_stats(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<DbStats, AppError> {
    let total_downloads: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM downloads")
        .fetch_one(&state.db_pool)
        .await?;
        
    let completed_downloads: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM downloads WHERE status = 'completed'")
        .fetch_one(&state.db_pool)
        .await?;

    let failed_downloads: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM downloads WHERE status = 'failed'")
        .fetch_one(&state.db_pool)
        .await?;

    let total_playlists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM collections")
        .fetch_one(&state.db_pool)
        .await?;

    Ok(DbStats {
        total_downloads,
        completed_downloads,
        failed_downloads,
        total_playlists,
    })
}

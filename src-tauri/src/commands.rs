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
use crate::core::parser::DownloadOptions;
use crate::db::queries;
use crate::error::AppError;
use crate::state::AppState;

// ═══════════════════════════════════════════════════════════════
//  أمر بدء تحميل فيديو فردي (مع خيارات الجودة)
// ═══════════════════════════════════════════════════════════════

/// يبدأ تحميل فيديو فردي مع خيارات ديناميكية.
///
/// ## المعاملات من الواجهة:
/// - `url`: رابط الفيديو
/// - `options`: خيارات الجودة والصوت (اختيارية — تستخدم الافتراضية إن لم تُحدد)
///
/// ## الإرجاع:
/// - `Ok(task_id)`: معرف المهمة (UUID)
/// - `Err(AppError)`: خطأ في الإدخال أو DB
#[tauri::command]
pub async fn start_download(
    url: String,
    options: Option<DownloadOptions>,
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<String, AppError> {
    // التحقق من المدخلات وصحة الرابط بصرامة لمنع ثغرات الحقن والروابط الخبيثة
    let url = url.trim().to_string();
    validate_url(&url)?;

    // استخدام الخيارات المُرسلة أو الافتراضية
    let opts = options.unwrap_or_default();

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
            token,
        ).await;
    });

    Ok(collection_id)
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

/// يحذف جميع سجلات التحميلات المكتملة من قاعدة البيانات.
#[tauri::command]
pub async fn clear_completed_downloads(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<u64, AppError> {
    queries::clear_completed(&state.db_pool).await
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

/// يتحقق من صحة الرابط بصرامة
fn validate_url(url: &str) -> Result<(), AppError> {
    let parsed = url::Url::parse(url)
        .map_err(|_| AppError::InvalidUrl("الرابط المدخل غير صالح أو ذو صيغة خاطئة".into()))?;
    
    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return Err(AppError::InvalidUrl("يُسمح فقط بالروابط التي تبدأ بـ http أو https".into()));
    }
    
    Ok(())
}

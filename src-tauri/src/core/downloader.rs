// src-tauri/src/core/downloader.rs
// ═══════════════════════════════════════════════════════════════
// محرك التحميل الأساسي — يدير دورة حياة عملية yt-dlp بالكامل
//
// يدعم:
// 1. تحميل فيديو بأي جودة (best, 4K, 1080p, 720p, 480p, 360p)
// 2. استخراج الصوت فقط (mp3, m4a, opus, wav, flac)
// 3. تحميل قوائم التشغيل (Playlists) كاملة
// 4. Throttling للتحديثات (250ms)
// 5. الإلغاء عبر CancellationToken
// 6. تنظيف الحالة إلزامي في جميع مسارات الخروج
// ═══════════════════════════════════════════════════════════════

use std::sync::Arc;

use tauri::{AppHandle, Manager};
use tauri::Emitter;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tokio::sync::mpsc::Receiver;
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

use crate::core::parser::{
    try_parse_media_info, try_parse_progress, try_parse_playlist_info,
    CompletedData, DownloadOptions, FailedData, PlaylistStartedData, ProgressData, MediaInfo,
};
use crate::db::queries;
use crate::error::AppError;
use crate::state::AppState;

// ═══════════════════════════════════════════════════════════════
//  ثوابت التكوين
// ═══════════════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════════════
//  محرك تحميل الفيديو الفردي
// ═══════════════════════════════════════════════════════════════

/// يُطلق عملية تحميل فيديو واحد مع دعم الجودة والصوت.
///
/// # ضمانات الأمان
/// - `cleanup_task()` يُنفَّذ دائماً عند الخروج
/// - لا `unwrap()` أو `expect()` في أي مسار
/// - جميع أحداث `emit()` تستخدم `let _ =` لتجاهل فشل الإرسال
pub async fn run_download(
    app_handle: AppHandle,
    state: Arc<AppState>,
    task_id: String,
    url: String,
    options: DownloadOptions,
    token: CancellationToken,
    skip_prefetch: bool,
    metadata: Option<MediaInfo>,
) {
    // ── المرحلة 1: الحصول على تصريح من الـ Semaphore ─────────
    let semaphore = {
        let sem_guard = state.download_semaphore.read().await;
        sem_guard.clone()
    };

    let _permit = tokio::select! {
        result = semaphore.acquire() => {
            match result {
                Ok(permit) => permit,
                Err(_) => {
                    eprintln!("[download engine] فشل الحصول على تصريح Semaphore: task={}", task_id);
                    let _ = queries::set_error(&state.db_pool, &task_id, "فشل داخلي في إدارة التزامن").await;
                    let _ = app_handle.emit("download-failed", FailedData {
                        task_id: task_id.clone(),
                        error: "فشل داخلي في إدارة التزامن".to_string(),
                    });
                    state.cleanup_task(&task_id);
                    return;
                }
            }
        }
        _ = token.cancelled() => {
            let _ = queries::update_status(&state.db_pool, &task_id, "cancelled").await;
            let _ = app_handle.emit("download-cancelled", &task_id);
            state.cleanup_task(&task_id);
            return;
        }
    };

    // ── المرحلة 2: جلب البيانات الوصفية مسبقاً (Prefetch Metadata) ──
    if token.is_cancelled() {
        let _ = queries::update_status(&state.db_pool, &task_id, "cancelled").await;
        let _ = app_handle.emit("download-cancelled", &task_id);
        state.cleanup_task(&task_id);
        return;
    }

    let _media_info = if let Some(info) = metadata {
        let duration_i64 = info.duration.map(|d| d as i64);
        let file_size = info.filesize.or(info.filesize_approx);

        let _ = queries::update_metadata(
            &state.db_pool,
            &task_id,
            info.title.as_deref(),
            info.uploader.as_deref(),
            info.thumbnail.as_deref(),
            duration_i64,
            info.ext.as_deref(),
            file_size,
        ).await;

        let _ = app_handle.emit("download-metadata", crate::core::parser::MetadataUpdatedData {
            task_id: task_id.clone(),
            info: info.clone(),
        });
        Some(info)
    } else if skip_prefetch {
        None
    } else {
        let _ = app_handle.emit("download-progress", ProgressData {
            task_id: task_id.clone(),
            percent: None,
            speed: None,
            eta: None,
            status: "fetching_metadata".to_string(),
        });

        match prefetch_metadata(&app_handle, &url).await {
            Ok(info) => {
                let duration_i64 = info.duration.map(|d| d as i64);
                let file_size = info.filesize.or(info.filesize_approx);

                let _ = queries::update_metadata(
                    &state.db_pool,
                    &task_id,
                    info.title.as_deref(),
                    info.uploader.as_deref(),
                    info.thumbnail.as_deref(),
                    duration_i64,
                    info.ext.as_deref(),
                    file_size,
                ).await;

                let _ = app_handle.emit("download-metadata", crate::core::parser::MetadataUpdatedData {
                    task_id: task_id.clone(),
                    info: info.clone(),
                });
                Some(info)
            }
            Err(e) => {
                eprintln!("[download engine] فشل جلب البيانات الوصفية مسبقاً: {}", e);
                None
            }
        }
    };

    // ── المرحلة 3: إطلاق Sidecar yt-dlp ───────────────────────
    if token.is_cancelled() {
        let _ = queries::update_status(&state.db_pool, &task_id, "cancelled").await;
        let _ = app_handle.emit("download-cancelled", &task_id);
        state.cleanup_task(&task_id);
        return;
    }

    let spawn_result = spawn_ytdlp(&app_handle, &url, &options, &state).await;

    let (rx, child) = match spawn_result {
        Ok(pair) => pair,
        Err(e) => {
            eprintln!("[download engine] فشل إطلاق yt-dlp: {}", e);
            let _ = queries::set_error(&state.db_pool, &task_id, &e.to_string()).await;
            let _ = app_handle.emit("download-failed", FailedData {
                task_id: task_id.clone(),
                error: e.to_string(),
            });
            state.cleanup_task(&task_id);
            return;
        }
    };

    // ── المرحلة 4: تحديث الحالة إلى downloading ──────────────
    if let Err(e) = queries::update_status(&state.db_pool, &task_id, "downloading").await {
        eprintln!("[download engine] فشل تحديث حالة DB: {}", e);
    }

    let detected_path = Arc::new(std::sync::Mutex::new(None));

    // ── المرحلة 5: حلقة معالجة الأحداث (Event Loop) ──────────
    let result: Result<(), AppError> = tokio::select! {
        _ = token.cancelled() => {
            let path_opt = {
                let p = detected_path.lock().unwrap();
                p.clone()
            };
            handle_cancellation(&app_handle, &state, &task_id, child, path_opt).await
        }
        result = process_event_stream(rx, &app_handle, &state, &task_id, Arc::clone(&detected_path)) => {
            result
        }
    };

    // ── المرحلة 6: التنظيف الإلزامي ─────────────────────────
    state.cleanup_task(&task_id);

    if let Err(e) = result {
        eprintln!("[download engine error] task={}: {}", task_id, e);
    }
    // _permit يُسقط تلقائياً هنا → يحرر مكاناً في الـ Semaphore
}

// ═══════════════════════════════════════════════════════════════
//  محرك تحميل قوائم التشغيل (Playlists)
// ═══════════════════════════════════════════════════════════════

/// يُحلل قائمة تشغيل ثم يُطلق تحميل كل عنصر فيها.
///
/// ## الآلية:
/// 1. يستدعي `yt-dlp --flat-playlist --dump-single-json` للحصول على قائمة الفيديوهات
/// 2. يُنشئ سجل `collection` في قاعدة البيانات
/// 3. يُطلق تحميل كل فيديو عبر `run_download` مع ربطه بالمجموعة
/// 4. يُبلغ الواجهة بعدد العناصر ومعرفات المهام
pub async fn run_playlist_download(
    app_handle: AppHandle,
    state: Arc<AppState>,
    collection_id: String,
    url: String,
    options: DownloadOptions,
    selected_indices: Option<Vec<usize>>,
    token: CancellationToken,
) {
    // ── المرحلة 1: استخراج بيانات قائمة التشغيل ──────────────
    let playlist_result = fetch_playlist_info(&app_handle, &url).await;

    let playlist_info = match playlist_result {
        Ok(info) => info,
        Err(e) => {
            eprintln!("[playlist engine] فشل استخراج بيانات القائمة: {}", e);
            let _ = queries::update_collection_status(&state.db_pool, &collection_id, "failed").await;
            let _ = app_handle.emit("download-failed", FailedData {
                task_id: collection_id.clone(),
                error: format!("فشل تحليل قائمة التشغيل: {}", e),
            });
            state.cleanup_task(&collection_id);
            return;
        }
    };

    // ── المرحلة 2: استخراج الروابط من القائمة ─────────────────
    let entries = match playlist_info.entries {
        Some(entries) if !entries.is_empty() => entries,
        _ => {
            let _ = queries::update_collection_status(&state.db_pool, &collection_id, "failed").await;
            let _ = app_handle.emit("download-failed", FailedData {
                task_id: collection_id.clone(),
                error: "قائمة التشغيل فارغة أو لا تحتوي على عناصر".to_string(),
            });
            state.cleanup_task(&collection_id);
            return;
        }
    };

    // ── المرحلة 3: تحديث بيانات المجموعة في DB ───────────────
    let total_items = match &selected_indices {
        Some(indices) => indices.len() as i64,
        None => entries.len() as i64,
    };
    let _ = queries::update_collection_metadata(
        &state.db_pool,
        &collection_id,
        playlist_info.title.as_deref(),
        total_items,
    ).await;

    // ── المرحلة 4: إطلاق تحميل كل عنصر ──────────────────────
    let platform = crate::commands::detect_platform(&url);
    let mut task_ids: Vec<String> = Vec::with_capacity(entries.len());
    let mut child_handles = Vec::new();

    for (index, entry) in entries.iter().enumerate() {
        // تخطي الفيديوهات غير المحددة في الواجهة
        if let Some(ref indices) = selected_indices {
            if !indices.contains(&index) {
                continue;
            }
        }

        // التحقق من الإلغاء قبل كل عنصر
        if token.is_cancelled() {
            let _ = queries::update_collection_status(&state.db_pool, &collection_id, "cancelled").await;
            break;
        }

        // استخراج رابط الفيديو — بعض المنصات تعيد id فقط بدلاً من url
        let video_url = match &entry.url {
            Some(u) if !u.is_empty() => u.clone(),
            _ => match &entry.id {
                Some(id) => {
                    if platform == "youtube" {
                        format!("https://www.youtube.com/watch?v={}", id)
                    } else if platform == "vimeo" {
                        format!("https://vimeo.com/{}", id)
                    } else {
                        id.clone()
                    }
                }
                None => continue, // تخطي العناصر بدون رابط
            },
        };

        let task_id = Uuid::new_v4().to_string();

        // إدراج في DB مع ربط بالمجموعة
        if let Err(e) = queries::insert_download_with_collection(
            &state.db_pool,
            &task_id,
            &video_url,
            &platform,
            Some(&collection_id),
            entry.title.as_deref(),
            &options.quality_label(),
            index as i64,
        ).await {
            eprintln!("[playlist engine] فشل إدراج عنصر {}: {}", index, e);
            continue;
        }

        // تسجيل Token فرعي متفرع من الـ token الأب للمجموعة (يُلغى تلقائياً إذا أُلغي الأب)
        let child_token = token.child_token();
        state.register_task(&task_id, child_token.clone());

        let app_clone = app_handle.clone();
        let state_clone = Arc::clone(&state);
        let opts_clone = options.clone();
        let tid_clone = task_id.clone();

        let handle = tokio::spawn(async move {
            run_download(app_clone, state_clone, tid_clone, video_url, opts_clone, child_token, true, None).await;
        });
        child_handles.push(handle);

        task_ids.push(task_id);
    }

    // ── المرحلة 5: إبلاغ الواجهة ─────────────────────────────
    let _ = queries::update_collection_status(&state.db_pool, &collection_id, "downloading").await;

    let _ = app_handle.emit("playlist-started", PlaylistStartedData {
        collection_id: collection_id.clone(),
        title: playlist_info.title,
        total_items,
        task_ids,
    });

    // مراقبة انتهاء جميع التحميلات الفرعية وتنظيف Token المجموعة بشكل غير متزامن مع دعم الإغلاق الفوري
    let state_clone = Arc::clone(&state);
    let cid_clone = collection_id.clone();
    let shutdown = state.shutdown_token.clone();
    tokio::spawn(async move {
        tokio::select! {
            _ = shutdown.cancelled() => {
                // التطبيق يُغلق — تنظيف فوري
                state_clone.cleanup_task(&cid_clone);
            }
            _ = futures::future::join_all(child_handles) => {
                // 1. تحديث حالة المجموعة بناءً على حالة عناصرها الفرعية في قاعدة البيانات
                let status = match queries::get_collection_aggregate_status(&state_clone.db_pool, &cid_clone).await {
                    Ok(s) => s,
                    Err(_) => "completed".to_string(),
                };
                let _ = queries::update_collection_status(&state_clone.db_pool, &cid_clone, &status).await;

                // 2. تنظيف Token المجموعة من الذاكرة لضمان عدم تسريب الموارد
                state_clone.cleanup_task(&cid_clone);
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════════
//  استخراج بيانات قائمة التشغيل
// ═══════════════════════════════════════════════════════════════

/// يستدعي yt-dlp بوضع --flat-playlist لاستخراج قائمة الفيديوهات
/// بدون تحميلها فعلياً. يُرجع PlaylistInfo مع جميع العناصر.
pub async fn fetch_playlist_info(
    app_handle: &AppHandle,
    url: &str,
) -> Result<crate::core::parser::PlaylistInfo, AppError> {
    let ffmpeg_location = resolve_ffmpeg_path(app_handle)?;
    let shell = app_handle.shell();

    let output = shell
        .sidecar("yt-dlp")
        .map_err(|e| AppError::SidecarError(format!("فشل إنشاء أمر Sidecar: {}", e)))?
        .args([
            "--flat-playlist",
            "--dump-single-json",
            "--no-warnings",
            "--ffmpeg-location", &ffmpeg_location,
            url,
        ])
        .output()
        .await
        .map_err(|e| AppError::SidecarError(format!("فشل تنفيذ yt-dlp: {}", e)))?;

    if output.status.code() != Some(0) {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::SidecarError(format!(
            "yt-dlp أرجع كود خطأ {:?}: {}",
            output.status.code(), stderr
        )));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    try_parse_playlist_info(&stdout)
        .ok_or_else(|| AppError::Internal("فشل تحليل بيانات قائمة التشغيل من yt-dlp".into()))
}

/// جلب البيانات الوصفية للمحتوى مسبقاً وبسرعة (< 1 ثانية) دون تحميل الفيديو
async fn prefetch_metadata(
    app_handle: &AppHandle,
    url: &str,
) -> Result<MediaInfo, AppError> {
    let ffmpeg_location = resolve_ffmpeg_path(app_handle)?;
    let shell = app_handle.shell();
    
    let output = shell
        .sidecar("yt-dlp")
        .map_err(|e| AppError::SidecarError(format!("فشل إنشاء أمر Sidecar: {}", e)))?
        .args([
            "--dump-json",
            "--no-download",
            "--no-playlist",
            "--no-warnings",
            "--ffmpeg-location", &ffmpeg_location,
            url,
        ])
        .output()
        .await
        .map_err(|e| AppError::SidecarError(format!("فشل تشغيل yt-dlp: {}", e)))?;

    if output.status.code() != Some(0) {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::SidecarError(format!(
            "فشل جلب البيانات الوصفية كود خطأ {:?}: {}",
            output.status.code(), stderr
        )));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    try_parse_media_info(&stdout)
        .ok_or_else(|| AppError::Internal("فشل تحليل البيانات الوصفية من yt-dlp".into()))
}

// ═══════════════════════════════════════════════════════════════
//  إطلاق عملية yt-dlp الفرعية (مع خيارات ديناميكية)
// ═══════════════════════════════════════════════════════════════

/// يُنشئ ويُطلق عملية yt-dlp كـ Sidecar مع معاملات ديناميكية
/// تشمل الجودة والصيغة ووضع الصوت.
async fn spawn_ytdlp(
    app_handle: &AppHandle,
    url: &str,
    options: &DownloadOptions,
    state: &AppState,
) -> Result<(Receiver<CommandEvent>, CommandChild), AppError> {
    let ffmpeg_location = resolve_ffmpeg_path(app_handle)?;

    let (download_path, concurrent_fragments, http_chunk_size_mb) = {
        let config = state.config.read().await;
        (
            config.default_download_path.clone(),
            config.concurrent_fragments,
            config.http_chunk_size_mb,
        )
    };

    let output_template = format!(
        "{}/%(title)s.%(ext)s",
        download_path.to_string_lossy()
    );

    // ═══ بناء المعاملات ديناميكياً ═══
    let mut args: Vec<String> = vec![
        "--newline".to_string(),
        "--no-playlist".to_string(),
        "--no-warnings".to_string(),
        "--restrict-filenames".to_string(),
        // قالب JSON للتقدم
        "--progress-template".to_string(),
        r#"{"progress":"%(progress._percent_str)s","speed":"%(progress._speed_str)s","eta":"%(progress._eta_str)s"}"#.to_string(),
        // طباعة المسار النهائي الموثوق بعد انتهاء كافة المعالجات والنقل
        "--print".to_string(), "after_move:__OMNIDROP_FINAL_PATH__%(filepath)s".to_string(),
        // تحميل الأجزاء المتوازية لزيادة سرعة التحميل بشكل كبير
        "--concurrent-fragments".to_string(), concurrent_fragments.to_string(),
        // حجم الـ chunk المخصص لتقليل overhead الطلبات
        "--http-chunk-size".to_string(), format!("{}M", http_chunk_size_mb),
        // إعادة المحاولة الذكية مع Backoff تصاعدي
        "--retries".to_string(), "5".to_string(),
        "--fragment-retries".to_string(), "10".to_string(),
        "--retry-sleep".to_string(), "linear=1::2".to_string(),
        // ffmpeg المُحزَّم
        "--ffmpeg-location".to_string(), ffmpeg_location,
        // مسار الحفظ
        "-o".to_string(), output_template,
    ];

    // إضافة معاملات الجودة/الصوت الديناميكية
    args.extend(options.to_ytdlp_args());

    // الرابط يكون دائماً آخر معامل
    args.push(url.to_string());

    let shell = app_handle.shell();

    // تحويل Vec<String> إلى مراجع لـ .args()
    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    let (rx, child) = shell
        .sidecar("yt-dlp")
        .map_err(|e| AppError::SidecarError(format!("فشل إنشاء أمر Sidecar: {}", e)))?
        .args(&args_refs)
        .spawn()
        .map_err(|e| AppError::SidecarError(format!("فشل تشغيل yt-dlp: {}", e)))?;

    Ok((rx, child))
}

/// يحدد المسار الدقيق لملف ffmpeg التنفيذي أو مجلده (مع دعم Target Triple والمنصات المختلفة)
pub fn resolve_ffmpeg_path(app_handle: &AppHandle) -> Result<String, AppError> {
    let target_triple = match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "x86_64") => "x86_64-pc-windows-msvc",
        ("macos", "x86_64") => "x86_64-apple-darwin",
        ("macos", "aarch64") => "aarch64-apple-darwin",
        ("linux", "x86_64") => "x86_64-unknown-linux-gnu",
        (os, arch) => {
            return Err(AppError::Internal(format!(
                "المنصة غير مدعومة تلقائياً للـ Sidecars: {}-{}",
                os, arch
            )));
        }
    };

    let exe_suffix = if std::env::consts::OS == "windows" { ".exe" } else { "" };
    let ffmpeg_bin_name = format!("ffmpeg-{}{}", target_triple, exe_suffix);

    // 1. محاولة الحصول على مجلد الموارد (Resources Directory) الخاص بـ Tauri (للإنتاج)
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let binaries_ffmpeg = resource_dir.join("binaries").join(&ffmpeg_bin_name);
        if binaries_ffmpeg.exists() {
            return Ok(binaries_ffmpeg.to_string_lossy().into_owned());
        }
        let direct_ffmpeg = resource_dir.join(&ffmpeg_bin_name);
        if direct_ffmpeg.exists() {
            return Ok(direct_ffmpeg.to_string_lossy().into_owned());
        }
    }

    // 2. Fallback: استخدام مسار الملف التنفيذي الحالي (مثالي لبيئة التطوير tauri dev)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let local_ffmpeg = exe_dir.join(&ffmpeg_bin_name);
            if local_ffmpeg.exists() {
                return Ok(local_ffmpeg.to_string_lossy().into_owned());
            }
            let dev_ffmpeg = exe_dir.join("binaries").join(&ffmpeg_bin_name);
            if dev_ffmpeg.exists() {
                return Ok(dev_ffmpeg.to_string_lossy().into_owned());
            }
        }
    }

    // 3. Fallback الأخير: إرجاع المجلد فقط كخيار احترازي إذا فشل العثور على الملف بالتحديد
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let binaries_path = resource_dir.join("binaries");
        if binaries_path.exists() {
            return Ok(binaries_path.to_string_lossy().into_owned());
        }
        if resource_dir.exists() {
            return Ok(resource_dir.to_string_lossy().into_owned());
        }
    }

    let exe_path = std::env::current_exe()
        .map_err(|e| AppError::Internal(format!("فشل تحديد مسار التطبيق: {}", e)))?;

    let exe_dir = exe_path
        .parent()
        .ok_or_else(|| AppError::Internal("فشل تحديد مجلد التطبيق".into()))?;

    Ok(exe_dir.to_string_lossy().into_owned())
}

async fn process_event_stream(
    mut rx: Receiver<CommandEvent>,
    app_handle: &AppHandle,
    state: &AppState,
    task_id: &str,
    detected_path: Arc<std::sync::Mutex<Option<String>>>,
) -> Result<(), AppError> {
    let mut metadata_extracted = false;
    let mut detected_file_path: Option<String> = None;
    let mut stdout_buffer = Vec::new();

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                stdout_buffer.extend_from_slice(&line_bytes);
                while let Some(pos) = stdout_buffer.iter().position(|&b| b == b'\n' || b == b'\r') {
                    let line_bytes = stdout_buffer.drain(..=pos).collect::<Vec<u8>>();
                    let line = String::from_utf8_lossy(&line_bytes);
                    let line = line.trim();
                    if line.is_empty() {
                        continue;
                    }

                    // 1. محاولة استخراج البيانات الوصفية (مرة واحدة فقط)
                    if !metadata_extracted {
                        if let Some(info) = try_parse_media_info(&line) {
                            metadata_extracted = true;

                            let duration_i64 = info.duration.map(|d| d as i64);
                            let file_size = info.filesize.or(info.filesize_approx);

                            let _ = queries::update_metadata(
                                &state.db_pool,
                                task_id,
                                info.title.as_deref(),
                                info.uploader.as_deref(),
                                info.thumbnail.as_deref(),
                                duration_i64,
                                info.ext.as_deref(),
                                file_size,
                            ).await;

                            let _ = app_handle.emit("download-metadata", crate::core::parser::MetadataUpdatedData {
                                task_id: task_id.to_string(),
                                info: info.clone(),
                            });
                        }
                    }

                    // 2. محاولة تحليل بيانات التقدم وحفظها في البفر للـ Batching
                    if let Some(progress) = try_parse_progress(&line, task_id) {
                        let mut buffer = state.progress_buffer
                            .lock()
                            .unwrap_or_else(|e| e.into_inner());
                        buffer.insert(task_id.to_string(), progress);
                    }

                    // 3. الكشف عن بدء مرحلة المعالجة والدمج (Post-processing)
                    if line.contains("[Merger]") || line.contains("[ExtractAudio]") || line.contains("[VideoConvertor]") || line.contains("[Metadata]") {
                        let _ = queries::update_status(&state.db_pool, task_id, "processing").await;
                        let mut buffer = state.progress_buffer
                            .lock()
                            .unwrap_or_else(|e| e.into_inner());
                        buffer.insert(task_id.to_string(), ProgressData {
                            task_id: task_id.to_string(),
                            percent: Some("100%".to_string()),
                            speed: None,
                            eta: None,
                            status: "processing".to_string(),
                        });
                    }

                    // 4. محاولة استخراج مسار الملف النهائي من مخرجات yt-dlp
                    let mut path_to_set = None;
                    if let Some(pos) = line.find("__OMNIDROP_FINAL_PATH__") {
                        let path = line[pos + "__OMNIDROP_FINAL_PATH__".len()..].trim().to_string();
                        if !path.is_empty() {
                            path_to_set = Some(path);
                        }
                    } else if let Some(pos) = line.find("[download] Destination:") {
                        let path = line[pos + "[download] Destination:".len()..].trim().to_string();
                        if !path.is_empty() {
                            path_to_set = Some(path);
                        }
                    } else if let Some(pos) = line.find("[ExtractAudio] Destination:") {
                        let path = line[pos + "[ExtractAudio] Destination:".len()..].trim().to_string();
                        if !path.is_empty() {
                            path_to_set = Some(path);
                        }
                    } else if line.contains("Merging formats into") {
                        if let Some(start_quote) = line.find('"') {
                            if let Some(end_quote) = line.rfind('"') {
                                if end_quote > start_quote {
                                    let path = line[start_quote + 1..end_quote].to_string();
                                    if !path.is_empty() {
                                        path_to_set = Some(path);
                                    }
                                }
                            }
                        }
                    } else if let Some(pos) = line.find("has already been downloaded") {
                        let path = line[..pos].replace("[download]", "").trim().to_string();
                        if !path.is_empty() {
                            path_to_set = Some(path);
                        }
                    }

                    if let Some(path) = path_to_set {
                        detected_file_path = Some(path.clone());
                        if let Ok(mut lock) = detected_path.lock() {
                            *lock = Some(path);
                        }
                    }
                }
            }

            CommandEvent::Stderr(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes);
                eprintln!("[yt-dlp stderr] task={}: {}", task_id, line);
            }

            CommandEvent::Terminated(status) => {
                // إزالة التقدم المؤقت من الـ buffer لمنع تراكمه
                {
                    let mut buffer = state.progress_buffer
                        .lock()
                        .unwrap_or_else(|e| e.into_inner());
                    buffer.remove(task_id);
                }

                if status.code == Some(0) {
                    let _ = queries::update_status(&state.db_pool, task_id, "completed").await;
                    
                    if let Some(ref path) = detected_file_path {
                        let _ = queries::update_file_path(&state.db_pool, task_id, path).await;
                    }

                    let _ = app_handle.emit("download-completed", CompletedData {
                        task_id: task_id.to_string(),
                        title: None,
                        file_path: detected_file_path.clone(),
                    });
                } else if status.code == Some(1) {
                    // yt-dlp يُرجع 1 عند خطأ شبكة أو انقطاع
                    let error_msg = AppError::DownloadInterrupted(
                        "فقدان الاتصال أو انقطاع الشبكة".into()
                    ).to_string();
                    let _ = queries::set_error(&state.db_pool, task_id, &error_msg).await;
                    let _ = app_handle.emit("download-failed", FailedData {
                        task_id: task_id.to_string(),
                        error: error_msg,
                    });
                } else {
                    let err_msg = format!("انتهت العملية بكود خطأ: {:?}", status.code);
                    let _ = queries::set_error(&state.db_pool, task_id, &err_msg).await;
                    let _ = app_handle.emit("download-failed", FailedData {
                        task_id: task_id.to_string(),
                        error: err_msg,
                    });
                }
                break;
            }

            _ => {}
        }
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════
//  معالجة الإلغاء
// ═══════════════════════════════════════════════════════════════

/// يُعالج إلغاء المهمة بأمان مع حفظ مسار الملف الجزئي إن وجد
async fn handle_cancellation(
    app_handle: &AppHandle,
    state: &AppState,
    task_id: &str,
    child: CommandChild,
    partial_path: Option<String>,
) -> Result<(), AppError> {
    let _ = child.kill();
    
    if let Some(path) = partial_path {
        let _ = queries::update_file_path(&state.db_pool, task_id, &path).await;
    }
    
    let _ = queries::update_status(&state.db_pool, task_id, "cancelled").await;
    let _ = app_handle.emit("download-cancelled", task_id);
    Ok(())
}

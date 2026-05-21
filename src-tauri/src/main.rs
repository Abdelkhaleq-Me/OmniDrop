// مسار الملف: src-tauri/src/main.rs
// ═══════════════════════════════════════════════════════════════
// نقطة الإدخال الرئيسية لتطبيق OmniDrop
//
// المسؤوليات:
// 1. تهيئة قاعدة البيانات SQLite + تطبيق Migrations
// 2. إنشاء AppState المركزي
// 3. تسجيل الأوامر والإضافات
// 4. إطلاق نافذة Tauri
// ═══════════════════════════════════════════════════════════════

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// ── استيراد الوحدات الداخلية ────────────────────────────────
mod commands;
mod core;
mod db;
mod error;
mod state;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use std::str::FromStr;
use std::sync::Arc;
use tauri::{Emitter, Manager};
use state::AppState;

#[tokio::main]
async fn main() {
    // ── بناء وتشغيل تطبيق Tauri ─────────────────────────
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();

            // نقوم بالتهيئة بالكامل في الخلفية بشكل غير حاجب (non-blocking)
            tauri::async_runtime::spawn(async move {
                // 1. تحديد مجلد بيانات التطبيق الآمن والمنفصل لكل نظام تشغيل
                let data_dir = match handle.path().app_data_dir() {
                    Ok(dir) => dir,
                    Err(e) => {
                        eprintln!("❌ فشل تحديد مجلد بيانات التطبيق: {}", e);
                        std::process::exit(1);
                    }
                };

                // إنشاء المجلد بطريقة غير حاجرة (Non-blocking)
                if let Err(e) = tokio::fs::create_dir_all(&data_dir).await {
                    eprintln!("❌ فشل إنشاء مجلد بيانات التطبيق: {}", e);
                    std::process::exit(1);
                }

                let db_file_path = data_dir.join("omnidrop.db");
                let db_path = format!("sqlite:{}", db_file_path.to_string_lossy());

                // 2. تهيئة قاعدة البيانات SQLite والتأكد من تطبيق الـ Migrations
                let connect_options = match SqliteConnectOptions::from_str(&db_path) {
                    Ok(opts) => opts.create_if_missing(true),
                    Err(e) => {
                        eprintln!("❌ خطأ في تكوين مسار قاعدة البيانات: {}", e);
                        std::process::exit(1);
                    }
                };

                let pool = match SqlitePoolOptions::new()
                    .max_connections(1)
                    .min_connections(1)
                    .acquire_timeout(std::time::Duration::from_secs(5))
                    .idle_timeout(None)
                    .connect_with(connect_options)
                    .await
                {
                    Ok(p) => p,
                    Err(e) => {
                        eprintln!("❌ فشل الاتصال بقاعدة البيانات: {}", e);
                        std::process::exit(1);
                    }
                };

                // تفعيل WAL Mode وضبط PRAGMA لتحسين الأداء المتزامن بشكل جوهري
                let row: (String,) = sqlx::query_as::<_, (String,)>("PRAGMA journal_mode=WAL")
                    .fetch_one(&pool)
                    .await
                    .unwrap_or_else(|_| ("unknown".to_string(),));

                if row.0 != "wal" {
                    eprintln!("⚠️ WAL mode لم يُفعَّل، الوضع الحالي: {}", row.0);
                } else {
                    println!("✅ WAL mode نشط");
                }

                // بقية الـ PRAGMAs
                for query in ["PRAGMA synchronous=NORMAL", "PRAGMA cache_size=10000", "PRAGMA temp_store=MEMORY"] {
                    if let Err(e) = sqlx::query(query).execute(&pool).await {
                        eprintln!("⚠️ فشل تطبيق التهيئة {}: {}", query, e);
                    }
                }

                // تطبيق Migrations تلقائياً لبناء الجداول
                if let Err(e) = sqlx::migrate!("./src/db/migrations").run(&pool).await {
                    eprintln!("❌ فشل بناء هيكل قاعدة البيانات: {}", e);
                    std::process::exit(1);
                }

                println!("✅ قاعدة البيانات جاهزة ومحسنة في: {}", db_file_path.display());

                // استرجاع الإعدادات من قاعدة البيانات أو استخدام القيم الافتراضية
                let default_download_path = crate::db::queries::get_setting(&pool, "default_download_path")
                    .await
                    .unwrap_or_default()
                    .unwrap_or_else(|| {
                        dirs::download_dir()
                            .or_else(|| std::env::current_dir().ok())
                            .unwrap_or_else(|| std::path::PathBuf::from("."))
                            .to_string_lossy()
                            .to_string()
                    });

                let max_concurrent_downloads: usize = crate::db::queries::get_setting(&pool, "max_concurrent_downloads")
                    .await
                    .unwrap_or_default()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(3);

                let concurrent_fragments: u8 = crate::db::queries::get_setting(&pool, "concurrent_fragments")
                    .await
                    .unwrap_or_default()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(4);

                let http_chunk_size_mb: u8 = crate::db::queries::get_setting(&pool, "http_chunk_size_mb")
                    .await
                    .unwrap_or_default()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(10);

                let config = crate::state::AppConfig {
                    default_download_path: std::path::PathBuf::from(default_download_path),
                    max_concurrent_downloads,
                    concurrent_fragments,
                    http_chunk_size_mb,
                };

                // إنشاء الحالة المركزية: DB + AppHandle + الإعدادات المحملة
                let app_state = Arc::new(AppState::new(pool, handle.clone(), config));

                // تسجيل الحالة في Tauri State Manager
                handle.manage(app_state.clone());

                // إطلاق مهمة تجميع التقدم الدورية (Batch progress updates) كل 250ms
                let state_clone = app_state.clone();
                let handle_clone = handle.clone();
                let shutdown_batch = app_state.shutdown_token.clone();
                tauri::async_runtime::spawn(async move {
                    let mut interval = tokio::time::interval(std::time::Duration::from_millis(250));
                    loop {
                        tokio::select! {
                            _ = shutdown_batch.cancelled() => break,
                            _ = interval.tick() => {
                                let updates: Vec<crate::core::parser::ProgressData> = {
                                    let mut buffer = state_clone.progress_buffer
                                        .lock()
                                        .unwrap_or_else(|e| e.into_inner());
                                    buffer.drain().map(|(_, v)| v).collect()
                                };
                                if !updates.is_empty() {
                                    let _ = handle_clone.emit("downloads-batch-progress", &updates);
                                }
                            }
                        }
                    }
                });

                // إطلاق مهمة دورية لتنظيف المهام الميتة/الملغاة كل 30 ثانية لمنع تسرب الذاكرة
                let state_cleanup = app_state.clone();
                let shutdown_cleanup = app_state.shutdown_token.clone();
                tauri::async_runtime::spawn(async move {
                    let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
                    loop {
                        tokio::select! {
                            _ = shutdown_cleanup.cancelled() => break,
                            _ = interval.tick() => {
                                state_cleanup.active_tasks.retain(|_, token| !token.is_cancelled());
                            }
                        }
                    }
                });

                // إبلاغ الواجهة الأمامية بأن التهيئة اكتملت والتطبيق جاهز
                let _ = handle.emit("app-ready", ());
            });

            Ok(())
        })
        // ── تسجيل الإضافات ────────────────────────────────
        .plugin(tauri_plugin_shell::init())   // ضروري لـ Sidecar (yt-dlp + ffmpeg)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // ── تسجيل أوامر IPC ──────────────────────────────
        .invoke_handler(tauri::generate_handler![
            commands::start_download,
            commands::start_playlist_download,
            commands::cancel_download,
            commands::cancel_all_downloads,
            commands::get_download_history,
            commands::get_collection_history,
            commands::get_active_downloads,
            commands::delete_download,
            commands::delete_collection,
            commands::clear_completed_downloads,
            commands::clear_all_downloads,
            commands::fetch_playlist_info,
            commands::fetch_media_details,
            commands::get_app_config,
            commands::update_app_config,
            commands::pick_download_folder,
            commands::get_db_stats,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if let Some(state) = window.try_state::<Arc<AppState>>() {
                    api.prevent_close(); // نمنع الإغلاق الفوري لضمان اكتمال الاستعلام
                    
                    state.shutdown_token.cancel();
                    state.cancel_all();
                    
                    let pool = state.db_pool.clone();
                    let window_clone = window.clone();
                    
                    tauri::async_runtime::spawn(async move {
                        // تحويل جميع المهام النشطة إلى cancelled في قاعدة البيانات لتفادي التعليق عند التشغيل القادم
                        let _ = crate::db::queries::cancel_all_active_in_db(&pool).await;
                        window_clone.destroy().unwrap();
                    });
                }
            }
        })
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("❌ خطأ أثناء تشغيل محرك OmniDrop: {}", e);
        });
}
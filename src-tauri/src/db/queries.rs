// src-tauri/src/db/queries.rs
// ═══════════════════════════════════════════════════════════════
// دوال قاعدة البيانات — CRUD غير متزامن مع sqlx
//
// يدعم:
// - جدول التحميلات الفردية (downloads)
// - جدول المجموعات/قوائم التشغيل (collections)
// - ربط التحميلات بالمجموعات عبر collection_id
// ═══════════════════════════════════════════════════════════════

use chrono::Utc;
use serde::Serialize;
use sqlx::{FromRow, SqlitePool};

use crate::error::AppError;

// ═══════════════════════════════════════════════════════════════
//  هياكل قاعدة البيانات
// ═══════════════════════════════════════════════════════════════

/// سجل تحميل كامل — يُرسل للواجهة عبر IPC
#[derive(Debug, Serialize, Clone, FromRow)]
pub struct DownloadRecord {
    pub id: String,
    pub url: String,
    pub platform: String,
    pub title: Option<String>,
    pub uploader: Option<String>,
    pub thumbnail_url: Option<String>,
    pub duration: Option<i64>,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub extension: Option<String>,
    pub quality: Option<String>,
    pub status: String,
    pub error_msg: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

/// سجل مجموعة/قائمة تشغيل
#[derive(Debug, Serialize, Clone, FromRow)]
pub struct CollectionRecord {
    pub id: String,
    pub title: Option<String>,
    pub url: String,
    pub platform: String,
    pub total_items: Option<i64>,
    pub status: String,
    pub created_at: String,
}

// ═══════════════════════════════════════════════════════════════
//  عمليات إدراج التحميلات
// ═══════════════════════════════════════════════════════════════

/// إدراج تحميل جديد مع خيارات الجودة
pub async fn insert_download_with_options(
    pool: &SqlitePool,
    id: &str,
    url: &str,
    platform: &str,
    quality: &str,
) -> Result<(), AppError> {
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO downloads (id, url, platform, quality, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)",
    )
    .bind(id)
    .bind(url)
    .bind(platform)
    .bind(quality)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;

    Ok(())
}

/// إدراج تحميل جديد مع ربطه بمجموعة (قائمة تشغيل)
pub async fn insert_download_with_collection(
    pool: &SqlitePool,
    id: &str,
    url: &str,
    platform: &str,
    collection_id: Option<&str>,
    title: Option<&str>,
    quality: &str,
    order_index: i64,
) -> Result<(), AppError> {
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO downloads (id, url, platform, collection_id, title, quality, order_index, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)",
    )
    .bind(id)
    .bind(url)
    .bind(platform)
    .bind(collection_id)
    .bind(title)
    .bind(quality)
    .bind(order_index)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;

    Ok(())
}

// ═══════════════════════════════════════════════════════════════
//  عمليات المجموعات (Collections / Playlists)
// ═══════════════════════════════════════════════════════════════

/// إنشاء سجل مجموعة جديدة (قائمة تشغيل)
pub async fn insert_collection(
    pool: &SqlitePool,
    id: &str,
    url: &str,
    platform: &str,
) -> Result<(), AppError> {
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO collections (id, url, platform, status, created_at)
         VALUES (?, ?, ?, 'pending', ?)",
    )
    .bind(id)
    .bind(url)
    .bind(platform)
    .bind(&now)
    .execute(pool)
    .await?;

    Ok(())
}

/// تحديث بيانات المجموعة (العنوان وعدد العناصر)
pub async fn update_collection_metadata(
    pool: &SqlitePool,
    id: &str,
    title: Option<&str>,
    total_items: i64,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE collections SET title = ?, total_items = ? WHERE id = ?",
    )
    .bind(title)
    .bind(total_items)
    .bind(id)
    .execute(pool)
    .await?;

    Ok(())
}

/// تحديث حالة المجموعة
pub async fn update_collection_status(
    pool: &SqlitePool,
    id: &str,
    status: &str,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE collections SET status = ? WHERE id = ?",
    )
    .bind(status)
    .bind(id)
    .execute(pool)
    .await?;

    Ok(())
}

/// جلب جميع المجموعات
pub async fn get_all_collections(
    pool: &SqlitePool,
) -> Result<Vec<CollectionRecord>, AppError> {
    let records = sqlx::query_as::<_, CollectionRecord>(
        "SELECT id, title, url, platform, total_items, status, created_at
         FROM collections
         ORDER BY created_at DESC
         LIMIT 100"
    )
    .fetch_all(pool)
    .await?;

    Ok(records)
}

// ═══════════════════════════════════════════════════════════════
//  عمليات تحديث التحميلات
// ═══════════════════════════════════════════════════════════════

/// تحديث حالة التحميل
pub async fn update_status(
    pool: &SqlitePool,
    id: &str,
    status: &str,
) -> Result<(), AppError> {
    let now = Utc::now().to_rfc3339();
    let completed_at = if status == "completed" {
        Some(now.clone())
    } else {
        None
    };

    sqlx::query(
        "UPDATE downloads
         SET status = ?, updated_at = ?, completed_at = COALESCE(?, completed_at)
         WHERE id = ?",
    )
    .bind(status)
    .bind(&now)
    .bind(&completed_at)
    .bind(id)
    .execute(pool)
    .await?;

    Ok(())
}

/// تحديث البيانات الوصفية
pub async fn update_metadata(
    pool: &SqlitePool,
    id: &str,
    title: Option<&str>,
    uploader: Option<&str>,
    thumbnail_url: Option<&str>,
    duration: Option<i64>,
    extension: Option<&str>,
    file_size: Option<i64>,
) -> Result<(), AppError> {
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE downloads
         SET title = COALESCE(?, title),
             uploader = COALESCE(?, uploader),
             thumbnail_url = COALESCE(?, thumbnail_url),
             duration = COALESCE(?, duration),
             extension = COALESCE(?, extension),
             file_size = COALESCE(?, file_size),
             updated_at = ?
         WHERE id = ?",
    )
    .bind(title)
    .bind(uploader)
    .bind(thumbnail_url)
    .bind(duration)
    .bind(extension)
    .bind(file_size)
    .bind(&now)
    .bind(id)
    .execute(pool)
    .await?;

    Ok(())
}

/// تحديث مسار الملف النهائي بعد اكتمال التحميل
pub async fn update_file_path(
    pool: &SqlitePool,
    id: &str,
    file_path: &str,
) -> Result<(), AppError> {
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE downloads SET file_path = ?, updated_at = ? WHERE id = ?",
    )
    .bind(file_path)
    .bind(&now)
    .bind(id)
    .execute(pool)
    .await?;

    Ok(())
}

/// تسجيل خطأ وتحديث الحالة إلى 'failed'
pub async fn set_error(
    pool: &SqlitePool,
    id: &str,
    error: &str,
) -> Result<(), AppError> {
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE downloads
         SET status = 'failed', error_msg = ?, updated_at = ?
         WHERE id = ?",
    )
    .bind(error)
    .bind(&now)
    .bind(id)
    .execute(pool)
    .await?;

    Ok(())
}

// ═══════════════════════════════════════════════════════════════
//  عمليات القراءة
// ═══════════════════════════════════════════════════════════════

/// جلب التحميلات مع دعم الصفحات (Pagination)
pub async fn get_all_downloads(
    pool: &SqlitePool,
    limit: i64,
    offset: i64,
) -> Result<Vec<DownloadRecord>, AppError> {
    let records = sqlx::query_as::<_, DownloadRecord>(
        "SELECT
            id, url, platform, title, uploader, thumbnail_url,
            duration, file_path, file_size, extension, quality,
            status, error_msg, created_at, updated_at, completed_at
         FROM downloads
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?"
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(records)
}

/// جلب التحميلات النشطة فقط
pub async fn get_active_downloads(
    pool: &SqlitePool,
) -> Result<Vec<DownloadRecord>, AppError> {
    let records = sqlx::query_as::<_, DownloadRecord>(
        "SELECT
            id, url, platform, title, uploader, thumbnail_url,
            duration, file_path, file_size, extension, quality,
            status, error_msg, created_at, updated_at, completed_at
         FROM downloads
         WHERE status IN ('pending', 'fetching_metadata', 'downloading', 'processing')
         ORDER BY created_at ASC"
    )
    .fetch_all(pool)
    .await?;

    Ok(records)
}

// ═══════════════════════════════════════════════════════════════
//  عمليات الحذف
// ═══════════════════════════════════════════════════════════════

/// حذف سجل تحميل بمعرفه
pub async fn delete_download(
    pool: &SqlitePool,
    id: &str,
) -> Result<(), AppError> {
    // 1. الحصول على معرف المجموعة المرتبط (إن وجد)
    let collection_id: Option<String> = sqlx::query_scalar("SELECT collection_id FROM downloads WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?;

    // 2. حذف التحميل
    sqlx::query("DELETE FROM downloads WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;

    // 3. تحديث حالة المجموعة بناءً على حالة العناصر المتبقية
    if let Some(ref cid) = collection_id {
        let status = get_collection_aggregate_status(pool, cid).await?;
        update_collection_status(pool, cid, &status).await?;
    }

    Ok(())
}

/// حساب حالة المجموعة التراكمية بناءً على عناصرها الفرعية
pub async fn get_collection_aggregate_status(
    pool: &SqlitePool,
    collection_id: &str,
) -> Result<String, AppError> {
    let statuses: Vec<String> = sqlx::query_scalar("SELECT status FROM downloads WHERE collection_id = ?")
        .bind(collection_id)
        .fetch_all(pool)
        .await?;

    if statuses.is_empty() {
        return Ok("completed".to_string());
    }

    if statuses.iter().any(|s| s == "downloading" || s == "pending" || s == "processing" || s == "fetching_metadata") {
        return Ok("downloading".to_string());
    }

    if statuses.iter().all(|s| s == "completed") {
        return Ok("completed".to_string());
    }

    if statuses.iter().all(|s| s == "cancelled") {
        return Ok("cancelled".to_string());
    }

    if statuses.iter().all(|s| s == "failed") {
        return Ok("failed".to_string());
    }

    Ok("completed".to_string())
}

/// حذف مجموعة (قائمة تشغيل) وجميع عناصرها الفرعية من قاعدة البيانات
pub async fn delete_collection(
    pool: &SqlitePool,
    collection_id: &str,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM downloads WHERE collection_id = ?")
        .bind(collection_id)
        .execute(pool)
        .await?;

    sqlx::query("DELETE FROM collections WHERE id = ?")
        .bind(collection_id)
        .execute(pool)
        .await?;

    Ok(())
}

/// حذف جميع التحميلات المكتملة
pub async fn clear_completed(
    pool: &SqlitePool,
) -> Result<u64, AppError> {
    let result = sqlx::query("DELETE FROM downloads WHERE status = 'completed'")
        .execute(pool)
        .await?;

    Ok(result.rows_affected())
}

/// حذف جميع التحميلات والمجموعات من قاعدة البيانات بالكامل
pub async fn clear_all(
    pool: &SqlitePool,
) -> Result<u64, AppError> {
    let result_downloads = sqlx::query("DELETE FROM downloads")
        .execute(pool)
        .await?;

    sqlx::query("DELETE FROM collections")
        .execute(pool)
        .await?;

    Ok(result_downloads.rows_affected())
}

// ═══════════════════════════════════════════════════════════════
//  إدارة الإعدادات
// ═══════════════════════════════════════════════════════════════

/// جلب قيمة إعداد معين بمعرفه
pub async fn get_setting(
    pool: &SqlitePool,
    key: &str,
) -> Result<Option<String>, AppError> {
    let val: Option<String> = sqlx::query_scalar("SELECT value FROM settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await?;
    Ok(val)
}

/// تعديل أو إدراج إعداد معين
pub async fn set_setting(
    pool: &SqlitePool,
    key: &str,
    value: &str,
) -> Result<(), AppError> {
    sqlx::query("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(key)
        .bind(value)
        .execute(pool)
        .await?;
    Ok(())
}

/// إلغاء جميع التحميلات النشطة في قاعدة البيانات (تحديث الحالات)
pub async fn cancel_all_active_in_db(
    pool: &SqlitePool,
) -> Result<(), AppError> {
    sqlx::query("UPDATE downloads SET status = 'cancelled' WHERE status IN ('pending', 'fetching_metadata', 'downloading', 'processing')")
        .execute(pool)
        .await?;
    Ok(())
}

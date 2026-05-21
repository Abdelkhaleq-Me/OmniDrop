-- src-tauri/src/db/migrations/002_add_fetching_metadata_status.sql

-- SQLite لا يدعم ALTER TABLE ... ALTER COLUMN مع CHECK constraints
-- الحل: إعادة بناء الجدول بالبنية الجديدة

PRAGMA foreign_keys = OFF;

-- إنشاء جدول مؤقت بالبنية الجديدة
CREATE TABLE downloads_new (
    id              TEXT PRIMARY KEY,
    collection_id   TEXT,
    url             TEXT NOT NULL,
    platform        TEXT NOT NULL,
    title           TEXT,
    uploader        TEXT,
    thumbnail_url   TEXT,
    duration        INTEGER,
    file_path       TEXT,
    file_size       INTEGER DEFAULT 0,
    downloaded_size INTEGER DEFAULT 0,
    extension       TEXT,
    quality         TEXT,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN (
                        'pending',
                        'fetching_metadata',   -- ← مُضاف
                        'downloading',
                        'processing',
                        'completed',
                        'cancelled',
                        'failed'
                    )),
    error_msg       TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    completed_at    TEXT,
    order_index     INTEGER DEFAULT 0,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- نقل البيانات (fetching_metadata الموجودة ستُحوَّل إلى pending تلقائياً)
INSERT INTO downloads_new SELECT * FROM downloads
    WHERE status IN ('pending','downloading','processing','completed','cancelled','failed');

-- إدراج المهام بحالة غير معروفة كـ pending
INSERT INTO downloads_new
    SELECT id, collection_id, url, platform, title, uploader,
           thumbnail_url, duration, file_path, file_size, downloaded_size,
           extension, quality, 'pending', error_msg,
           created_at, updated_at, completed_at, order_index
    FROM downloads
    WHERE status NOT IN ('pending','downloading','processing','completed','cancelled','failed');

-- استبدال الجدول القديم
DROP TABLE downloads;
ALTER TABLE downloads_new RENAME TO downloads;

-- إعادة الفهارس
CREATE INDEX IF NOT EXISTS idx_downloads_collection ON downloads(collection_id);
CREATE INDEX IF NOT EXISTS idx_downloads_platform   ON downloads(platform);
CREATE INDEX IF NOT EXISTS idx_downloads_status     ON downloads(status);

-- إنشاء جدول الإعدادات إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

PRAGMA foreign_keys = ON;

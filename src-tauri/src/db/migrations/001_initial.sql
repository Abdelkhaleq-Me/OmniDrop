-- 1. جدول المجموعات (Collections/Playlists)
-- يستخدم في حالة تحميل قائمة تشغيل كاملة أو "ثريد" تويتر أو ألبوم صور
CREATE TABLE IF NOT EXISTS collections (
    id              TEXT PRIMARY KEY,       -- معرف UUID
    title           TEXT,                   -- عنوان قائمة التشغيل
    url             TEXT NOT NULL,          -- رابط القائمة الأصلي
    platform        TEXT NOT NULL,          -- المنصة (youtube, tiktok, twitter, etc.)
    total_items     INTEGER DEFAULT 0,      -- عدد العناصر الكلي في القائمة
    status          TEXT NOT NULL DEFAULT 'pending', 
    created_at      TEXT NOT NULL
);

-- 2. جدول التحميلات الفردية (Downloads)
CREATE TABLE IF NOT EXISTS downloads (
    id              TEXT PRIMARY KEY,       -- معرف UUID
    collection_id   TEXT,                   -- (مفتاح أجنبي) يربط الفيديو بقائمة تشغيل إن وجد
    url             TEXT NOT NULL,          -- رابط الفيديو/المادة الفعلي
    platform        TEXT NOT NULL,          -- المنصة (تلقائياً من yt-dlp)
    
    -- بيانات المحتوى (Metadata)
    title           TEXT,                   -- عنوان الفيديو
    uploader        TEXT,                   -- اسم القناة أو صاحب الحساب
    thumbnail_url   TEXT,                   -- رابط صورة الغلاف
    duration        INTEGER,                -- مدة الفيديو بالثواني
    
    -- بيانات الملف التقنية
    file_path       TEXT,                   -- مسار الحفظ النهائي
    file_size       INTEGER DEFAULT 0,      -- الحجم الكلي المتوقع
    downloaded_size INTEGER DEFAULT 0,      -- ما تم تحميله فعلياً (لغرض الاستكمال Resuming)
    extension       TEXT,                   -- صيغة الملف (mp4, mp3, jpg)
    quality         TEXT,                   -- الجودة (1080p, 4K, Original)

    -- الحالة والتقدم
    status          TEXT NOT NULL DEFAULT 'pending' 
                    CHECK(status IN ('pending', 'downloading', 'processing', 'completed', 'cancelled', 'failed')),
    error_msg       TEXT,
    
    -- التوقيت
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    completed_at    TEXT,

    -- ترتيب الفيديو داخل القائمة (إن وجد)
    order_index     INTEGER DEFAULT 0,

    -- ربط مع جدول المجموعات
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- 3. الفهارس لتحسين الأداء (Indexing)
CREATE INDEX IF NOT EXISTS idx_downloads_collection ON downloads(collection_id);
CREATE INDEX IF NOT EXISTS idx_downloads_platform ON downloads(platform);
CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
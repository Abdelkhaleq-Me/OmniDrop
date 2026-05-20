-- 1. Disable foreign keys temporarily to avoid constraint issues during table recreation
PRAGMA foreign_keys = OFF;

-- 2. Rename the old downloads table
ALTER TABLE downloads RENAME TO downloads_old;

-- 3. Create the new downloads table with the corrected check constraint (including 'fetching_metadata')
CREATE TABLE downloads (
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
                    CHECK(status IN ('pending', 'fetching_metadata', 'downloading', 'processing', 'completed', 'cancelled', 'failed')),
    error_msg       TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    completed_at    TEXT,
    order_index     INTEGER DEFAULT 0,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- 4. Copy the data from the old table to the new one
INSERT INTO downloads (
    id, collection_id, url, platform, title, uploader, thumbnail_url,
    duration, file_path, file_size, downloaded_size, extension, quality,
    status, error_msg, created_at, updated_at, completed_at, order_index
)
SELECT 
    id, collection_id, url, platform, title, uploader, thumbnail_url,
    duration, file_path, file_size, downloaded_size, extension, quality,
    status, error_msg, created_at, updated_at, completed_at, order_index
FROM downloads_old;

-- 5. Drop the old table
DROP TABLE downloads_old;

-- 6. Recreate indexes on the new table
CREATE INDEX idx_downloads_collection ON downloads(collection_id);
CREATE INDEX idx_downloads_platform ON downloads(platform);
CREATE INDEX idx_downloads_status ON downloads(status);

-- 7. Re-enable foreign keys
PRAGMA foreign_keys = ON;

-- 8. Create the settings table
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

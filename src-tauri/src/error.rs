// src-tauri/src/error.rs
use serde::Serializer;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("خطأ في النظام (I/O): {0}")]
    IoError(#[from] std::io::Error),

    #[error("خطأ في قاعدة البيانات: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("خطأ في معالجة البيانات (JSON): {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("فشل في تشغيل المحرك (Sidecar): {0}")]
    SidecarError(String),

    #[error("المحرك (yt-dlp/ffmpeg) مفقود أو لم يتم تثبيته")]
    #[allow(dead_code)]
    MissingBinary,

    #[error("رابط غير صالح أو غير مدعوم: {0}")]
    InvalidUrl(String),

    #[error("المهمة [{0}] غير موجودة أو تم إنهاؤها مسبقاً")]
    TaskNotFound(String),

    #[error("توقف التحميل: {0}")]
    DownloadInterrupted(String),

    #[error("خطأ داخلي غير متوقع: {0}")]
    Internal(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: Serializer,
    {
        // نرسل رسالة خطأ واضحة ومقروءة للمستخدم في الواجهة الأمامية
        serializer.serialize_str(&self.to_string())
    }
}
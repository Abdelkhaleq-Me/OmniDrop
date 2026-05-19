// src-tauri/src/state.rs
use dashmap::DashMap;
use sqlx::SqlitePool;
use tokio::sync::Semaphore;
use tokio_util::sync::CancellationToken;
use std::sync::Arc;
use tauri::AppHandle;

/// إعدادات التطبيق القابلة للتخصيص
pub struct AppConfig {
    pub default_download_path: std::path::PathBuf,
    pub max_concurrent_downloads: usize,
    pub concurrent_fragments: u8,   // تحميل أجزاء متوازية (افتراضي: 4)
    pub http_chunk_size_mb: u8,     // حجم الطلب بالـ MB (افتراضي: 10)
}

pub struct AppState {
    /// خريطة المهام النشطة: تسمح بالإلغاء الفوري عبر الـ Token
    pub active_tasks: DashMap<String, CancellationToken>,

    /// قاعدة البيانات
    pub db_pool: SqlitePool,

    /// التحكم في التزامن: يمنع التطبيق من استهلاك موارد الجهاز بالكامل
    pub download_semaphore: Arc<Semaphore>,

    /// إعدادات المستخدم
    pub config: tokio::sync::RwLock<AppConfig>,

    /// بافر مؤقت للتقدم لغرض إرسال دفعات (Batch updates)
    pub progress_buffer: std::sync::Mutex<std::collections::HashMap<String, crate::core::parser::ProgressData>>,

    /// رابط لمحرك Tauri: لإرسال أحداث (Events) من خلف الكواليس
    pub app_handle: AppHandle,

    /// توكن للإغلاق الآمن للمهام الخلفية عند إغلاق التطبيق
    pub shutdown_token: CancellationToken,
}

impl AppState {
    pub fn new(pool: SqlitePool, handle: AppHandle, max_downloads: usize) -> Self {
        // تحديد مجلد التحميلات الافتراضي للمستخدم
        // لا unwrap() — نستخدم مجلد التشغيل الحالي كبديل آمن
        let download_dir = dirs::download_dir()
            .or_else(|| std::env::current_dir().ok())
            .unwrap_or_else(|| std::path::PathBuf::from("."));

        Self {
            active_tasks: DashMap::new(),
            db_pool: pool,
            download_semaphore: Arc::new(Semaphore::new(max_downloads)),
            config: tokio::sync::RwLock::new(AppConfig {
                default_download_path: download_dir,
                max_concurrent_downloads: max_downloads,
                concurrent_fragments: 4,
                http_chunk_size_mb: 10,
            }),
            progress_buffer: std::sync::Mutex::new(std::collections::HashMap::new()),
            app_handle: handle,
            shutdown_token: CancellationToken::new(),
        }
    }

    /// تسجيل مهمة جديدة مع الـ Token الخاص بها.
    /// الـ Token يُخزَّن في DashMap ليتمكن cancel_download من الوصول إليه.
    pub fn register_task(&self, task_id: &str, token: CancellationToken) {
        self.active_tasks.insert(task_id.to_string(), token);
    }

    /// تنظيف مهمة بعد انتهائها — يحذف الـ Token من الخريطة.
    /// يُستدعى في جميع مسارات الخروج: اكتمال، إلغاء، فشل.
    /// Principle #5: Mandatory State Cleanup — لا تسرب ذاكرة.
    pub fn cleanup_task(&self, task_id: &str) {
        self.active_tasks.remove(task_id);
    }


    /// إلغاء جميع المهمات النشطة (يُستدعى عند إغلاق البرنامج)
    pub fn cancel_all(&self) {
        self.active_tasks.retain(|_, token| {
            token.cancel();
            false // يُرجع false ليتم حذف العنصر فوراً من الـ DashMap
        });
    }
}
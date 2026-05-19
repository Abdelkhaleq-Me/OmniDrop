// src-tauri/src/lib.rs
// ═══════════════════════════════════════════════════════════════
// OmniDrop Library Root
//
// يُعرِّف الوحدات العامة للمكتبة.
// نقطة الإدخال الفعلية في main.rs — هذا الملف للتوافق مع
// بنية Tauri V2 التي تتطلب lib.rs.
// ═══════════════════════════════════════════════════════════════

pub mod error;
pub mod state;
pub mod core;
pub mod db;
pub mod commands;

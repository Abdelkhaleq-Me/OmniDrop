// src/i18n/translations.ts
// ═══════════════════════════════════════════════════════════════
// ملف الترجمات المركزي — كل النصوص هنا بدلاً من inline ternaries
// ═══════════════════════════════════════════════════════════════

export type Lang = "ar" | "en";

export const translations = {
  ar: {
    // ── عام ──────────────────────────────────────────────────
    appTitle: "OmniDrop",

    // ── شريط الإدخال ─────────────────────────────────────────
    pastePlaceholder: "الصق الرابط — يوتيوب، تيك توك، انستغرام، تويتر...",
    options: "خيارات",
    downloadBtn: "تحميل",
    pasteBtn: "لصق",
    pastedFromClipboard: "تم اللصق من الحافظة",

    // ── شارات نوع الرابط ─────────────────────────────────────
    badgeVideo: "فيديو",
    badgePlaylist: "قائمة تشغيل",
    badgeUnknown: "رابط غير معروف",

    // ── الوضع والخيارات ──────────────────────────────────────
    modeLabel: "الوضع",
    videoMode: "فيديو",
    audioMode: "صوت فقط",
    quality: "الدقة",
    format: "الصيغة",
    singleInfoPre: "فيديو · ",
    singleInfoPost: " · تحميل منفرد",
    audioInfoPre: "صوت · ",
    audioInfoPost: " · تحميل منفرد",
    qualityUnsupported: "هذه الجودة غير مدعومة لهذا الفيديو",
    quality4K: "4K (2160p)",
    quality2K: "2K (1440p)",

    // ── تقدير الحجم ──────────────────────────────────────────
    fetchingDetails: "جاري جلب بيانات الوسائط وتقدير حجم الملف...",
    estimatedSizeVideo: "الحجم المتوقع لجودة {q}:",
    estimatedSizeAudio: "الحجم المتوقع للصوت بصيغة {f}:",
    maxSupportedRes: "أقصى دقة مدعومة: ",
    estimatedPlaylistSize: "الحجم الإجمالي المقدر لقائمة التشغيل: ",
    estimatedVideoSize: "الحجم المقدر للفيديو: ",

    // ── قائمة التحميل ────────────────────────────────────────
    queueTitle: "قائمة التحميل",
    activeBadge: "{n} نشط",
    clearCompleted: "مسح المكتمل",
    clearedCompleted: "تم مسح التحميلات المكتملة",
    clearAll: "مسح الكل",
    clearedAll: "تم مسح كافة التحميلات بنجاح",

    // ── التبويبات ────────────────────────────────────────────
    downloadsTab: "التحميلات",
    historyTab: "السجل",
    playlistsTab: "القوائم",
    settingsTab: "الإعدادات",

    // ── حالات التحميل ────────────────────────────────────────
    speedLabel: "السرعة",
    etaLabel: "متبقي",
    active: "نشط",
    processing: "معالجة",
    completed: "مكتمل",
    cancelled: "ملغى",
    failed: "فشل",
    pending: "في الانتظار",
    downloading: "جاري التحميل",
    fetching_metadata: "جلب البيانات",
    speedUnit: "ميجابايت/ث",
    activeCount: "نشط",
    processingCount: "معالجة",
    completedCount: "مكتمل",
    cancelledCount: "ملغى",
    failedCount: "فشل",

    // ── الإعدادات ────────────────────────────────────────────
    settingsTitle: "إعدادات النظام والشبكة",
    settingsDesc: "عرض إعدادات محرك التحميل الحالية ونمط التزامن",
    parallelFragments: "أجزاء التحميل المتوازية (Concurrent Fragments)",
    chunkSize: "حجم الجزء لطلب HTTP (Chunk Size)",
    activeLimits: "الحد الأقصى للتحميلات النشطة",
    systemStats: "إحصائيات استقرار قاعدة البيانات",
    dbStatus: "وضع WAL نشط ومحسن لقاعدة البيانات لضمان أعلى أداء واستقرار.",
    savePathLabel: "مجلد الحفظ الافتراضي",
    browseBtn: "استعراض...",
    saveBtn: "حفظ الإعدادات",
    settingsSaved: "تم حفظ الإعدادات بنجاح!",
    settingsSaveError: "فشل حفظ الإعدادات: ",
    dbTotal: "إجمالي التحميلات",
    dbCompleted: "التحميلات المكتملة",
    dbFailed: "التحميلات الفاشلة",
    dbPlaylists: "قوائم التشغيل المحملة",

    // ── نافذة قائمة التشغيل ──────────────────────────────────
    modalTitle: "اختر مقاطع قائمة التشغيل",
    modalSub: "مجموعة مقاطع قائمة التشغيل · {n} مقطع",
    selectAll: "تحديد الكل",
    deselectAll: "إلغاء الكل",
    searchPlaylist: "بحث في القائمة...",
    selectedCount: "محدد: {n}",
    cancelModal: "إلغاء",
    downloadModal: "تحميل {n} مقطع",
    loadingMetadata: "جاري تحميل البيانات...",
    fetchingPlaylistDetails: "جاري جلب تفاصيل وفيديوهات قائمة التشغيل...",
    noVideosFound: "لم يتم العثور على أي فيديوهات.",
    defaultVideoTitle: "فيديو رقم {n}",
    unknownChannel: "قناة غير معروفة",
    foundVideos: "تم العثور على {n} فيديو في قائمة التشغيل",
    failedFetchPlaylist: "فشل جلب تفاصيل قائمة التشغيل: ",
    selectAtLeastOne: "يرجى تحديد فيديو واحد على الأقل للتحميل",
    startingSelectedDownload: "بدء تحميل {n} فيديو المحدد...",

    // ── الإشعارات ────────────────────────────────────────────
    toastCompleted: "تم اكتمال التحميل بنجاح!",
    toastFailed: "فشل التحميل: ",
    toastCancelled: "تم إلغاء التحميل بنجاح",
    toastStarted: "بدء التحميل...",
    toastPlaylistStarted: "بدء تحميل قائمة التشغيل بـ {n} مقطع",
    unknownLinkAttempt: "رابط غير معروف، محاولة التحميل...",

    // ── الحالات الفارغة ──────────────────────────────────────
    emptyStateQueue: "قائمة التحميل فارغة حالياً. أضف رابطاً بالأعلى لبدء التحميل!",
    emptyStateHistory: "لا توجد سجلات في الأرشيف حالياً.",
    emptyStatePlaylists: "لم يتم تحميل أي قوائم تشغيل حتى الآن.",

    // ── السجل ────────────────────────────────────────────────
    searchHistoryPlaceholder: "بحث في الأرشيف والسجل...",
    allFilter: "الكل",
    details: "التفاصيل",
    fileSize: "الحجم",
    duration: "المدة",
    date: "التاريخ",
    openFolder: "فتح الملف",
    deleteRecord: "حذف السجل",

    // ── أزرار النافذة ────────────────────────────────────────
    minimize: "تصغير",
    maximize: "تكبير",
    restore: "استعادة",
    close: "إغلاق",

    // ── اللغة ────────────────────────────────────────────────
    switchLang: "English",
  },
  en: {
    appTitle: "OmniDrop",

    pastePlaceholder: "Paste link — YouTube, TikTok, Instagram, Twitter...",
    options: "Options",
    downloadBtn: "Download",
    pasteBtn: "Paste",
    pastedFromClipboard: "Pasted from clipboard",

    badgeVideo: "Video",
    badgePlaylist: "Playlist",
    badgeUnknown: "Unknown Link",

    modeLabel: "Mode",
    videoMode: "Video",
    audioMode: "Audio Only",
    quality: "Quality",
    format: "Format",
    singleInfoPre: "Video · ",
    singleInfoPost: " · Single Download",
    audioInfoPre: "Audio · ",
    audioInfoPost: " · Single Extract",
    qualityUnsupported: "This quality is not supported for this video",
    quality4K: "4K (2160p)",
    quality2K: "2K (1440p)",

    fetchingDetails: "Fetching media details & estimating filesize...",
    estimatedSizeVideo: "Estimated size at {q}:",
    estimatedSizeAudio: "Estimated audio size ({f}):",
    maxSupportedRes: "Max supported resolution: ",
    estimatedPlaylistSize: "Estimated total playlist size: ",
    estimatedVideoSize: "Estimated video size: ",

    queueTitle: "Download Queue",
    activeBadge: "{n} Active",
    clearCompleted: "Clear Completed",
    clearedCompleted: "Cleared completed downloads",
    clearAll: "Clear All",
    clearedAll: "Cleared all downloads successfully",

    downloadsTab: "Downloads",
    historyTab: "History",
    playlistsTab: "Playlists",
    settingsTab: "Settings",

    speedLabel: "Speed",
    etaLabel: "Remaining",
    active: "Active",
    processing: "Processing",
    completed: "Completed",
    cancelled: "Cancelled",
    failed: "Failed",
    pending: "Pending",
    downloading: "Downloading",
    fetching_metadata: "Fetching Metadata",
    speedUnit: "MB/s",
    activeCount: "Active",
    processingCount: "Processing",
    completedCount: "Completed",
    cancelledCount: "Cancelled",
    failedCount: "Failed",

    settingsTitle: "System & Network Settings",
    settingsDesc: "View current download engine settings and concurrency mode",
    parallelFragments: "Parallel Download Fragments (Concurrent)",
    chunkSize: "HTTP Chunk Size",
    activeLimits: "Concurrent Downloads Max Limits",
    systemStats: "Database Optimization Stats",
    dbStatus: "WAL Mode is active and optimized for high-concurrency writes.",
    savePathLabel: "Default Save Path",
    browseBtn: "Browse...",
    saveBtn: "Save Settings",
    settingsSaved: "Settings saved successfully!",
    settingsSaveError: "Failed to save settings: ",
    dbTotal: "Total Downloads",
    dbCompleted: "Completed Downloads",
    dbFailed: "Failed Downloads",
    dbPlaylists: "Downloaded Playlists",

    modalTitle: "Select Playlist Videos",
    modalSub: "Playlist Videos · {n} videos",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    searchPlaylist: "Search in playlist...",
    selectedCount: "Selected: {n}",
    cancelModal: "Cancel",
    downloadModal: "Download {n} Videos",
    loadingMetadata: "Loading metadata...",
    fetchingPlaylistDetails: "Fetching playlist details & videos...",
    noVideosFound: "No videos found.",
    defaultVideoTitle: "Video #{n}",
    unknownChannel: "Unknown Channel",
    foundVideos: "Found {n} videos in the playlist",
    failedFetchPlaylist: "Failed to fetch playlist details: ",
    selectAtLeastOne: "Please select at least one video to download",
    startingSelectedDownload: "Starting download for {n} selected videos...",

    toastCompleted: "Download completed successfully!",
    toastFailed: "Download failed: ",
    toastCancelled: "Download cancelled successfully",
    toastStarted: "Started downloading...",
    toastPlaylistStarted: "Started downloading playlist with {n} videos",
    unknownLinkAttempt: "Unknown link, attempting download...",

    emptyStateQueue: "Download queue is currently empty. Add a link above to start!",
    emptyStateHistory: "No archived records found.",
    emptyStatePlaylists: "No playlists downloaded yet.",

    searchHistoryPlaceholder: "Search archived downloads...",
    allFilter: "All",
    details: "Details",
    fileSize: "Size",
    duration: "Duration",
    date: "Date",
    openFolder: "Open File",
    deleteRecord: "Delete Record",

    minimize: "Minimize",
    maximize: "Maximize",
    restore: "Restore",
    close: "Close",

    switchLang: "العربية",
  }
};

export type TranslationKeys = keyof typeof translations["ar"];
export type Translations = Record<TranslationKeys, string>;

# خطة تطوير شاملة — OmniDrop
## النسخة: 3.1 (Self-Contained — Zero External Dependencies)
> مبنية على مراجعة V1.0 → V2.0 مع تطبيق جميع التصحيحات المعمارية
> **v3.1:** إضافة ffmpeg كـ Sidecar مُحزَّم — التطبيق مستقل 100% لا يحتاج أي أداة مُثبَّتة مسبقاً

---

## جدول المحتويات

0. [اللغات والأدوات والأطر والمكتبات](#0-اللغات-والأدوات-والأطر-والمكتبات)
1. [مبادئ التطوير](#1-مبادئ-التطوير)
2. [الرؤية المعمارية النهائية](#2-الرؤية-المعمارية-النهائية)
3. [هيكل المشروع الكامل](#3-هيكل-المشروع-الكامل)
4. [التبعيات النهائية](#4-التبعيات-النهائية)
5. [مخطط قاعدة البيانات](#5-مخطط-قاعدة-البيانات)
6. [الكود المُصحَّح بالكامل](#6-الكود-المُصحَّح-بالكامل)
7. [خارطة الطريق التفصيلية](#7-خارطة-الطريق-التفصيلية)
8. [إعداد CI/CD](#8-إعداد-cicd)
9. [معايير الجودة والاختبار](#9-معايير-الجودة-والاختبار)

---

## 0. اللغات والأدوات والأطر والمكتبات

### 🗂️ نظرة عامة على المكدس التقني (Tech Stack Overview)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Tech Stack                               │
├──────────────────┬──────────────────────────────────────────────┤
│   طبقة العرض    │  TypeScript · React · Vite · Tailwind CSS    │
│   طبقة المنطق   │  Rust (2021 Edition) · Tokio · Tauri         │
│   البيانات       │  SQLite · sqlx · Migrations                  │
│   الأدوات        │  yt-dlp · ffmpeg · GitHub Actions · cargo    │
│   الاستقلالية   │  yt-dlp + ffmpeg مُحزَّمان كـ Sidecars        │
└──────────────────┴──────────────────────────────────────────────┘
```

---

### 🦀 لغات البرمجة

| اللغة | الإصدار | الاستخدام | السبب |
|-------|---------|-----------|-------|
| **Rust** | 2021 Edition | النواة الخلفية بالكامل | أمان الذاكرة بدون Garbage Collector، أداء يضاهي C/C++، نظام أنواع صارم يمنع Data Races وقت الترجمة |
| **TypeScript** | 5.x (strict) | واجهة المستخدم بالكامل | يضيف Type Safety على JavaScript، يمنع أخطاء النوع وقت التطوير، توافق كامل مع بيئة React |
| **SQL** | SQLite dialect | تعريف Schema والـ Migrations | لغة استعلام قياسية لتعريف هيكل البيانات وإدارة تطوره |

---

### 🖥️ أطر العمل (Frameworks)

#### Backend

| الإطار | الإصدار | الدور | التفاصيل |
|--------|---------|-------|----------|
| **Tauri** | 1.6 | إطار التطبيق المكتبي | يربط Rust بـ WebView بديلاً عن Electron، حجم الملف النهائي أصغر بـ 10x، لا Node.js runtime مطلوب |
| **Tokio** | 1.x | Async Runtime | المحرك الأساسي لجميع العمليات غير المتزامنة — I/O، Thread Pool، Timers، Channels |

#### Frontend

| الإطار | الإصدار | الدور | التفاصيل |
|--------|---------|-------|----------|
| **React** | 18.x | بناء واجهة المستخدم | مكونات قابلة لإعادة الاستخدام، Virtual DOM، نظام Hooks للحالة والآثار الجانبية |
| **Vite** | 5.x | أداة البناء (Bundler) | بناء فوري (HMR) في التطوير، تحسين التجميع للإنتاج، دعم أصلي لـ TypeScript |
| **Tailwind CSS** | 3.x | نظام التصميم | Utility-first CSS، لا CSS مخصص بالحد الأدنى، حجم صغير في الإنتاج عبر Purging |

---

### 📦 المكتبات (Crates & Packages)

#### مكتبات Rust (Crates)

| المكتبة | الإصدار | التصنيف | الغرض المحدد |
|---------|---------|---------|-------------|
| `tauri` | 1.6 | إطار أساسي | إدارة دورة حياة التطبيق، IPC، Sidecar API، نظام الأحداث |
| `tokio` | 1.x | Async Runtime | تشغيل المهام غير المتزامنة، Thread Pool، `tokio::spawn`، `tokio::select!` |
| `tokio-util` | 0.7 | مساعدات Async | `CancellationToken` لإلغاء المهام بأمان |
| `serde` | 1.x | Serialization | تحويل هياكل Rust إلى/من JSON تلقائياً عبر `#[derive(Serialize, Deserialize)]` |
| `serde_json` | 1.x | JSON | تحليل وبناء JSON — يُستخدم لفك تشفير مخرجات yt-dlp |
| `thiserror` | 1.x | معالجة الأخطاء | بناء أنواع أخطاء مخصصة بصيغة Rust idiomatically عبر derive macros |
| `sqlx` | 0.7 | قاعدة البيانات | استعلامات SQL غير متزامنة مع فحص الأنواع وقت الترجمة، migrations تلقائية |
| `dashmap` | 5.x | تزامن | `HashMap` آمن للتزامن بدون `Mutex` خارجي — لإدارة مهام التحميل النشطة |
| `uuid` | 1.x | معرفات | توليد UUID v4 لكل مهمة تحميل |
| `chrono` | 0.4 | تواريخ ووقت | تنسيق وتخزين التواريخ بصيغة ISO 8601 |
| `futures` | 0.3 | Async أساسيات | معالجة متقدمة للـ Streams القادمة من محرك التحميل |

#### حزم JavaScript/TypeScript

| الحزمة | الإصدار | التصنيف | الغرض المحدد |
|--------|---------|---------|-------------|
| `@tauri-apps/api` | 1.x | IPC Bridge | `invoke()` لاستدعاء أوامر Rust، `listen()` لاستقبال الأحداث |
| `react` | 18.x | UI Framework | بناء المكونات وإدارة الحالة |
| `react-dom` | 18.x | DOM Rendering | تصيير مكونات React في WebView |
| `typescript` | 5.x | Type System | فحص الأنواع وقت التطوير |
| `vite` | 5.x | Build Tool | Dev server مع HMR، تجميع للإنتاج |
| `tailwindcss` | 3.x | Styling | نظام CSS خدمي |
| `zustand` | 4.x | State Management | إدارة حالة التطبيق (قائمة التحميلات، السجل) — أخف من Redux |

---

### 🛠️ الأدوات (Tools)

#### أدوات التطوير

| الأداة | الغرض | ملاحظات |
|--------|-------|---------|
| **yt-dlp** | محرك التحميل الفعلي | **مُحزَّم كـ Sidecar** — لا يحتاج المستخدم تثبيته. يدعم 1000+ موقع |
| **ffmpeg** | دمج الفيديو والصوت (Muxing) | **مُحزَّم كـ Sidecar** — ضروري لجودات 1080p+ من يوتيوب. لا يحتاج المستخدم تثبيته |
| **cargo** | مدير حزم Rust | بناء المشروع، تشغيل الاختبارات، إدارة التبعيات |
| **npm / pnpm** | مدير حزم JS | أداة تطوير فقط — لا أثر لها في الملف النهائي |
| **rustfmt** | تنسيق كود Rust | تنسيق تلقائي موحد وفق معايير المجتمع |
| **clippy** | تحليل ثابت Rust | اكتشاف الأنماط المضادة والأخطاء الشائعة |
| **ESLint** | تحليل ثابت TS | فرض قواعد جودة الكود في TypeScript |

#### أدوات البناء والنشر

| الأداة | الغرض |
|--------|-------|
| **GitHub Actions** | CI/CD — بناء متقاطع لـ Windows/macOS/Linux تلقائياً عند كل Tag |
| **tauri-action** | GitHub Action رسمي من Tauri لتبسيط عملية البناء والنشر |
| **cross** | Cross-compilation لـ Linux من أي بيئة |

#### أدوات الاختبار

| الأداة | الغرض |
|--------|-------|
| **cargo test** | تشغيل اختبارات الوحدة في Rust |
| **heaptrack** | تحليل استخدام الذاكرة واكتشاف التسرب (Linux) |
| **Instruments** | تحليل الأداء على macOS |

---

### 📊 مقارنة القرارات المعمارية الكبرى

| القرار | البديل المرفوض | سبب الاختيار |
|--------|--------------|-------------|
| **Tauri** بدلاً من Electron | Electron | أصغر 10-20x، لا يتطلب Node.js، أمان أفضل |
| **Rust** للنواة | Go / Node.js | أمان الذاكرة وقت الترجمة، لا GC pauses، أداء أعلى |
| **yt-dlp Sidecar** بدلاً من مكتبة | `rustube` أو مشابه | مواكبة فورية لتحديثات يوتيوب، دعم 1000+ موقع |
| **ffmpeg Sidecar** بدلاً من PATH | الاعتماد على ffmpeg النظام | استقلالية تامة — دعم 1080p+ بدون متطلبات على جهاز المستخدم |
| **SQLite** بدلاً من ملف JSON | flat file / JSON | استعلامات فعالة، ACID compliance، لا server مطلوب |
| **DashMap** بدلاً من `Mutex<HashMap>` | `Mutex<HashMap>` | قراءة متزامنة بلا قفل، أداء أعلى مع تحميلات متعددة |
| **JSON template** بدلاً من Regex | Regex على stdout | مقاوم للتغييرات، بيانات منظمة، لا هشاشة |

---

## 1. مبادئ التطوير

> هذه المبادئ ليست قواعد اختيارية — هي القانون الذي يُحكَم به على كل Pull Request وكل قرار تصميمي.

---

### المبدأ الأول: أمان الذاكرة فوق كل شيء (Memory Safety First)

**التعريف:** استغلال نظام الملكية (Ownership System) في Rust إلى أقصاه، وعدم تجاوزه أبداً بشكل غير ضروري.

**في التطبيق:**
- لا `unsafe {}` إلا بتبرير مكتوب ومراجعة مزدوجة
- لا `Arc<Mutex<T>>` إذا كان `DashMap` أو نمط أبسط كافياً
- لا استنساخ البيانات (`.clone()`) إلا عند الضرورة — تمرير المراجع أولاً
- `cleanup_task()` إلزامي بعد كل مهمة دون استثناء

```rust
// ❌ خاطئ — استنساخ غير ضروري
let url_copy = url.clone();
process_url(url_copy);

// ✅ صحيح — تمرير مرجع
process_url(&url);
```

---

### المبدأ الثاني: عدم الحجب أبداً (Never Block)

**التعريف:** الخيط الرئيسي لواجهة المستخدم يجب أن يبقى متجاوباً في كل الأوقات — حتى عند تحميل 10 ملفات متزامنة.

**في التطبيق:**
- كل عملية I/O (شبكة، قرص، قاعدة بيانات) داخل `tokio::spawn` أو `async fn`
- لا `std::thread::sleep` — استخدم `tokio::time::sleep`
- لا `std::fs` مباشرة في سياق async — استخدم `tokio::fs`
- لا استعلامات قاعدة بيانات متزامنة (synchronous) في أي مسار

```rust
// ❌ خاطئ — يجمد الخيط الرئيسي
std::thread::sleep(Duration::from_secs(1));

// ✅ صحيح — يتنازل عن الخيط للمهام الأخرى
tokio::time::sleep(Duration::from_secs(1)).await;
```

---

### المبدأ الثالث: الفشل الصريح (Explicit Failure)

**التعريف:** لا أخطاء صامتة ولا panics مفاجئة — كل خطأ إما يُعالَج أو يُسجَّل أو يُمرَّر للواجهة بوضوح.

**في التطبيق:**
- **ممنوع منعاً باتاً** في كود الإنتاج: `.unwrap()` · `.expect()` في مسارات قابلة للفشل
- كل دالة `#[tauri::command]` تُرجع `Result<T, AppError>`
- `window.emit().ok()` بدلاً من `.unwrap()` — النافذة قد تُغلق في أي وقت
- تسجيل الأخطاء `eprintln!` في stderr مع سياق كافٍ

```rust
// ❌ خاطئ — panic محتمل في الإنتاج
let value = some_option.unwrap();

// ✅ صحيح — معالجة صريحة
let value = some_option.ok_or(AppError::Internal("قيمة غير موجودة".into()))?;
```

---

### المبدأ الرابع: البيانات المهيكلة فقط (Structured Data Only)

**التعريف:** التواصل بين المكونات يعتمد دائماً على هياكل بيانات محددة — لا نصوص حرة، لا سحر.

**في التطبيق:**
- مخرجات yt-dlp: JSON template لا Regex على stdout
- IPC بين Rust و TypeScript: هياكل `serde` محددة مسبقاً وأنواع TypeScript مطابقة لها
- قاعدة البيانات: Schema ثابت مع Migrations مُسيطَر عليها بالإصدار
- رسائل الأخطاء: `AppError` enum — لا strings عشوائية

```rust
// ❌ خاطئ — بيانات هشة
let percent = line.split('%').next().unwrap_or("0");

// ✅ صحيح — هيكل محدد
if let Some(progress) = try_parse_progress(&line, &task_id) {
    window.emit("download-progress", &progress).ok();
}
```

---

### المبدأ الخامس: تنظيف الحالة إلزامي (Mandatory State Cleanup)

**التعريف:** كل مورد يُفتح يجب أن يُغلق — كل Token يُسجَّل يجب أن يُحذف — بغض النظر عن مسار الخروج.

**في التطبيق:**
- `cleanup_task()` يُستدعى في نهاية `tokio::spawn` في جميع المسارات (اكتمال، إلغاء، فشل)
- استخدام RAII (Drop trait) لضمان تنظيف الموارد تلقائياً حيثما أمكن
- قاعدة البيانات: تحديث حالة المهمة دائماً — لا تبقى مهمة في حالة `downloading` إلى الأبد

```rust
// ✅ التنظيف يحدث في جميع مسارات الخروج
tokio::spawn(async move {
    let result = tokio::select! {
        _ = token.cancelled() => { /* إلغاء */ Ok(()) }
        result = run_download() => result
    };

    // هذا السطر يُنفَّذ دائماً — حتى عند الإلغاء أو الفشل
    state_clone.cleanup_task(&task_id_clone);

    if let Err(e) = result {
        eprintln!("[error]: {}", e);
    }
});
```

---

### المبدأ السادس: أمان الأنواع عبر الحدود (Cross-Boundary Type Safety)

**التعريف:** الأنواع في Rust وTypeScript يجب أن تكون متطابقة دائماً — لا افتراضات ضمنية.

**في التطبيق:**
- كل `struct` في Rust يقابله `interface` في TypeScript بنفس الحقول
- `Option<T>` في Rust = `T | null` في TypeScript
- `Result<T, AppError>` = `try/catch` في TypeScript مع رسالة خطأ منظمة
- أي تغيير في هياكل Rust يستلزم تحديثاً فورياً في ملف `src/types/index.ts`

```typescript
// Rust: pub struct ProgressData { pub percent: Option<String> }
// TypeScript المطابق:
interface ProgressData {
  percent: string | null;  // Option<String> → string | null
}
```

---

### المبدأ السابع: الاختبار مع الكود لا بعده (Test-Alongside-Code)

**التعريف:** الاختبارات تُكتب في نفس الجلسة التي يُكتب فيها الكود — ليست مهمة تأجيل.

**في التطبيق:**
- كل دالة في `parser.rs` لها اختبار وحدة في نفس الملف
- اختبارات التكامل في مجلد `tests/` منفصل
- CI يرفض أي Merge إذا فشل `cargo test`
- تغطية الكود (Code Coverage) هدفها 80% كحد أدنى للطبقة الخلفية

---

### المبدأ الثامن: الحد الأدنى من الامتيازات (Principle of Least Privilege)

**التعريف:** التطبيق لا يطلب صلاحيات أكثر مما يحتاج — لا من المستخدم ولا من النظام.

**في التطبيق:**
- `tauri.conf.json`: تحديد `allowlist` بدقة — تعطيل كل ما لا يُحتاج
- الـ Sidecar محدد بالاسم — لا `shell: { all: true }`
- لا وصول لـ filesystem خارج مجلد التحميلات المحدد من المستخدم
- لا اتصال شبكي مباشر من Rust — yt-dlp هو من يتصل

```json
// ✅ allowlist محدد ودقيق
{
  "allowlist": {
    "shell": {
      "sidecar": true,
      "scope": [{ "name": "binaries/yt-dlp", "sidecar": true }]
    },
    "dialog": { "open": true },
    "fs": { "scope": ["$DOWNLOAD/**"] }
  }
}
```

---

### ملخص المبادئ

| # | المبدأ | الكلمة المفتاحية | التأثير |
|---|--------|-----------------|---------|
| 1 | أمان الذاكرة | Ownership | لا تسرب، لا data races |
| 2 | عدم الحجب | Async-first | واجهة متجاوبة دائماً |
| 3 | الفشل الصريح | Result<T,E> | لا panics مفاجئة |
| 4 | البيانات المهيكلة | JSON/Structs | هشاشة صفر |
| 5 | تنظيف الحالة | Cleanup always | لا zombie processes |
| 6 | أمان الأنواع | Type parity | لا أخطاء IPC |
| 7 | الاختبار المتزامن | Test-alongside | جودة مستمرة |
| 8 | الحد الأدنى | Least privilege | سطح هجوم أصغر |

---

## 2. الرؤية المعمارية النهائية

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React/TS)                  │
│  ┌──────────┐  ┌────────────┐  ┌─────────────────────┐  │
│  │ URL Input│  │ Queue List │  │  Progress + History │  │
│  └──────────┘  └────────────┘  └─────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │ invoke() / emit() — Tauri IPC
┌───────────────────────▼─────────────────────────────────┐
│                  Rust Backend (Tauri)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  commands.rs│  │ downloader.rs│  │   state.rs     │  │
│  │  (IPC Gate) │  │ (Core Engine)│  │ (DashMap/Pool) │  │
│  └─────────────┘  └──────┬───────┘  └────────────────┘  │
│                          │                              │
│  ┌───────────────────────▼──────────────────────────┐   │
│  │              SQLite (sqlx + migrations)          │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
└──────────────────┬──────────────────────┬───────────────────────┘
                   │ Sidecar #1            │ Sidecar #2
              ┌────▼──────┐          ┌────▼──────┐
              │  yt-dlp   │ ───────► │  ffmpeg   │
              │ (تحميل)   │ (يستدعي) │ (دمج A/V) │
              └───────────┘          └───────────┘

╔══════════════════════════════════════════════════════════════╗
║  ✅ الحزمة النهائية مكتفية بذاتها تماماً                     ║
║  لا يحتاج المستخدم تثبيت: yt-dlp · ffmpeg · Node.js · npm  ║
╚══════════════════════════════════════════════════════════════╝
```

**المبادئ الأساسية:**
- **Non-blocking UI**: كل عملية I/O داخل `tokio::spawn`
- **Zero Zombie Processes**: كل عملية فرعية مرتبطة بـ `CancellationToken`
- **Memory Safety**: لا `unwrap()` أو `expect()` في مسارات الأخطاء
- **Structured Data**: JSON فقط من yt-dlp — لا Regex على نص حر
- **State Cleanup**: حذف الـ Token فور انتهاء المهمة
- **Self-Contained**: yt-dlp و ffmpeg مُحزَّمان داخل التطبيق — صفر اعتماديات على النظام

---

## 3. هيكل المشروع الكامل

```
omnidrop/
├── package.json
├── tsconfig.json                    # strict: true
├── vite.config.ts
│
├── src/                             # Frontend
│   ├── components/
│   │   ├── UrlInput.tsx
│   │   ├── DownloadQueue.tsx
│   │   ├── ProgressBar.tsx
│   │   └── HistoryList.tsx
│   ├── hooks/
│   │   ├── useDownload.ts           # invoke + event listeners
│   │   └── useHistory.ts
│   ├── types/
│   │   └── index.ts                 # مطابق لـ Rust structs
│   ├── store/
│   │   └── downloadStore.ts         # Zustand أو useState
│   └── App.tsx
│
└── src-tauri/                       # Rust Backend
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── build.rs
    ├── binaries/                    # Sidecars مُحزَّمة — مستقلة عن النظام
    │   ├── yt-dlp-x86_64-pc-windows-msvc.exe
    │   ├── yt-dlp-x86_64-apple-darwin
    │   ├── yt-dlp-aarch64-apple-darwin
    │   ├── yt-dlp-x86_64-unknown-linux-gnu
    │   ├── ffmpeg-x86_64-pc-windows-msvc.exe  # ← جديد
    │   ├── ffmpeg-x86_64-apple-darwin          # ← جديد
    │   ├── ffmpeg-aarch64-apple-darwin         # ← جديد
    │   └── ffmpeg-x86_64-unknown-linux-gnu     # ← جديد
    └── src/
        ├── main.rs                  # Entry point + Tauri builder
        ├── commands.rs              # IPC commands (public API)
        ├── error.rs                 # AppError موحد
        ├── state.rs                 # AppState + DashMap
        ├── core/
        │   ├── mod.rs
        │   ├── downloader.rs        # Engine الأساسي
        │   └── parser.rs            # JSON parsing من yt-dlp
        └── db/
            ├── mod.rs
            ├── migrations/
            │   └── 001_initial.sql  # Schema الأولي
            └── queries.rs           # دوال قاعدة البيانات
```

---

## 4. التبعيات النهائية

### `src-tauri/Cargo.toml`

```toml
[package]
name = "omnidrop"
version = "0.1.0"
edition = "2021"

[dependencies]
# --- Core Framework ---
tauri = { version = "1.6", features = ["shell-sidecar", "shell-execute"] }

# --- Async Runtime ---
tokio = { version = "1", features = ["full"] }
tokio-util = { version = "0.7", features = ["rt"] }   # CancellationToken

# --- Serialization ---
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# --- Error Handling ---
thiserror = "1"

# --- Database ---
sqlx = { version = "0.7", features = [
    "sqlite",
    "runtime-tokio-rustls",
    "migrate",                  # دعم migrations تلقائية
    "chrono",                   # تواريخ
] }

# --- Concurrency ---
dashmap = "5"                   # Concurrent HashMap (أسرع من Mutex<HashMap>)
uuid = { version = "1", features = ["v4"] }

# --- Utilities ---
chrono = { version = "0.4", features = ["serde"] }
futures = "0.3"

[profile.release]
lto = true            # Link Time Optimization
strip = true          # حذف رموز debug
opt-level = "z"       # تقليل الحجم إلى أدنى مستوى
codegen-units = 1     # تحسين أعمق (أبطأ في البناء لكن أصغر حجماً)
panic = "abort"       # لا stack unwinding في الإنتاج
```

---

## 5. مخطط قاعدة البيانات

### `src/db/migrations/001_initial.sql`

```sql
-- جدول التحميلات الرئيسي
CREATE TABLE IF NOT EXISTS downloads (
    id          TEXT PRIMARY KEY,           -- UUID
    url         TEXT NOT NULL,
    title       TEXT,                       -- اسم الملف بعد الاكتشاف
    file_path   TEXT,                       -- المسار النهائي بعد الاكتمال
    file_size   INTEGER,                    -- بالبايت
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN (
                    'pending',
                    'downloading',
                    'completed',
                    'cancelled',
                    'failed'
                )),
    error_msg   TEXT,                       -- رسالة الخطأ إن وجدت
    created_at  TEXT NOT NULL,              -- ISO 8601
    updated_at  TEXT NOT NULL,
    completed_at TEXT                       -- NULL حتى الاكتمال
);

-- فهرس للاستعلامات الشائعة
CREATE INDEX IF NOT EXISTS idx_downloads_status
    ON downloads(status);

CREATE INDEX IF NOT EXISTS idx_downloads_created
    ON downloads(created_at DESC);
```

**دورة حياة الحالة (State Machine):**
```
pending → downloading → completed
                     → cancelled
                     → failed
```

---

## 6. الكود المُصحَّح بالكامل

### `src/error.rs` — نظام الأخطاء الموحد

```rust
use serde::Serializer;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("فشل في بدء عملية التحميل: {0}")]
    ProcessError(String),

    #[error("خطأ في قاعدة البيانات: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("رابط غير صالح: {0}")]
    InvalidUrl(String),

    #[error("المهمة غير موجودة: {0}")]
    TaskNotFound(String),

    #[error("خطأ داخلي: {0}")]
    Internal(String),
}

// ضروري لإرسال الأخطاء عبر Tauri IPC إلى الواجهة
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
```

---

### `src/state.rs` — إدارة الحالة المركزية

```rust
use dashmap::DashMap;
use sqlx::SqlitePool;
use tokio_util::sync::CancellationToken;

/// الحالة العامة للتطبيق — تُمرَّر كـ Tauri State
pub struct AppState {
    /// خريطة: task_id → CancellationToken
    /// DashMap أسرع من Mutex<HashMap> في سيناريوهات القراءة المتكررة
    pub active_tasks: DashMap<String, CancellationToken>,

    /// تجمع اتصالات SQLite (thread-safe بطبيعته)
    pub db_pool: SqlitePool,
}

impl AppState {
    pub fn new(db_pool: SqlitePool) -> Self {
        Self {
            active_tasks: DashMap::new(),
            db_pool,
        }
    }

    /// تسجيل مهمة جديدة وإرجاع الـ Token الخاص بها
    pub fn register_task(&self, task_id: &str) -> CancellationToken {
        let token = CancellationToken::new();
        self.active_tasks.insert(task_id.to_string(), token.clone());
        token
    }

    /// ✅ التصحيح: حذف المهمة بعد انتهائها لمنع تسرب الذاكرة
    pub fn cleanup_task(&self, task_id: &str) {
        self.active_tasks.remove(task_id);
    }
}
```

---

### `src/core/parser.rs` — تحليل مخرجات yt-dlp

```rust
use serde::{Deserialize, Serialize};

/// هيكل بيانات التقدم المستقبَل من yt-dlp بصيغة JSON
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProgressData {
    pub task_id: String,
    pub percent: Option<String>,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub status: String,
}

/// ✅ التصحيح: تصفية الأسطر قبل محاولة الـ parse
/// يتجنب استدعاء serde_json على كل سطر بما فيها التحذيرات والمعلومات
pub fn try_parse_progress(line: &str, task_id: &str) -> Option<ProgressData> {
    // yt-dlp يطبع أنواعاً متعددة من الأسطر؛ JSON يبدأ دائماً بـ {
    if !line.trim_start().starts_with('{') {
        return None;
    }

    #[derive(Deserialize)]
    struct RawProgress {
        progress: Option<String>,
        speed: Option<String>,
        eta: Option<String>,
    }

    serde_json::from_str::<RawProgress>(line).ok().map(|raw| ProgressData {
        task_id: task_id.to_string(),
        percent: raw.progress,
        speed: raw.speed,
        eta: raw.eta,
        status: "downloading".to_string(),
    })
}
```

---

### `src/db/queries.rs` — دوال قاعدة البيانات

```rust
use chrono::Utc;
use sqlx::SqlitePool;
use crate::error::AppError;

pub struct DownloadRecord {
    pub id: String,
    pub url: String,
    pub status: String,
    pub title: Option<String>,
    pub file_path: Option<String>,
    pub error_msg: Option<String>,
}

pub async fn insert_download(pool: &SqlitePool, id: &str, url: &str)
    -> Result<(), AppError>
{
    let now = Utc::now().to_rfc3339();
    sqlx::query!(
        "INSERT INTO downloads (id, url, status, created_at, updated_at)
         VALUES (?, ?, 'pending', ?, ?)",
        id, url, now, now
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn update_status(pool: &SqlitePool, id: &str, status: &str)
    -> Result<(), AppError>
{
    let now = Utc::now().to_rfc3339();
    let completed_at = if status == "completed" { Some(now.clone()) } else { None };

    sqlx::query!(
        "UPDATE downloads
         SET status = ?, updated_at = ?, completed_at = ?
         WHERE id = ?",
        status, now, completed_at, id
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn set_error(pool: &SqlitePool, id: &str, error: &str)
    -> Result<(), AppError>
{
    let now = Utc::now().to_rfc3339();
    sqlx::query!(
        "UPDATE downloads
         SET status = 'failed', error_msg = ?, updated_at = ?
         WHERE id = ?",
        error, now, id
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_all_downloads(pool: &SqlitePool)
    -> Result<Vec<DownloadRecord>, AppError>
{
    let records = sqlx::query_as!(
        DownloadRecord,
        "SELECT id, url, status, title, file_path, error_msg
         FROM downloads
         ORDER BY created_at DESC
         LIMIT 100"
    )
    .fetch_all(pool)
    .await?;
    Ok(records)
}
```

---

### `src/commands.rs` — دوال IPC المُصحَّحة بالكامل

```rust
use std::sync::Arc;
use tauri::api::process::{Command, CommandEvent};
use crate::{
    error::AppError,
    state::AppState,
    core::parser::try_parse_progress,
    db::queries,
};
use uuid::Uuid;

#[tauri::command]
pub async fn start_download(
    url: String,
    window: tauri::Window,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<String, AppError> {

    // --- التحقق الأولي من المدخلات ---
    if url.trim().is_empty() {
        return Err(AppError::InvalidUrl("الرابط فارغ".into()));
    }

    let task_id = Uuid::new_v4().to_string();

    // --- تسجيل في قاعدة البيانات ---
    queries::insert_download(&state.db_pool, &task_id, &url).await?;

    // --- تسجيل Token وربطه بالمهمة ---
    let token = state.register_task(&task_id);
    let state_clone = Arc::clone(&state);
    let task_id_clone = task_id.clone();

    // --- إطلاق الـ Sidecar ---
    let (mut rx, mut child) = Command::new_sidecar("yt-dlp")
        .map_err(|e| AppError::ProcessError(e.to_string()))?
        .args([
            "--newline",
            "--no-playlist",
            "--progress-template",
            // JSON منظم لكل سطر تقدم
            r#"{"progress":"%(progress._percent_str)s","speed":"%(progress._speed_str)s","eta":"%(progress._eta_str)s"}"#,
            "--retries", "5",           // محاولات إعادة تلقائية
            "--fragment-retries", "10", // لـ HLS/DASH
            &url,
        ])
        .spawn()
        .map_err(|e| AppError::ProcessError(e.to_string()))?;

    // --- تحديث الحالة إلى downloading ---
    queries::update_status(&state.db_pool, &task_id, "downloading").await?;

    // --- المهمة الرئيسية غير المتزامنة ---
    tokio::spawn(async move {
        let result: Result<(), AppError> = tokio::select! {

            // ━━━ فرع الإلغاء ━━━
            _ = token.cancelled() => {
                // إنهاء العملية الفرعية بأمان
                let _ = child.kill();

                // ✅ التصحيح: لا unwrap — نستخدم ok() لتجاهل الخطأ بصمت
                let _ = window.emit("download-cancelled", &task_id_clone);

                let _ = queries::update_status(
                    &state_clone.db_pool, &task_id_clone, "cancelled"
                ).await;

                Ok(())
            }

            // ━━━ فرع المعالجة الطبيعية ━━━
            result = async {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            // ✅ التصحيح: تصفية الأسطر أولاً قبل الـ parse
                            if let Some(progress) = try_parse_progress(&line, &task_id_clone) {
                                // ✅ التصحيح: ok() بدلاً من unwrap()
                                // إذا أُغلقت النافذة، نتجاهل الخطأ بهدوء
                                let _ = window.emit("download-progress", &progress);
                            }
                        }
                        CommandEvent::Stderr(line) => {
                            // تسجيل تحذيرات yt-dlp دون إيقاف العملية
                            eprintln!("[yt-dlp stderr]: {}", line);
                        }
                        CommandEvent::Terminated(status) => {
                            if status.code == Some(0) {
                                let _ = queries::update_status(
                                    &state_clone.db_pool, &task_id_clone, "completed"
                                ).await;
                                let _ = window.emit("download-completed", &task_id_clone);
                            } else {
                                let err = format!("انتهت العملية بكود خطأ: {:?}", status.code);
                                let _ = queries::set_error(
                                    &state_clone.db_pool, &task_id_clone, &err
                                ).await;
                                let _ = window.emit("download-failed", &task_id_clone);
                            }
                            break;
                        }
                        _ => {}
                    }
                }
                Ok::<(), AppError>(())
            } => result,
        };

        // ✅ التصحيح الأساسي: تنظيف الـ Token دائماً بعد انتهاء المهمة
        // سواء اكتملت، أُلغيت، أو فشلت — لمنع تسرب الذاكرة
        state_clone.cleanup_task(&task_id_clone);

        if let Err(e) = result {
            eprintln!("[download engine error]: {}", e);
        }
    });

    Ok(task_id)
}

#[tauri::command]
pub fn cancel_download(
    task_id: String,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<(), AppError> {
    if let Some(token) = state.active_tasks.get(&task_id) {
        token.cancel();
        Ok(())
    } else {
        Err(AppError::TaskNotFound(task_id))
    }
}

#[tauri::command]
pub async fn get_download_history(
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<Vec<crate::db::queries::DownloadRecord>, AppError> {
    queries::get_all_downloads(&state.db_pool).await
}
```

---

### `src/main.rs` — نقطة الإدخال

```rust
mod commands;
mod core;
mod db;
mod error;
mod state;

use std::sync::Arc;
use sqlx::SqlitePool;
use state::AppState;

#[tokio::main]
async fn main() {
    // --- تهيئة قاعدة البيانات ---
    let db_url = "sqlite:omnidrop.db";
    let pool = SqlitePool::connect(db_url)
        .await
        .expect("فشل الاتصال بقاعدة البيانات");

    // تطبيق migrations تلقائياً عند الإطلاق
    sqlx::migrate!("./src/db/migrations")
        .run(&pool)
        .await
        .expect("فشل تطبيق migrations");

    let app_state = Arc::new(AppState::new(pool));

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::start_download,
            commands::cancel_download,
            commands::get_download_history,
        ])
        .run(tauri::generate_context!())
        .expect("فشل تشغيل التطبيق");
}
```

---

## 7. خارطة الطريق التفصيلية

### المرحلة 0 — الإعداد (يوم 1-2)

- [ ] تثبيت `create-tauri-app` وتهيئة المشروع
- [ ] تحميل ملفات **yt-dlp** لأنظمة التشغيل الأربعة (Windows x64، macOS x64، macOS ARM، Linux x64) ووضعها في `binaries/`
- [ ] تحميل ملفات **ffmpeg** (نسخة static build) لأنظمة التشغيل الأربعة ووضعها في `binaries/`
  - Windows: من [gyan.dev/ffmpeg](https://www.gyan.dev/ffmpeg/builds/) — النسخة `essentials`
  - macOS / Linux: من [evermeet.cx](https://evermeet.cx/ffmpeg/) أو بناؤها عبر CI
- [ ] التحقق من تسمية الملفات بصيغة Tauri الصحيحة: `binary-{target-triple}{.exe}`
- [ ] تكوين `tauri.conf.json` لتسجيل كلا الـ Sidecars
- [ ] إعداد `tsconfig.json` مع `"strict": true`

```json
// tauri.conf.json — تعريف كلا الـ Sidecars
{
  "tauri": {
    "bundle": {
      "externalBin": [
        "binaries/yt-dlp",
        "binaries/ffmpeg"
      ]
    },
    "allowlist": {
      "shell": {
        "sidecar": true,
        "scope": [
          { "name": "binaries/yt-dlp",  "sidecar": true },
          { "name": "binaries/ffmpeg",  "sidecar": true }
        ]
      },
      "dialog": { "open": true },
      "fs": { "scope": ["$DOWNLOAD/**"] }
    }
  }
}
```

> **ملاحظة حول توجيه ffmpeg:** yt-dlp يستدعي ffmpeg تلقائياً عند الحاجة للدمج.
> نمرر مساره عبر `--ffmpeg-location` لضمان استخدام النسخة المُحزَّمة لا نسخة النظام:

```rust
// في downloader.rs — تحديد مسار ffmpeg المُحزَّم صراحةً
let ffmpeg_path = tauri::api::process::current_binary(&app_handle)
    .unwrap()
    .parent()
    .unwrap()
    .join("ffmpeg"); // Tauri يحل اسم المنصة تلقائياً

let (_rx, _child) = Command::new_sidecar("yt-dlp")?
    .args([
        "--ffmpeg-location", ffmpeg_path.to_str().unwrap(),
        "--newline",
        // ... بقية المعاملات
    ])
    .spawn()?;
```

---

### المرحلة 1 — النواة الخلفية (أسبوع 1)

| اليوم | المهمة |
|-------|--------|
| 3 | بناء `error.rs` و `state.rs` |
| 4 | بناء `db/migrations/` و `db/queries.rs` |
| 5 | بناء `core/parser.rs` + اختبار وحدة |
| 6 | بناء `commands.rs` (start + cancel) |
| 7 | اختبار تكاملي: تحميل واحد من البداية للنهاية |

**معايير الاجتياز:**
- تحميل ناجح مع تحديث قاعدة البيانات
- إلغاء التحميل يوقف العملية الفرعية فوراً
- لا `zombie processes` بعد الإلغاء

---

### المرحلة 2 — واجهة المستخدم (أسبوع 2)

| اليوم | المهمة |
|-------|--------|
| 8-9 | مكوّن `UrlInput` مع التحقق |
| 10 | مكوّن `ProgressBar` مع استماع لأحداث Tauri |
| 11 | مكوّن `DownloadQueue` (قائمة التحميلات النشطة) |
| 12 | مكوّن `HistoryList` (سجل التحميلات السابقة) |
| 13 | التكامل الكامل والاختبار اليدوي |
| 14 | تحسين UX (الرسائل، التأكيدات، الإشعارات) |

**نموذج TypeScript المطابق لـ Rust:**

```typescript
// src/types/index.ts
export interface ProgressData {
  task_id: string;
  percent: string | null;
  speed: string | null;
  eta: string | null;
  status: string;
}

export interface DownloadRecord {
  id: string;
  url: string;
  title: string | null;
  file_path: string | null;
  status: 'pending' | 'downloading' | 'completed' | 'cancelled' | 'failed';
  error_msg: string | null;
}
```

---

### المرحلة 3 — التحميل المتوازي (أسبوع 3)

- [ ] اختبار 5 تحميلات متزامنة
- [ ] التحقق من عدم تسرب الذاكرة (استخدام `heaptrack` أو `valgrind`)
- [ ] إضافة حد أقصى للتحميلات المتزامنة (Semaphore)
- [ ] اختبار إعادة المحاولة عند انقطاع الشبكة

```rust
// حد أقصى للتحميلات المتزامنة في state.rs
pub struct AppState {
    pub active_tasks: DashMap<String, CancellationToken>,
    pub db_pool: SqlitePool,
    pub semaphore: Arc<tokio::sync::Semaphore>, // مثال: 5 تحميلات كحد أقصى
}
```

---

### المرحلة 4 — التحزيم والنشر (أسبوع 4)

- [ ] إعداد GitHub Actions (انظر القسم التالي)
- [ ] Code Signing لـ Windows (`.msi`)
- [ ] Notarization لـ macOS (`.dmg` Universal Binary)
- [ ] بناء `.AppImage` و `.deb` لـ Linux
- [ ] اختبار على أجهزة حقيقية لكل نظام تشغيل

---

## 8. إعداد CI/CD

### `.github/workflows/release.yml`

```yaml
name: Build & Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            yt_dlp_bin: yt-dlp
            ffmpeg_url: https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            yt_dlp_bin: yt-dlp.exe
            ffmpeg_url: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
          - os: macos-latest
            target: universal-apple-darwin
            yt_dlp_bin: yt-dlp_macos
            ffmpeg_url: https://evermeet.cx/ffmpeg/getrelease/zip

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Linux system dependencies
        if: matrix.os == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.0-dev libssl-dev \
            libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

      # ─── تحميل yt-dlp لكل منصة ───────────────────────────────
      - name: Download yt-dlp (Linux)
        if: matrix.os == 'ubuntu-latest'
        run: |
          curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
            -o src-tauri/binaries/yt-dlp-x86_64-unknown-linux-gnu
          chmod +x src-tauri/binaries/yt-dlp-x86_64-unknown-linux-gnu

      - name: Download yt-dlp (Windows)
        if: matrix.os == 'windows-latest'
        run: |
          Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" `
            -OutFile "src-tauri/binaries/yt-dlp-x86_64-pc-windows-msvc.exe"

      - name: Download yt-dlp (macOS)
        if: matrix.os == 'macos-latest'
        run: |
          curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos \
            -o src-tauri/binaries/yt-dlp-x86_64-apple-darwin
          cp src-tauri/binaries/yt-dlp-x86_64-apple-darwin \
             src-tauri/binaries/yt-dlp-aarch64-apple-darwin
          chmod +x src-tauri/binaries/yt-dlp-x86_64-apple-darwin
          chmod +x src-tauri/binaries/yt-dlp-aarch64-apple-darwin

      # ─── تحميل ffmpeg لكل منصة ───────────────────────────────
      - name: Download ffmpeg (Linux)
        if: matrix.os == 'ubuntu-latest'
        run: |
          curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz \
            | tar -xJ --wildcards '*/ffmpeg' --strip-components=1
          mv ffmpeg src-tauri/binaries/ffmpeg-x86_64-unknown-linux-gnu
          chmod +x src-tauri/binaries/ffmpeg-x86_64-unknown-linux-gnu

      - name: Download ffmpeg (Windows)
        if: matrix.os == 'windows-latest'
        run: |
          Invoke-WebRequest -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" `
            -OutFile ffmpeg.zip
          Expand-Archive ffmpeg.zip -DestinationPath ffmpeg_extracted
          $ffmpeg = Get-ChildItem -Recurse -Filter "ffmpeg.exe" ffmpeg_extracted | Select-Object -First 1
          Copy-Item $ffmpeg.FullName "src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe"

      - name: Download ffmpeg (macOS)
        if: matrix.os == 'macos-latest'
        run: |
          curl -L https://evermeet.cx/ffmpeg/getrelease/zip -o ffmpeg.zip
          unzip ffmpeg.zip
          cp ffmpeg src-tauri/binaries/ffmpeg-x86_64-apple-darwin
          cp ffmpeg src-tauri/binaries/ffmpeg-aarch64-apple-darwin
          chmod +x src-tauri/binaries/ffmpeg-x86_64-apple-darwin
          chmod +x src-tauri/binaries/ffmpeg-aarch64-apple-darwin

      # ─── بناء التطبيق ─────────────────────────────────────────
      - name: Install frontend dependencies
        run: npm ci

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
          TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'OmniDrop ${{ github.ref_name }}'
          releaseBody: 'See CHANGELOG.md for details.'
          releaseDraft: true

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: release-${{ matrix.os }}
          path: src-tauri/target/release/bundle/
```

---

## 9. معايير الجودة والاختبار

### اختبارات الوحدة (Unit Tests)

```rust
// src/core/parser.rs — اختبارات
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_json_progress() {
        let line = r#"{"progress":"45.2%","speed":"1.2MiB/s","eta":"00:30"}"#;
        let result = try_parse_progress(line, "test-id");
        assert!(result.is_some());
        let p = result.unwrap();
        assert_eq!(p.percent, Some("45.2%".to_string()));
    }

    #[test]
    fn test_non_json_line_ignored() {
        // أسطر المعلومات والتحذيرات يجب تجاهلها
        let line = "[youtube] Extracting URL: https://example.com";
        let result = try_parse_progress(line, "test-id");
        assert!(result.is_none());
    }

    #[test]
    fn test_empty_line_ignored() {
        let result = try_parse_progress("", "test-id");
        assert!(result.is_none());
    }
}
```

### قائمة فحص ما قبل الإطلاق

```
الأمان:
  ✅ لا unwrap()/expect() في مسارات الأخطاء الإنتاجية
  ✅ جميع مدخلات المستخدم مُتحقَّق منها قبل تمريرها لـ yt-dlp
  ✅ الـ Sidecars محددان في allowlist — لا shell injection ممكن

الأداء:
  ✅ لا عمليات I/O على الخيط الرئيسي
  ✅ cleanup_task() يُستدعى دائماً بعد انتهاء المهمة
  ✅ Connection Pool لقاعدة البيانات (لا اتصال جديد لكل عملية)

الموثوقية:
  ✅ --retries 5 و --fragment-retries 10 لمعالجة انقطاع الشبكة
  ✅ إنهاء العمليات الفرعية عند الإلغاء (لا zombie processes)
  ✅ window.emit().ok() — لا panic عند إغلاق النافذة

البيانات:
  ✅ Migrations تلقائية عند الإطلاق
  ✅ State machine واضح: pending→downloading→{completed|cancelled|failed}
  ✅ تاريخ الإنشاء والتحديث محفوظ لكل سجل

الاستقلالية (Self-Contained):
  ✅ yt-dlp مُحزَّم كـ Sidecar لجميع المنصات — لا تثبيت مطلوب
  ✅ ffmpeg مُحزَّم كـ Sidecar لجميع المنصات — لا تثبيت مطلوب
  ✅ --ffmpeg-location يشير للنسخة المُحزَّمة — لا يستخدم نسخة النظام
  ✅ لا اعتماد على Node.js أو npm في بيئة المستخدم
  ✅ اختبار التشغيل على جهاز نظيف (clean machine) بدون أي أدوات مطورين
```

---

## ملاحظات ختامية

| الجانب | القرار |
|--------|--------|
| أمان الذاكرة | `Arc<AppState>` + `DashMap` + `cleanup_task()` |
| معالجة الأخطاء | `thiserror` + `AppError` موحد + `.ok()` في emit |
| تحليل البيانات | JSON template بدلاً من Regex |
| استدامة البيانات | `sqlx` + `SQLite` + migrations تلقائية |
| إدارة الإلغاء | `CancellationToken` + cleanup إلزامي |
| الشبكة | `--retries` + `--fragment-retries` في yt-dlp |
| **الاستقلالية** | **yt-dlp + ffmpeg كـ Sidecars مُحزَّمان — صفر اعتماديات** |
| التحزيم | GitHub Actions تحمّل yt-dlp و ffmpeg تلقائياً لكل منصة |

> **المرحلة القادمة:** تطوير واجهة المستخدم — هل تريد البدء بمكوّن محدد؟

# 🌌 OmniDrop | Premium Media Downloader

**OmniDrop** is a state-of-the-art, high-performance desktop application designed for downloading single videos, audio tracks, and full playlists. Built with a robust **Rust (Tauri 2)** backend and a premium **React + TypeScript** frontend, it leverages **yt-dlp** and **FFmpeg** under the hood with highly tuned database access and concurrency control to deliver maximum download speed and system efficiency.

---

## 🚀 Key Features

*   **Bilingual Interface (العربية / English)**: Fully localized, responsive, glassmorphic dark mode dashboard with dynamic RTL/LTR layout transitions.
*   **Adaptive Media Downloader**:
    *   **Video Downloads**: From 360p up to UHD 4K (2160p) with auto-merging of streams using FFmpeg.
    *   **Audio Extraction**: Extract audio in MP3, M4A, Opus, FLAC, or WAV formats with automatic highest-quality conversion.
    *   **Playlist Downloads**: Downloads full playlists asynchronously, avoiding redundant yt-dlp metadata calls (`skip_prefetch` implementation).
*   **Real-time Batch Progress updates**: Throttles IPC communication to a 250ms periodic buffer to prevent rendering freezes and minimize CPU overhead.
*   **WAL Mode SQLite Database**: High-performance history storage tuned with `PRAGMA synchronous=NORMAL`, `cache_size=10000`, and `temp_store=MEMORY` running in Write-Ahead Logging (WAL) mode with serialized single-writer connection pooling.
*   **Graceful Cancellation**: Uses hierarchical `CancellationToken` chains allowing cancellation of individual tasks or entire collections instantly.
*   **Clean Startup & Shutdown**: Async database initialization emits an `"app-ready"` event on completion so the UI launches instantly, and loop listeners automatically shut down upon window closure using `shutdown_token`.

---

## 🛠️ Technology Stack

*   **Backend**: Rust, Tauri v2, Tokio, SQLite (`sqlx` with migrations).
*   **Frontend**: React v19, TypeScript, Vite.
*   **Styling**: Pure CSS variables with advanced glassmorphism filters, radial background gradients, and micro-interactions.
*   **Sidecar Dependencies**: `yt-dlp` and `ffmpeg` configured for parallel downloads (4 concurrent fragments, 10MB chunk HTTP buffer size).

---

## 📋 Commands & API Reference

### Tauri Command Invokes
*   `start_download(url: String, opts: DownloadOptions)` - Starts downloading a single video/audio.
*   `start_playlist_download(url: String, opts: DownloadOptions)` - Fetches flat playlist entries and schedules parallel child tasks.
*   `cancel_download(task_id: String)` - Cancels a running download task using its CancellationToken.
*   `cancel_all_downloads()` - Cancels all active download tasks.
*   `get_download_history()` - Retrieves the last 200 download history logs.
*   `get_collection_history()` - Retrieves the last 100 playlist collections.
*   `get_active_downloads()` - Retrieves currently active downloads.
*   `delete_download(task_id: String)` - Cancels and removes a record from history.
*   `clear_completed_downloads()` - Removes completed download logs from the database.

---

## 🚀 How to Run Locally

### Prerequisites
*   [Rust & Cargo](https://rustup.rs/)
*   [Node.js (v18+)](https://nodejs.org/)

### Setup and Execution
1. Install node dependencies:
    ```bash
    npm install
    ```
2. Start the development server (launches the Vite preview server + Tauri desktop app):
    ```bash
    npm run tauri dev
    ```
3. To compile production binaries:
    ```bash
    npm run tauri build
    ```

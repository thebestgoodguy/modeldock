# Changelog

All notable changes to the **ModelDock** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-05-16

### 🚀 Added & Improved

* **Automated GitHub Releases Update System:**
  * Implemented an auto-update checker that queries the public GitHub Releases API (`api.github.com/repos/thebestgoodguy/modeldock/releases/latest`) in the background on application startup.
  * Added a dynamic version indicator (`v1.0.1`) at the bottom of the left navigation sidebar.
  * Integrated a glowing **Update** button next to the top navigation GitHub icon that appears when a newer version (e.g., `1.0.2`) is published.
  * Created a premium, glassmorphism **Update Modal** (`UpdateModal.tsx`) that beautifully displays the latest version number, the complete Markdown release notes/changelog, and direct action buttons for downloading the installer or opening the GitHub release page.

* **Settings & Directory Management Enhancements:**
  * **Native Directory Browsing (`selectFolder`):** Added a dedicated **Browse** button next to both the Download Directory and LM Studio Models input fields. Integrated a robust dual-mode folder picker: uses native Electron `dialog.showOpenDialog` when packaged, and falls back to a clean PowerShell `FolderBrowserDialog` via `/api/select-folder-fallback` when running in a standalone web browser.
  * **LM Studio Use/Reset Toggle:** Converted the LM Studio `Use` action into an intuitive toggle button. When clicked, it binds the download path to LM Studio and transforms into a red `Reset` button. Clicking `Reset` instantly restores the default download path (`C:/Downloads/HF_Models`), immediately bringing back the default model list into the UI view and reassuring users that their previously downloaded models remain fully intact on disk.
  * **Complete App Data Reset:** Fixed an issue where clicking "Reset App Data" did not restore default directory preferences. The backend `/api/reset-app-data` endpoint now completely clears and re-initializes the SQLite `settings` table, while the frontend dynamically reloads settings to immediately reflect defaults without requiring an app restart.

---

## [1.0.0] - 2026-05-16

### 🚀 Added & Improved

* **Real-time Downloaded Size Tracking (`downloadedSize`):**
  * Implemented an advanced regex parser in the Node.js backend (`server.js`) to extract the exact downloaded data size and total file size (e.g., `11.0M/4.48G`) directly from the live `tqdm` log stream.
  * Added the `downloadedSize` property to the API responses and the `DownloadItem` TypeScript interface.
  * Updated the download table (`Canvas.tsx`) and the right sidebar (`SidebarRight.tsx`) to display the downloaded size right next to the live download speed (`881 KB/s`). This completely eliminates UX ambiguity where users mistook download speed for downloaded size.

* **Clean Startup & Session Management:**
  * Added an automated database reset query during backend startup (`server.js`) that checks the SQLite database for any orphaned or interrupted downloads from previous sessions (`downloading`, `starting`, or `queued`).
  * Automatically sets their status to `paused` on application launch, ensuring the live queue starts in a perfectly clean, pristine state without frozen/zombie downloads. Users can seamlessly resume partial downloads at any time by clicking the **Play (Resume)** button.

* **Bulletproof Python Executable Discovery (`getPythonExecutable`):**
  * Engineered an intelligent Python runtime discovery mechanism for packaged Electron production builds.
  * Systematically scans standard system paths (`C:/Program Files/Python311/python.exe`), Scoop environments (`scoop/apps/python313/current/python.exe`), and local AppData directories using physical file verification (`fs.existsSync`). This guarantees the app locates and binds the exact Python interpreter containing the required `huggingface_hub` dependencies.

* **Enhanced Log Observability:**
  * Included absolute file paths for both the selected Python interpreter and the downloader script (`downloader.py`) inside the live download log stream. Users can easily inspect these details via the built-in Terminal modal.

---

### 🐛 Fixed

* **Packaged Electron ASAR Crash (`spawn ENOENT` & `cwd` Fix):**
  * Fixed a critical production bug where packaged Electron builds failed instantly upon starting a download. Previously, `child_process.spawn` used `cwd: __dirname`, which resolved to the virtual `app.asar` archive. Since the Windows kernel cannot recognize ASAR files as working directories, `spawn` threw an `ENOENT` error.
  * Updated `cwd` to `path.dirname(scriptPath)`, ensuring the child process uses the physical `resources` directory where `downloader.py` is unpacked.

* **Background Progress Bar Suppression:**
  * Resolved an issue where Python child processes spawned via Node pipes disabled `tqdm` progress bars due to the lack of a detected TTY environment.
  * Injected `TQDM_POSITION: "-1"` and `HF_HUB_DISABLE_PROGRESS_BARS: "0"` into the spawned environment variables, guaranteeing reliable, real-time progress percentages (`%`), speeds, and ETAs in the UI.

* **IDE Linting & Module Resolution:**
  * Installed `huggingface_hub` and its dependencies into the Scoop-based Python 3.13 environment selected by the editor (Pylance/Pyright), eliminating false-positive "Cannot find module" linting errors.

# ModelDock

<div align="center">

### Hugging Face model, dataset, and Space downloader with multi-threaded queueing, live progress, and seamless local folder integration in one desktop-style workspace.

[![GitHub release](https://img.shields.io/github/v/release/thebestgoodguy/modeldock?style=flat-square&color=blue)](https://github.com/thebestgoodguy/modeldock/releases)
[![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-orange?style=flat-square)](https://github.com/thebestgoodguy/modeldock/blob/main/LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![Electron Version](https://img.shields.io/badge/electron-35-47848F?style=flat-square&logo=electron)](https://www.electronjs.org/)
[![Python](https://img.shields.io/badge/python-3.10%2B-blue?style=flat-square&logo=python)](https://www.python.org/)

[Quick Start](#quick-start) | [Key Features](#key-features) | [Tech Stack](#tech-stack) | [Installation](#installation-and-setup) | [Configuration](#configuration) | [License](#license)

</div>

---

> [!IMPORTANT]
> **Disclaimer:** ModelDock is an independent community project and is not affiliated with, endorsed by, sponsored by, or officially supported by Hugging Face, Inc. or the official Hugging Face platform. The name "Hugging Face" is used only to describe compatibility with publicly available Hugging Face repository APIs.
>
> Users are solely responsible for how they use this software, including compliance with repository licenses, gated model terms, organization policies, API limits, and storage usage.

---

## Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/6aaf2e87-2b3e-4a77-86fc-4610aa8eb92d" width="90%" alt="ModelDock Search Dashboard" />
</p>

<details>
  <summary>📸 Click here to view more screenshots</summary>
  <br>
  <p align="center">
    <img src="https://github.com/user-attachments/assets/cf892d46-eb6e-4148-9d12-b36f2b211528" width="90%" alt="ModelDock Queue Management" />
    <br><br>
    <img src="https://github.com/user-attachments/assets/c8751cea-5c2c-417b-9087-ff636c0b8000" width="90%" alt="ModelDock Preferences" />
  </p>
</details>

---

## Quick Start

1. **Launch the application** (via source code or pre-compiled Windows executable).
2. **Search** for any Model, Dataset, or Space using simple queries or the **Advanced Search** panel.
3. **Explore files** in the interactive repository file tree, filter by formats (GGUF, SafeTensors, etc.), and select files to download.
4. **Configure paths** in Preferences to link ModelDock directly with your **LM Studio** model directory.
5. **Manage downloads** through the live queue with pause, resume, cancel, and speed limits.

---

## Key Features

ModelDock provides a comprehensive desktop-style cockpit for managing Hugging Face assets.

### 🔍 Search & Discovery
- **Multi-Repo Search:** Browse models, datasets, and Spaces from a single unified workspace.
- **Advanced Metadata Filters:** Query using rich Hugging Face tags, categories, libraries, and sort options.
- **Context Length Filters:** Refine text-generation models by context window sizes (from `2K` up to `256K+`).
- **Dynamic Tag Discovery:** Explore search tags dynamically loaded from Hugging Face metadata with robust local fallbacks.
- **Stateful Navigation:** Smooth transitions between search page results and repository details without losing pagination or query state.

### 📥 Download Engine & Observability
- **Granular Downloader Queue:** Full control over downloads with start, pause, resume, cancel, and retry capabilities.
- **Real-Time Speed & Progress:** Visualizes active downloading files with live speeds, ETAs, and task states.
- **Tqdm Log Parsing:** Extracts live progress details (e.g., `11.0M/4.48G`) directly from stdout streams.
- **Pre-download Disk Scan:** Automatically checks local drive storage space before queuing files to prevent out-of-disk crashes.
- **Multi-Threaded Concurrency:** Configurable parallel download queue slots and worker execution.

### 💻 Desktop & Integrations
- **LM Studio Integration:** Seamlessly sync your downloads directly with your local LM Studio models directory, featuring an easy-to-use directory lock/reset.
- **Native Folder Browsing:** Dedicated **Browse** button with dual-mode folder pickers (uses native Electron shell picker in packages, PowerShell script fallback in browser dev modes).
- **Auto-Update Engine:** Background check for latest releases via the GitHub API, showing custom Markdown changelogs inside a custom dialog.
- **Complete App Reset:** Instantly re-initializes SQLite database tables and frontend storage configs without needing an app restart.
- **Systematic Session Recovery:** Auto-pauses orphaned download workers on app launch to preserve system stability.

---

## Tech Stack

| Layer | Technologies | Role / Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Motion | Responsive desktop GUI, smooth transitions & animations |
| **Desktop Shell** | Electron 35, electron-builder | Native OS wrapper, file explorer integration, auto-updater |
| **Backend** | Express.js, SQLite (`better-sqlite3`), TSX | Settings store, queue management, process orchestrator |
| **Downloader** | Python 3.10+, `huggingface_hub` | High-speed, multi-chunk, resumable Hugging Face API agent |

---

## Installation and Setup

Ensure you have [Node.js v20+](https://nodejs.org/) and [Python v3.10+](https://www.python.org/) installed.

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/thebestgoodguy/modeldock.git
cd modeldock

# Install Node dependencies
npm install

# Install Hugging Face Python library
pip install huggingface_hub
```

### 2. Running in Development Mode
You can launch the frontend and backend API servers separately for live reloading:

```bash
# Terminal 1: Start backend API server
npm run start:api

# Terminal 2: Start Vite web frontend
npm run dev
```
Once both are running, open your browser at **[http://localhost:3000](http://localhost:3000)**.

### 3. Launching as a Desktop Electron App
Build the frontend assets and run ModelDock inside its Electron shell:
```bash
npm run electron
```

### 4. Packaging for Production
To package ModelDock into a standalone Windows desktop executable:

```bash
# Generate a Windows Setup Installer (.exe)
npm run package:win

# Generate a portable, unpacked directory build
npm run package:dir
```
The packaging artifacts will be created in the `release/` directory.

---

## Configuration

Open the **Preferences** panel in ModelDock to configure your environment:
- **Hugging Face Token:** Provide a token to search and download private or gated repositories.
- **Default Download Path:** Set the destination directory for downloaded files.
- **LM Studio Integration:** Map your model folder directly to LM Studio's path for instant model loading.
- **Queue Concurrency:** Limit simultaneous active downloads.
- **Worker Management:** Tweak the number of parallel Python download helpers and download speeds.

---

## Project Structure

A high-level view of the repository layout:

```text
modeldock/
├── electron/          # Electron main and preload entry points
│   ├── main.cjs       # Main process lifecycle and IPC handlers
│   └── preload.cjs    # Sandbox bridge and version exposures
├── public/            # Static assets and desktop icons
├── src/               # React 19 Frontend source code
│   ├── components/    # Page components (Search, Queue, Settings)
│   ├── App.tsx        # Main application layout
│   └── index.css      # Core styling system (Tailwind CSS v4)
├── downloader.py      # Python script containing the download worker
├── server.js          # Express API server with SQLite persistence
├── package.json       # App manifests and script configurations
└── README.md          # Project documentation
```

---

## Technical Details

- **ASAR Path Correction:** The backend automatically resolves absolute script paths (`resources/downloader.py`) and discovers system Python binaries inside packaged installations.
- **Queue Protection:** Any active downloads that were interrupted due to app shutdown are automatically paused on startup to avoid corrupting files.
- **Hugging Face Mirroring:** You can configure custom Hugging Face proxy endpoints (e.g. `HF_ENDPOINT`) directly in your backend settings or `.env` files.

---

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0). Under these terms, you are free to share and adapt the software, provided you give appropriate credit to **Sadri ERCAN** and link back to the official repository. Commercial use, sales, or monetization of this software is strictly prohibited. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/thebestgoodguy">Sadri ERCAN</a>
</p>

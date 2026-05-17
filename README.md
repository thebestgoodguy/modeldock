# ModelDock

ModelDock is a local Hugging Face downloader for models, datasets, and Spaces. It gives you a clean desktop-style interface for searching repositories, inspecting files, reading model cards, queueing downloads, and managing local model folders.

## Disclaimer

ModelDock is an independent community project and is not affiliated with, endorsed by, sponsored by, or officially supported by Hugging Face, Inc. or the official Hugging Face platform. The name "Hugging Face" is used only to describe compatibility with publicly available Hugging Face repository APIs and model, dataset, and Space repositories.

This project is intended to help users organize their own local model repository, inspect repository files, and make download workflows easier from a desktop-style interface. ModelDock does not host, own, verify, or redistribute any third-party models, datasets, Spaces, files, licenses, model cards, or repository metadata shown through the application.

Users are solely responsible for how they use this software, including compliance with repository licenses, gated model terms, organization policies, local laws, Hugging Face account rules, API limits, storage usage, and any downstream use of downloaded files. The maintainers do not accept responsibility for license violations, restricted content access, data loss, corrupted downloads, account or token issues, service interruptions, API changes, or any damages resulting from use of the application.

ModelDock is provided as-is, without warranty of any kind. Always review the original repository page, license, and usage terms before downloading or using any model, dataset, or Space.

<img width="2548" height="1331" alt="Screenshot_5" src="https://github.com/user-attachments/assets/6aaf2e87-2b3e-4a77-86fc-4610aa8eb92d" />

<img width="2555" height="1338" alt="Screenshot_6" src="https://github.com/user-attachments/assets/cf892d46-eb6e-4148-9d12-b36f2b211528" />

<img width="2552" height="1341" alt="Screenshot_7" src="https://github.com/user-attachments/assets/c8751cea-5c2c-417b-9087-ff636c0b8000" />


## Highlights

- Search Hugging Face models, datasets, and Spaces
- Advanced Search page for models, datasets, and Spaces with rich Hugging Face filters
- Dynamic filter discovery from Hugging Face tag metadata with local fallbacks
- Context length filtering for text-generation models, including 2K through 256K+ windows
- Paginated Advanced Search results with stable result counts and page navigation
- Search result detail flow that returns back to the original results view without losing Advanced Search state
- Direct repository lookup by `author/repo`
- Better search result cards with owner, type, likes, downloads, and update date
- File tree view with folder grouping
- File filters for GGUF, SafeTensors, BIN, JSON, and large files
- Select visible files or download a full repository
- Download queue with configurable concurrency
- Pause, resume, cancel, and retry downloads
- Live progress, speed, ETA, and task status
- **Real-time Downloaded Size Tracking:** Live extraction of downloaded vs total file size (e.g., `11.0M/4.48G`) directly from `tqdm` logs, displayed alongside download speed
- **Clean Startup & Session Recovery:** Automatic pause of interrupted or orphaned downloads on backend startup to ensure a pristine live queue
- **Intelligent Python Runtime Discovery:** Automatic physical scanning (`fs.existsSync`) of system paths, Scoop installations, and AppData directories for bulletproof ASAR/Electron packaging
- **Enhanced Log Observability:** Absolute file paths for both Python interpreter and downloader scripts recorded in the live terminal stream
- **Automated GitHub Releases Update System:** Background polling of GitHub Releases API (`latest`), dynamic sidebar version indicator, and a beautiful premium Update Modal with full markdown changelog rendering and direct download links
- **Dynamic Application Versioning:** Automatic extraction of runtime version from `package.json` and Electron preload (`window.modelDock.version`), eliminating hardcoded version strings across all build targets
- **Native Directory Browsing (`selectFolder`):** Dedicated **Browse** button next to Download Directory and LM Studio Models inputs, featuring a dual-mode picker (native Electron dialog in packaged builds, PowerShell `FolderBrowserDialog` fallback in standalone browser mode)
- **LM Studio Use/Reset Toggle:** Intuitive toggle button that binds the download path to LM Studio and transforms into a red `Reset` button to instantly restore default paths without losing previously downloaded models
- **Complete App Data Reset:** Fully re-initializes SQLite settings table and dynamically reloads frontend preferences without requiring an application restart
- Global logs modal with clear logs support
- README / model card preview with Markdown and HTML rendering
- Disk space check before queueing downloads
- LM Studio model directory detection and quick path setup
- Download history and physical folder scan
- Open downloaded folders from the app
- Hugging Face token support for gated/private repositories
- Optional Hugging Face mirror support in backend
- Electron packaging support for Windows desktop builds



  and more...



## Tech Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS
- Express
- SQLite via `better-sqlite3`
- Python `huggingface_hub`
- Electron / electron-builder

## Requirements

- Node.js 20+
- Python 3.10+
- `huggingface_hub` installed for Python:

```bash
pip install huggingface_hub
```

## Install

```bash
git clone https://github.com/thebestgoodguy/modeldock.git
cd modeldock
npm install
```

## Run In Development

Start the backend:

```bash
npm run start:api
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Use **Advanced Search** from the left sidebar or the quick menu to browse repositories with structured filters, sorting, result limits, context length filtering, and paginated results.

## Run As Electron App

Build the frontend and open Electron:

```bash
npm run electron
```

## Package For Windows

Create a Windows installer:

```bash
npm run package:win
```

Create an unpacked directory build:

```bash
npm run package:dir
```

Build output is written to:

```text
release/
```

## Configuration

Open **Preferences** inside the app to configure:

- Hugging Face API token
- Default download directory
- LM Studio models directory
- Concurrent queue slots
- Python worker count
- Soft speed limit

The backend stores local settings and download history in SQLite.

## Project Structure

```text
modeldock/
  electron/
    main.cjs
    preload.cjs
  public/
    logo.png
  src/
    components/
      AdvancedSearchPage.tsx
    services/
    App.tsx
    index.css
  downloader.py
  server.js
  package.json
  README.md
```

## Useful Scripts

```bash
npm run dev          # Start Vite frontend
npm run start:api    # Start Express backend
npm run lint         # TypeScript check
npm run build        # Build frontend
npm run electron     # Build and run Electron
npm run package:win  # Build Windows installer
```

## Notes

- Downloads are saved under the configured download directory.
- Full repository downloads reuse Hugging Face cache behavior where possible.
- Pause/resume works by stopping the current worker and reusing existing local files on resume.
- Electron builds include the frontend, backend entry, and Python downloader script.
- **Electron ASAR Compatibility:** The backend automatically resolves physical script paths (`resources/downloader.py`) and discovers external Python runtimes to ensure bulletproof child process execution in packaged production builds.
- **Clean Queue Recovery:** If the application is closed while downloads are active or queued, they are automatically paused on next startup so they don't appear as frozen/zombie processes.

## License

This project is maintained by Sadri ERCAN. Add a license file before public distribution if needed.

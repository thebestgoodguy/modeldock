// Developer / Creator: Sadri ERCAN
import express from 'express';
import cors from 'cors';
import { spawn, exec, execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.MODELDOCK_DB_PATH || path.join(__dirname, 'hf_downloader.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS repositories (
    id TEXT PRIMARY KEY,
    author TEXT,
    likes INTEGER,
    downloads INTEGER,
    lastModified TEXT,
    pipeline_tag TEXT,
    savedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS downloads (
    id TEXT PRIMARY KEY,
    repoId TEXT,
    repoType TEXT DEFAULT 'model',
    files TEXT,
    savePath TEXT,
    status TEXT,
    logs TEXT,
    progress INTEGER DEFAULT 0,
    mirror INTEGER DEFAULT 0,
    estimatedBytes INTEGER DEFAULT 0,
    options TEXT,
    timestamp TEXT
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('hf_token', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('download_path', 'C:/Downloads/HF_Models');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('lm_studio_path', '');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('max_concurrent_downloads', '1');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('max_workers', '8');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('speed_limit_kbps', '0');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('physical_reset_after', '');
`);

for (const columnSql of [
  "logs TEXT",
  "progress INTEGER DEFAULT 0",
  "repoType TEXT DEFAULT 'model'",
  "mirror INTEGER DEFAULT 0",
  "estimatedBytes INTEGER DEFAULT 0",
  "options TEXT"
]) {
  try {
    db.prepare(`ALTER TABLE downloads ADD COLUMN ${columnSql}`).run();
  } catch (e) {
    // Column already exists.
  }
}

try {
  db.prepare("UPDATE downloads SET status = 'paused' WHERE status IN ('downloading', 'starting', 'queued')").run();
} catch (e) {
  console.error('Failed to reset active downloads at startup:', e);
}

const app = express();
const requestedPort = Number.parseInt(process.env.MODELDOCK_BACKEND_PORT || process.env.PORT || '4000', 10);
const port = Number.isFinite(requestedPort) ? requestedPort : 4000;
const host = process.env.MODELDOCK_BACKEND_HOST || '127.0.0.1';
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const activeDownloads = new Map();
const downloadQueue = [];
const RUNNING_STATUSES = new Set(['starting', 'downloading']);
const ACTIVE_STATUSES = new Set(['queued', 'starting', 'downloading', 'paused']);

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}

function normalizeRepoType(repoType) {
  if (repoType === 'dataset' || repoType === 'space') return repoType;
  return 'model';
}

function folderNameForRepo(repoId, repoType = 'model') {
  const cleanRepo = String(repoId || '').replace(/[\\/]/g, '--');
  const type = normalizeRepoType(repoType);
  return type === 'model' ? cleanRepo : `${type}--${cleanRepo}`;
}

function repoFromFolderName(folderName) {
  if (folderName.startsWith('dataset--')) {
    return { repoId: folderName.slice(9).replace('--', '/'), repoType: 'dataset' };
  }
  if (folderName.startsWith('space--')) {
    return { repoId: folderName.slice(7).replace('--', '/'), repoType: 'space' };
  }
  return { repoId: folderName.replace('--', '/'), repoType: 'model' };
}

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function getSettingsObject() {
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj = {};
  settings.forEach((s) => {
    settingsObj[s.key] = s.value;
  });
  return settingsObj;
}

function toPositiveInt(value, fallback, max = 64) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function toNonNegativeInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function getQueueLimit() {
  return toPositiveInt(getSetting('max_concurrent_downloads', '1'), 1, 8);
}

function getWorkerLimit(options = {}) {
  return toPositiveInt(options.maxWorkers ?? getSetting('max_workers', '8'), 8, 32);
}

function getSpeedLimit(options = {}) {
  return toNonNegativeInt(options.speedLimitKbps ?? getSetting('speed_limit_kbps', '0'), 0);
}

function stopActiveDownloads() {
  for (const active of activeDownloads.values()) {
    if (active.process) {
      active.stopReason = 'canceled';
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${active.process.pid} /f /t`);
      } else {
        active.process.kill('SIGTERM');
      }
    }
  }
  activeDownloads.clear();
  downloadQueue.splice(0, downloadQueue.length);
}

function sanitizeFiles(files) {
  return Array.isArray(files)
    ? files.filter((file) => typeof file === 'string' && file.trim()).map((file) => file.trim())
    : [];
}

function mergeLiveDownload(row) {
  const active = activeDownloads.get(row.id);
  const parsed = {
    ...row,
    repoType: normalizeRepoType(row.repoType),
    files: safeJsonParse(row.files, []),
    logs: safeJsonParse(row.logs, []),
    options: safeJsonParse(row.options, {})
  };

  if (!active) return parsed;

  return {
    ...parsed,
    status: active.status,
    progress: active.progress || 0,
    speed: active.speed || '0 KB/s',
    eta: active.eta || '--:--',
    downloadedSize: active.downloadedSize || '',
    logs: active.logs
  };
}

function persistActive(active) {
  db.prepare(`
    UPDATE downloads
    SET status = ?, logs = ?, progress = ?, options = ?
    WHERE id = ?
  `).run(
    active.status,
    JSON.stringify(active.logs || []),
    active.progress || 0,
    JSON.stringify(active.options || {}),
    active.id
  );
}

function appendDownloadLog(downloadId, rawLog) {
  const active = activeDownloads.get(downloadId);
  if (!active) return;

  const lines = rawLog
    .toString()
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    active.logs.push(line);

    if (/Downloading|snapshot download|Fetching|Resolving|Queued/i.test(line)) {
      if (active.status !== 'queued') active.status = 'downloading';
    }

    const progressMatch = line.match(/(\d{1,3})%/);
    const speedMatch = line.match(/(\d+\.?\d*\s*[KMG]B\/s)/i);
    const etaMatch = line.match(/<(\d+:\d+)/);
    const sizeMatch = line.match(/\|\s*([0-9.]+[KMG]?B?\/[0-9.]+[KMG]?B?)/i);

    if (progressMatch) {
      active.progress = Math.min(100, Number.parseInt(progressMatch[1], 10));
      active.status = 'downloading';
    }
    if (speedMatch) active.speed = speedMatch[1];
    if (etaMatch) active.eta = etaMatch[1];
    if (sizeMatch) active.downloadedSize = sizeMatch[1];

    if (active.logs.length > 1000) {
      active.logs.splice(0, active.logs.length - 1000);
    }
  }

  persistActive(active);
}

function runningCount() {
  let count = 0;
  for (const active of activeDownloads.values()) {
    if (RUNNING_STATUSES.has(active.status)) count += 1;
  }
  return count;
}

function removeFromQueue(id) {
  const index = downloadQueue.indexOf(id);
  if (index >= 0) downloadQueue.splice(index, 1);
}

function enqueueActiveDownload(active) {
  activeDownloads.set(active.id, active);
  if (!downloadQueue.includes(active.id)) downloadQueue.push(active.id);
  active.status = 'queued';
  active.logs.push(`INFO: Queued download for ${active.repoId}`);
  persistActive(active);
  processQueue();
}

function createActiveDownload(row, token = '') {
  return {
    id: row.id,
    repoId: row.repoId,
    repoType: normalizeRepoType(row.repoType),
    files: Array.isArray(row.files) ? row.files : safeJsonParse(row.files, []),
    savePath: row.savePath,
    token,
    mirror: Boolean(row.mirror),
    estimatedBytes: Number(row.estimatedBytes || 0),
    options: typeof row.options === 'object' ? row.options : safeJsonParse(row.options, {}),
    status: row.status || 'queued',
    logs: Array.isArray(row.logs) ? row.logs : safeJsonParse(row.logs, []),
    progress: Number(row.progress || 0),
    speed: '0 KB/s',
    eta: '--:--',
    downloadedSize: '',
    process: null,
    stopReason: null
  };
}

function getPythonExecutable() {
  if (process.env.PYTHON && fs.existsSync(process.env.PYTHON)) {
    return process.env.PYTHON;
  }
  const candidates = [
    'C:/Program Files/Python311/python.exe',
    'C:/Program Files/Python312/python.exe',
    'C:/Program Files/Python313/python.exe',
    'C:/Program Files/Python310/python.exe',
    path.join(process.env.USERPROFILE || '', 'scoop/apps/python313/current/python.exe'),
    path.join(process.env.USERPROFILE || '', 'scoop/apps/python312/current/python.exe'),
    path.join(process.env.USERPROFILE || '', 'scoop/apps/python311/current/python.exe'),
    path.join(process.env.USERPROFILE || '', 'AppData/Local/Programs/Python/Python311/python.exe'),
    path.join(process.env.USERPROFILE || '', 'AppData/Local/Programs/Python/Python312/python.exe'),
    path.join(process.env.USERPROFILE || '', 'AppData/Local/Programs/Python/Python313/python.exe')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return 'python';
}

function startActiveDownload(active) {
  removeFromQueue(active.id);
  active.status = 'starting';
  active.stopReason = null;
  active.speed = '0 KB/s';
  active.eta = '--:--';
  active.logs.push('INFO: Starting worker process...');
  persistActive(active);

  const scriptPath = process.env.DOWNLOADER_SCRIPT || path.join(__dirname, 'downloader.py');
  const folderName = folderNameForRepo(active.repoId, active.repoType);
  fs.mkdirSync(path.join(active.savePath, folderName), { recursive: true });

  const maxWorkers = getWorkerLimit(active.options);
  const speedLimitKbps = getSpeedLimit(active.options);
  const args = [
    scriptPath,
    '--repo',
    active.repoId,
    '--path',
    active.savePath,
    '--repo-type',
    active.repoType,
    '--max-workers',
    String(maxWorkers)
  ];

  if (active.files.length > 0) args.push('--files', ...active.files);
  if (active.token) args.push('--token', active.token);
  if (active.mirror) args.push('--mirror');
  if (speedLimitKbps > 0) args.push('--speed-limit-kbps', String(speedLimitKbps));

  const pythonExec = getPythonExecutable();
  active.logs.push(`INFO: Using Python interpreter at ${pythonExec}`);
  active.logs.push(`INFO: Downloader script at ${scriptPath}`);

  const pythonProcess = spawn(pythonExec, args, {
    cwd: path.dirname(scriptPath),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, TQDM_POSITION: '-1', HF_HUB_DISABLE_PROGRESS_BARS: '0', HF_HUB_ENABLE_HF_TRANSFER: '0' }
  });

  active.process = pythonProcess;

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python STDOUT ${active.id}]: ${data.toString().trim()}`);
    appendDownloadLog(active.id, data);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.log(`[Python STDERR ${active.id}]: ${data.toString().trim()}`);
    appendDownloadLog(active.id, data);
  });

  pythonProcess.on('error', (err) => {
    active.status = 'failed';
    active.logs.push(`ERROR: Failed to start process: ${err.message}`);
    active.process = null;
    persistActive(active);
    activeDownloads.delete(active.id);
    processQueue();
  });

  pythonProcess.on('close', (code) => {
    active.process = null;

    if (active.stopReason === 'paused') {
      active.status = 'paused';
      active.logs.push('INFO: Download paused. Resume will reuse existing partial files.');
    } else if (active.stopReason === 'canceled') {
      active.status = 'canceled';
      active.logs.push('INFO: Download canceled by user.');
    } else if (code === 0) {
      active.status = 'completed';
      active.progress = 100;
      active.logs.push('SUCCESS: Download completed.');
    } else {
      active.status = 'failed';
      active.logs.push(`ERROR: Worker exited with code ${code}.`);
    }

    persistActive(active);
    activeDownloads.delete(active.id);
    console.log(`Download ${active.id} finished with code ${code} (${active.status})`);
    processQueue();
  });
}

function processQueue() {
  while (runningCount() < getQueueLimit()) {
    const nextId = downloadQueue.find((id) => {
      const active = activeDownloads.get(id);
      return active && active.status === 'queued';
    });

    if (!nextId) return;
    const active = activeDownloads.get(nextId);
    startActiveDownload(active);
  }
}

function stopActiveProcess(active, reason) {
  active.stopReason = reason;

  if (!active.process) {
    active.status = reason === 'paused' ? 'paused' : 'canceled';
    removeFromQueue(active.id);
    persistActive(active);
    activeDownloads.delete(active.id);
    processQueue();
    return;
  }

  if (process.platform === 'win32') {
    exec(`taskkill /pid ${active.process.pid} /f /t`);
  } else {
    active.process.kill('SIGTERM');
  }
}

function getAvailableSpaceBytes(targetPath) {
  const resolved = path.resolve(targetPath);
  const root = path.parse(resolved).root || resolved;

  try {
    const stats = fs.statfsSync(root);
    return Number(stats.bavail) * Number(stats.bsize);
  } catch (e) {
    if (process.platform !== 'win32') return null;
  }

  try {
    const drive = path.parse(resolved).root.replace(/[:\\\/]/g, '') || 'C';
    const output = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-Command', `(Get-PSDrive -Name '${drive}').Free`],
      { encoding: 'utf8', windowsHide: true }
    ).trim();
    const parsed = Number.parseInt(output, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
}

function assertDiskSpace(savePath, requiredBytes) {
  if (!requiredBytes || requiredBytes <= 0) return;
  const availableBytes = getAvailableSpaceBytes(savePath);
  if (availableBytes === null) return;
  const safetyBuffer = Math.max(512 * 1024 * 1024, Math.ceil(requiredBytes * 0.05));
  if (availableBytes < requiredBytes + safetyBuffer) {
    const error = new Error('Not enough free disk space for this download.');
    error.statusCode = 507;
    error.details = { availableBytes, requiredBytes, safetyBuffer };
    throw error;
  }
}

function getLmStudioCandidates() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const configured = getSetting('lm_studio_path', '');
  const candidates = [
    configured,
    home ? path.join(home, '.lmstudio', 'models') : '',
    home ? path.join(home, 'AppData', 'Local', 'LM Studio', 'models') : '',
    'C:/LM Studio/models'
  ].filter(Boolean);

  const unique = [...new Set(candidates.map((candidate) => path.resolve(candidate)))];
  return unique.map((candidate) => ({
    path: candidate,
    exists: fs.existsSync(candidate)
  }));
}

app.get('/api/downloads', (req, res) => {
  const history = db.prepare('SELECT * FROM downloads ORDER BY timestamp DESC LIMIT 100').all();
  res.json(history.map(mergeLiveDownload));
});

app.post('/api/downloads/clear', (req, res) => {
  stopActiveDownloads();
  db.prepare('DELETE FROM downloads').run();
  res.json({ success: true });
});

app.post('/api/reset-app-data', (req, res) => {
  const resetAt = new Date().toISOString();
  stopActiveDownloads();

  const reset = db.transaction(() => {
    db.prepare('DELETE FROM downloads').run();
    db.prepare('DELETE FROM repositories').run();
    db.prepare('DELETE FROM settings').run();
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('hf_token', '');
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('download_path', 'C:/Downloads/HF_Models');
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('lm_studio_path', '');
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('max_concurrent_downloads', '1');
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('max_workers', '8');
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('speed_limit_kbps', '0');
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('physical_reset_after', resetAt);
  });

  reset();
  res.json({ success: true, resetAt });
});

app.post('/api/select-folder-fallback', (req, res) => {
  try {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms;
      $dlg = New-Object System.Windows.Forms.FolderBrowserDialog;
      $dlg.Description = "Select Download Directory";
      $dlg.ShowNewFolderButton = $true;
      if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        Write-Output $dlg.SelectedPath;
      }
    `;
    const result = execFileSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8' });
    const selected = result.trim();
    if (selected) {
      return res.json({ path: selected });
    }
    res.json({ path: null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/settings', (req, res) => {
  res.json(getSettingsObject());
});

app.post('/api/settings', (req, res) => {
  const allowedKeys = [
    'hf_token',
    'download_path',
    'lm_studio_path',
    'max_concurrent_downloads',
    'max_workers',
    'speed_limit_kbps'
  ];
  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const key of allowedKeys) {
    if (req.body?.[key] !== undefined) update.run(key, String(req.body[key]));
  }
  processQueue();
  res.json({ success: true });
});

app.get('/api/paths/lm-studio', (req, res) => {
  const candidates = getLmStudioCandidates();
  const preferred = candidates.find((candidate) => candidate.exists)?.path || candidates[0]?.path || '';
  res.json({ preferred, candidates });
});

app.post('/api/disk-space', (req, res) => {
  const savePath = req.body?.path;
  const requiredBytes = Number(req.body?.requiredBytes || 0);
  if (!savePath || typeof savePath !== 'string') {
    return res.status(400).json({ error: 'Path is required' });
  }

  const availableBytes = getAvailableSpaceBytes(savePath);
  const safetyBuffer = Math.max(512 * 1024 * 1024, Math.ceil(requiredBytes * 0.05));
  res.json({
    path: savePath,
    availableBytes,
    requiredBytes,
    safetyBuffer,
    enough: availableBytes === null || requiredBytes <= 0 || availableBytes >= requiredBytes + safetyBuffer
  });
});

app.get('/api/repos', (req, res) => {
  const repos = db.prepare('SELECT * FROM repositories ORDER BY savedAt DESC').all();
  res.json(repos);
});

app.post('/api/repos', (req, res) => {
  const { id, author, likes, downloads, lastModified, pipeline_tag } = req.body;
  const savedAt = new Date().toISOString();

  const insert = db.prepare(`
    INSERT OR REPLACE INTO repositories (id, author, likes, downloads, lastModified, pipeline_tag, savedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(id, author, likes || 0, downloads || 0, lastModified || '', pipeline_tag || '', savedAt);
  res.json({ success: true });
});

app.delete('/api/repos/:id(*)', (req, res) => {
  db.prepare('DELETE FROM repositories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/download', (req, res) => {
  try {
    const {
      repo,
      files = [],
      path: savePath,
      token,
      mirror,
      repoType = 'model',
      estimatedBytes = 0,
      options = {}
    } = req.body || {};

    if (!repo || typeof repo !== 'string') {
      return res.status(400).json({ error: 'Repository id is required' });
    }
    if (!savePath || typeof savePath !== 'string') {
      return res.status(400).json({ error: 'Download path is required' });
    }

    const normalizedRepoType = normalizeRepoType(repoType);
    const requestedFiles = sanitizeFiles(files);
    const normalizedOptions = {
      maxWorkers: getWorkerLimit(options),
      speedLimitKbps: getSpeedLimit(options)
    };
    const requiredBytes = Number(estimatedBytes || 0);

    assertDiskSpace(savePath, requiredBytes);
    fs.mkdirSync(savePath, { recursive: true });

    const downloadId = Date.now().toString();
    const timestamp = new Date().toISOString();
    const initialLogs = [
      `INFO: Queued ${normalizedRepoType} download for ${repo}`,
      requestedFiles.length > 0
        ? `INFO: ${requestedFiles.length} selected file(s).`
        : 'INFO: Full repository selected.'
    ];

    db.prepare(`
      INSERT INTO downloads (id, repoId, repoType, files, savePath, status, logs, progress, mirror, estimatedBytes, options, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      downloadId,
      repo,
      normalizedRepoType,
      JSON.stringify(requestedFiles),
      savePath,
      'queued',
      JSON.stringify(initialLogs),
      0,
      mirror ? 1 : 0,
      requiredBytes,
      JSON.stringify(normalizedOptions),
      timestamp
    );

    const active = createActiveDownload({
      id: downloadId,
      repoId: repo,
      repoType: normalizedRepoType,
      files: requestedFiles,
      savePath,
      status: 'queued',
      logs: initialLogs,
      progress: 0,
      mirror: mirror ? 1 : 0,
      estimatedBytes: requiredBytes,
      options: normalizedOptions
    }, token || getSetting('hf_token', ''));

    enqueueActiveDownload(active);
    res.json({ downloadId, status: active.status });
  } catch (err) {
    console.error('Critical error in /api/download:', err);
    res.status(err.statusCode || 500).json({
      error: err.message,
      details: err.details
    });
  }
});

app.get('/api/downloads/:id/status', (req, res) => {
  const { id } = req.params;
  const active = activeDownloads.get(id);

  if (active) {
    return res.json({
      id,
      repoId: active.repoId,
      repoType: active.repoType,
      status: active.status,
      progress: active.progress || 0,
      speed: active.speed || '0 KB/s',
      eta: active.eta || '--:--',
      downloadedSize: active.downloadedSize || '',
      logs: active.logs,
      options: active.options
    });
  }

  const row = db.prepare('SELECT * FROM downloads WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Download not found' });
  const merged = mergeLiveDownload(row);
  res.json({
    id,
    repoId: merged.repoId,
    repoType: merged.repoType,
    status: merged.status,
    progress: merged.progress || 0,
    speed: merged.speed || '0 KB/s',
    eta: merged.eta || '--:--',
    downloadedSize: merged.downloadedSize || '',
    logs: merged.logs || [],
    options: merged.options || {}
  });
});

app.post('/api/downloads/:id/logs/clear', (req, res) => {
  const { id } = req.params;
  const active = activeDownloads.get(id);

  if (active) {
    active.logs = [];
    persistActive(active);
    return res.json({ success: true });
  }

  const row = db.prepare('SELECT id FROM downloads WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Download not found' });

  db.prepare('UPDATE downloads SET logs = ? WHERE id = ?').run(JSON.stringify([]), id);
  res.json({ success: true });
});

app.delete('/api/downloads/:id', (req, res) => {
  const { id } = req.params;
  const active = activeDownloads.get(id);
  if (active) stopActiveProcess(active, 'canceled');
  db.prepare('DELETE FROM downloads WHERE id = ?').run(id);
  activeDownloads.delete(id);
  removeFromQueue(id);
  processQueue();
  res.json({ success: true });
});

app.post('/api/downloads/:id/pause', (req, res) => {
  const { id } = req.params;
  const active = activeDownloads.get(id);
  if (!active) return res.status(404).json({ error: 'Active download not found' });
  active.logs.push('INFO: Pause requested.');
  stopActiveProcess(active, 'paused');
  res.json({ success: true, message: 'Download paused' });
});

app.post('/api/downloads/:id/resume', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM downloads WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Download not found' });
  if (RUNNING_STATUSES.has(row.status) || row.status === 'queued') {
    return res.status(409).json({ error: 'Download is already active' });
  }

  const active = createActiveDownload({
    ...row,
    status: 'queued',
    logs: [...safeJsonParse(row.logs, []), 'INFO: Resume requested.']
  }, getSetting('hf_token', ''));
  enqueueActiveDownload(active);
  res.json({ success: true, downloadId: id });
});

app.post('/api/downloads/:id/retry', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM downloads WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Download not found' });
  if (RUNNING_STATUSES.has(row.status) || row.status === 'queued') {
    return res.status(409).json({ error: 'Download is already active' });
  }

  const logs = [
    `INFO: Retry requested for ${row.repoId}`,
    'INFO: Existing files will be reused when possible.'
  ];
  db.prepare('UPDATE downloads SET status = ?, logs = ?, progress = ? WHERE id = ?')
    .run('queued', JSON.stringify(logs), 0, id);

  const active = createActiveDownload({
    ...row,
    status: 'queued',
    logs,
    progress: 0
  }, getSetting('hf_token', ''));
  enqueueActiveDownload(active);
  res.json({ success: true, downloadId: id });
});

app.post('/api/downloads/:id/cancel', (req, res) => {
  const { id } = req.params;
  const active = activeDownloads.get(id);

  if (active) {
    active.logs.push('INFO: Cancel requested.');
    stopActiveProcess(active, 'canceled');
    return res.json({ success: true, message: 'Download canceled' });
  }

  const row = db.prepare('SELECT * FROM downloads WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Download not found' });
  db.prepare('UPDATE downloads SET status = ? WHERE id = ?').run('canceled', id);
  removeFromQueue(id);
  processQueue();
  res.json({ success: true, message: 'Download canceled' });
});

app.post('/api/downloads/:id/open', (req, res) => {
  const { id } = req.params;

  if (id.startsWith('physical-')) {
    const folderName = id.replace('physical-', '');
    const downloadPath = getSetting('download_path', '');
    if (downloadPath) {
      spawn('explorer.exe', [path.join(downloadPath, folderName)], { detached: true, stdio: 'ignore' });
      return res.json({ success: true });
    }
  }

  const row = db.prepare('SELECT savePath, repoId, repoType FROM downloads WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Download path not found' });

  const fullPath = path.resolve(path.join(row.savePath, folderNameForRepo(row.repoId, row.repoType)));
  spawn('explorer.exe', [fullPath], { detached: true, stdio: 'ignore' });
  res.json({ success: true });
});

app.get('/api/downloads/physical', (req, res) => {
  const downloadPath = getSetting('download_path', '');

  if (!downloadPath || !fs.existsSync(downloadPath)) {
    return res.json([]);
  }

  try {
    const physicalResetAfter = Date.parse(getSetting('physical_reset_after', ''));
    const folders = fs.readdirSync(downloadPath).filter((folder) =>
      fs.statSync(path.join(downloadPath, folder)).isDirectory()
    );
    const history = db.prepare('SELECT * FROM downloads').all().map(mergeLiveDownload);

    const results = folders.flatMap((folderName) => {
      const matchingRecord = history.find((h) => folderNameForRepo(h.repoId, h.repoType) === folderName);
      const inferred = repoFromFolderName(folderName);
      const stats = fs.statSync(path.join(downloadPath, folderName));

      if (!matchingRecord && Number.isFinite(physicalResetAfter) && stats.mtime.getTime() <= physicalResetAfter) {
        return [];
      }

      return {
        id: matchingRecord ? matchingRecord.id : `physical-${folderName}`,
        repoId: matchingRecord ? matchingRecord.repoId : inferred.repoId,
        repoType: matchingRecord ? matchingRecord.repoType : inferred.repoType,
        folderName,
        fullPath: path.join(downloadPath, folderName),
        status: matchingRecord ? matchingRecord.status : 'unknown',
        progress: matchingRecord ? matchingRecord.progress : 0,
        speed: matchingRecord ? matchingRecord.speed : '0 KB/s',
        eta: matchingRecord ? matchingRecord.eta : '--:--',
        downloadedSize: matchingRecord ? matchingRecord.downloadedSize : '',
        timestamp: matchingRecord ? matchingRecord.timestamp : stats.mtime.toISOString(),
        isPhysicalOnly: !matchingRecord
      };
    });

    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/downloads/physical/delete', (req, res) => {
  const { folderName } = req.body;
  const downloadPath = getSetting('download_path', '');

  if (!downloadPath || !folderName) {
    return res.status(400).json({ error: 'Missing folder name or path' });
  }

  const fullPath = path.resolve(path.join(downloadPath, folderName));
  const rootPath = path.resolve(downloadPath);
  const rootPrefix = rootPath.endsWith(path.sep) ? rootPath : `${rootPath}${path.sep}`;
  if (fullPath !== rootPath && !fullPath.startsWith(rootPrefix)) {
    return res.status(400).json({ error: 'Invalid folder path' });
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  try {
    fs.rmSync(fullPath, { recursive: true, force: true });
    const inferred = repoFromFolderName(folderName);
    db.prepare('DELETE FROM downloads WHERE repoId = ? OR repoId = ?').run(inferred.repoId, folderName);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/open-folder', (req, res) => {
  const folderPath = req.body?.path;
  if (!folderPath) return res.status(400).json({ error: 'Path is required' });
  spawn('explorer.exe', [path.resolve(folderPath)], { detached: true, stdio: 'ignore' });
  res.json({ success: true });
});

export const backendReady = new Promise((resolve, reject) => {
  const server = app.listen(port, host, () => {
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    const url = `http://${host}:${actualPort}`;
    console.log(`Backend server running at ${url}`);
    resolve({
      server,
      host,
      port: actualPort,
      url,
      apiUrl: `${url}/api`
    });
  });

  server.on('error', reject);
});

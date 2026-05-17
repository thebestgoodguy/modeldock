// Developer / Creator: Sadri ERCAN
import React, { useEffect, useMemo, useState } from 'react';
import { TopBar } from './components/TopBar';
import { SidebarLeft } from './components/SidebarLeft';
import { SidebarRight } from './components/SidebarRight';
import { Canvas } from './components/Canvas';
import { AdvancedSearchPage } from './components/AdvancedSearchPage';
import { SettingsModal } from './components/SettingsModal';
import { LogModal } from './components/LogModal';
import { UpdateModal } from './components/UpdateModal';
import { ToastContainer, Toast, ToastType } from './components/ToastContainer';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Loader2, Zap } from 'lucide-react';
import { HuggingFaceService } from './services/hfService';
import { AppSettings, AppView, DiskSpaceInfo, DownloadItem, HFFile, HFRepoInfo, RepoType, UpdateInfo } from './types';
import packageJson from '../package.json';

const DEFAULT_SETTINGS: AppSettings = {
  hf_token: '',
  download_path: 'C:/Downloads/HF_Models',
  lm_studio_path: '',
  max_concurrent_downloads: '1',
  max_workers: '8',
  speed_limit_kbps: '0'
};

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return 'Unknown';
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

export default function App() {
  const appVersion = window.modelDock?.version || packageJson.version || '1.0.1';
  const [repo, setRepo] = useState<HFRepoInfo | null>(null);
  const [repoType, setRepoType] = useState<RepoType>('model');
  const [files, setFiles] = useState<HFFile[]>([]);
  const [readme, setReadme] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [savedRepos, setSavedRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [lmStudioPreferredPath, setLmStudioPreferredPath] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<DownloadItem[]>([]);
  const [view, setView] = useState<AppView>('home');
  const [repoReturnView, setRepoReturnView] = useState<'home' | 'search'>('home');
  const [isStartingDownload, setIsStartingDownload] = useState(false);
  const [diskInfo, setDiskInfo] = useState<DiskSpaceInfo | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [logDetails, setLogDetails] = useState<any | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadSavedRepos();
    loadSettings();
    loadDownloadHistory();
    loadLmStudioPath();

    HuggingFaceService.checkUpdate(appVersion).then((info) => {
      setUpdateInfo(info);
      if (info.hasUpdate) {
        setIsUpdateModalOpen(true);
        addToast(`New update available: v${info.latestVersion}`, 'info');
      }
    });
  }, [appVersion]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadDownloadHistory();
    }, 2000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedLogId || !isLogModalOpen) return;

    let alive = true;
    const loadLogs = async () => {
      try {
        const details = await HuggingFaceService.getDownloadStatus(selectedLogId);
        if (alive) setLogDetails(details);
      } catch (err: any) {
        if (alive) addToast(err.message || 'Failed to load logs', 'error');
      }
    };

    loadLogs();
    const interval = window.setInterval(loadLogs, 1000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [selectedLogId, isLogModalOpen]);

  const loadDownloadHistory = async () => {
    try {
      const [history, physical] = await Promise.all([
        HuggingFaceService.getDownloadHistory().catch(() => []),
        HuggingFaceService.getPhysicalDownloads().catch(() => [])
      ]);
      const knownIds = new Set(history.map((item: any) => item.id));
      const physicalOnly = physical.filter((item: any) => !knownIds.has(item.id));
      const merged = [...history, ...physicalOnly].sort((a: any, b: any) =>
        new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
      );
      setDownloadHistory(merged);
    } catch (e) {
      console.error('Failed to load download history', e);
      setDownloadHistory([]);
    }
  };

  const loadSettings = async () => {
    try {
      const s = await HuggingFaceService.getSettings();
      setSettings({ ...DEFAULT_SETTINGS, ...s });
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const loadLmStudioPath = async () => {
    try {
      const result = await HuggingFaceService.getLmStudioPaths();
      setLmStudioPreferredPath(result.preferred || '');
      if (result.preferred) {
        setSettings((prev) => ({
          ...prev,
          lm_studio_path: prev.lm_studio_path || result.preferred
        }));
      }
    } catch (e) {
      console.error('Failed to detect LM Studio path', e);
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      await HuggingFaceService.updateSettings(newSettings);
      setSettings(newSettings);
      addToast('Settings saved successfully', 'success');
      loadDownloadHistory();
    } catch (e: any) {
      addToast(e.message || 'Failed to save settings', 'error');
    }
  };

  const loadSavedRepos = async () => {
    try {
      const repos = await HuggingFaceService.getSavedRepos();
      setSavedRepos(repos);
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const deleteRepoFromHistory = async (repoId: string) => {
    try {
      await HuggingFaceService.deleteRepo(repoId);
      loadSavedRepos();
      addToast('Repository removed from history', 'info');
    } catch (e) {
      addToast('Failed to delete repo', 'error');
    }
  };

  const resetRepoView = () => {
    setRepo(null);
    setFiles([]);
    setReadme('');
    setDiskInfo(null);
  };

  const backToResults = () => {
    const targetView = repoReturnView;
    resetRepoView();
    setView(targetView);
    if (targetView === 'home') {
      setRepoReturnView('home');
    }
  };

  const handleRepoTypeChange = (nextType: RepoType) => {
    setRepoType(nextType);
    setSearchResults([]);
    resetRepoView();
  };

  const handleSearch = async (query: string) => {
    if (!query) return;
    setView('home');
    setRepoReturnView('home');
    setLoading(true);
    setSearchResults([]);
    resetRepoView();

    try {
      if (query.includes('/')) {
        await selectRepo(query, repoType, 'home');
        return;
      }

      try {
        const authorResults = await HuggingFaceService.listReposByAuthor(query, settings.hf_token, repoType);
        if (authorResults.length > 0) {
          setSearchResults(authorResults);
          return;
        }
      } catch (e) {
        // Fall back to general search.
      }

      const results = await HuggingFaceService.searchRepos(query, settings.hf_token, repoType);
      setSearchResults(results);
    } catch (err: any) {
      addToast(err.message || 'Repository not found', 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    resetRepoView();
    setSearchResults([]);
    setRepoReturnView('home');
    setView('home');
  };

  const selectRepo = async (
    repoId: string,
    selectedRepoType: RepoType = repoType,
    returnView: 'home' | 'search' = 'home'
  ) => {
    setLoading(true);
    setDiskInfo(null);
    try {
      const [info, fileList, readmeText] = await Promise.all([
        HuggingFaceService.getRepoInfo(repoId, settings.hf_token, selectedRepoType),
        HuggingFaceService.listFiles(repoId, settings.hf_token, selectedRepoType),
        HuggingFaceService.getReadme(repoId, settings.hf_token, selectedRepoType).catch(() => '')
      ]);

      await HuggingFaceService.saveRepo({
        id: info.id,
        author: info.author,
        likes: info.likes,
        downloads: info.downloads,
        lastModified: info.lastModified,
        pipeline_tag: info.pipeline_tag
      });
      loadSavedRepos();

      setRepo({ ...info, repoType: selectedRepoType });
      setRepoReturnView(returnView);
      setRepoType(selectedRepoType);
      setFiles(fileList);
      setReadme(readmeText);
      setView('home');
    } catch (err: any) {
      addToast(err.message || 'Failed to load repository', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (filePath: string) => {
    setFiles((prev) =>
      prev.map((file) => (file.path === filePath ? { ...file, selected: !file.selected } : file))
    );
  };

  const setFileSelection = (paths: string[], selected: boolean) => {
    const pathSet = new Set(paths);
    setFiles((prev) =>
      prev.map((file) => (pathSet.has(file.path) ? { ...file, selected } : file))
    );
  };

  const clearSelectedFiles = () => {
    setFiles((prev) => prev.map((file) => ({ ...file, selected: false })));
  };

  const startDownload = async () => {
    if (!repo) return;
    const selected = files.filter((file) => file.selected && file.type === 'file').map((file) => file.path);
    const savePath = settings.download_path;
    const estimatedBytes = selected.length > 0
      ? files.filter((file) => file.selected).reduce((acc, file) => acc + (file.size || 0), 0)
      : files.reduce((acc, file) => acc + (file.size || 0), 0);

    try {
      if (!savePath?.trim()) throw new Error('Download path is empty');

      setIsStartingDownload(true);
      const disk = await HuggingFaceService.checkDiskSpace(savePath, estimatedBytes);
      setDiskInfo(disk);
      if (!disk.enough) {
        throw new Error(`Not enough disk space. Need ${formatBytes(disk.requiredBytes)}, available ${formatBytes(disk.availableBytes)}.`);
      }

      const { downloadId } = await HuggingFaceService.startDownload(
        repo.id,
        selected,
        savePath,
        settings.hf_token,
        false,
        repo.repoType || repoType,
        estimatedBytes,
        {
          maxWorkers: Number(settings.max_workers || 8),
          speedLimitKbps: Number(settings.speed_limit_kbps || 0)
        }
      );
      if (!downloadId) throw new Error('Backend did not return a download id');

      setSelectedLogId(downloadId);
      setLogDetails(null);
      clearSelectedFiles();
      await loadDownloadHistory();
      addToast(selected.length > 0 ? 'Download queued' : 'Full repository queued', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to start download', 'error');
    } finally {
      setIsStartingDownload(false);
    }
  };

  const deleteDownloadItem = async (id: string) => {
    try {
      await HuggingFaceService.deleteDownload(id);
      await loadDownloadHistory();
      addToast('Download record removed', 'info');
    } catch (e) {
      addToast('Failed to delete record', 'error');
    }
  };

  const deletePhysicalDownload = async (folderName: string) => {
    try {
      await HuggingFaceService.deletePhysicalDownload(folderName);
      await loadDownloadHistory();
      addToast('Download folder deleted from disk', 'info');
    } catch (e) {
      addToast('Failed to delete folder', 'error');
    }
  };

  const clearDownloadHistory = async () => {
    try {
      await HuggingFaceService.clearDownloadHistory();
      setDownloadHistory([]);
      addToast('Download history cleared', 'info');
    } catch (e) {
      addToast('Failed to clear history', 'error');
    }
  };

  const resetAppData = async () => {
    try {
      await HuggingFaceService.resetAppData();
      loadSettings();
      setDownloadHistory([]);
      setSavedRepos([]);
      setSelectedLogId(null);
      setLogDetails(null);
      setIsLogModalOpen(false);
      setSearchResults([]);
      setRepoReturnView('home');
      resetRepoView();
      setView('home');
      addToast('App data reset', 'success');
    } catch (e: any) {
      addToast(e.message || 'Failed to reset app data', 'error');
      throw e;
    }
  };

  const cancelActiveDownload = async (id: string) => {
    try {
      await HuggingFaceService.cancelDownload(id);
      await loadDownloadHistory();
      addToast('Download canceled', 'warning');
    } catch (e) {
      addToast('Failed to cancel download', 'error');
    }
  };

  const pauseDownload = async (id: string) => {
    try {
      await HuggingFaceService.pauseDownload(id);
      await loadDownloadHistory();
      addToast('Download paused', 'warning');
    } catch (e: any) {
      addToast(e.message || 'Failed to pause download', 'error');
    }
  };

  const resumeDownload = async (id: string) => {
    try {
      await HuggingFaceService.resumeDownload(id);
      await loadDownloadHistory();
      addToast('Download resumed', 'success');
    } catch (e: any) {
      addToast(e.message || 'Failed to resume download', 'error');
    }
  };

  const retryDownload = async (id: string) => {
    try {
      await HuggingFaceService.retryDownload(id);
      await loadDownloadHistory();
      addToast('Download requeued', 'success');
    } catch (e: any) {
      addToast(e.message || 'Failed to retry download', 'error');
    }
  };

  const handleViewChange = (newView: AppView) => {
    setView(newView);
    if (newView !== 'search') {
      setRepoReturnView('home');
    }
    if (newView === 'home') {
      resetRepoView();
      setSearchResults([]);
    }
  };

  const handleOpenFolder = async (id: string) => {
    try {
      await HuggingFaceService.openDownloadFolder(id);
    } catch (e) {
      addToast('Failed to open folder', 'error');
    }
  };

  const handleOpenDownloadsFolder = async () => {
    try {
      await HuggingFaceService.openFolder(settings.download_path);
    } catch (e) {
      addToast('Failed to open downloads folder', 'error');
    }
  };

  const openLogs = async (id: string) => {
    setSelectedLogId(id);
    setIsLogModalOpen(true);
    try {
      const details = await HuggingFaceService.getDownloadStatus(id);
      setLogDetails(details);
    } catch (e: any) {
      addToast(e.message || 'Failed to load logs', 'error');
    }
  };

  const openLatestLogs = () => {
    const active = downloadHistory.find((item) => ['queued', 'starting', 'downloading', 'paused'].includes(item.status));
    const fallback = active || downloadHistory[0];
    const id = selectedLogId || fallback?.id;

    if (!id) {
      addToast('No download logs yet', 'info');
      return;
    }

    openLogs(id);
  };

  const clearLogs = async () => {
    if (!selectedLogId) return;
    try {
      await HuggingFaceService.clearDownloadLogs(selectedLogId);
      setLogDetails((prev: any) => prev ? { ...prev, logs: [] } : prev);
      await loadDownloadHistory();
      addToast('Logs cleared', 'info');
    } catch (e: any) {
      addToast(e.message || 'Failed to clear logs', 'error');
    }
  };

  const selectedFiles = files.filter((file) => file.selected);
  const selectedBytes = selectedFiles.reduce((acc, file) => acc + (file.size || 0), 0);
  const totalBytes = files.reduce((acc, file) => acc + (file.size || 0), 0);
  const activeCount = useMemo(
    () => downloadHistory.filter((item) => ['queued', 'starting', 'downloading', 'paused'].includes(item.status)).length,
    [downloadHistory]
  );
  const completedCount = useMemo(
    () => downloadHistory.filter((item) => item.status === 'completed').length,
    [downloadHistory]
  );
  const failedCount = useMemo(
    () => downloadHistory.filter((item) => item.status === 'failed' || item.status === 'canceled').length,
    [downloadHistory]
  );
  const keepAdvancedSearchMounted = view === 'search' || (repoReturnView === 'search' && Boolean(repo));

  return (
    <div className="h-screen w-screen bg-[#09090b] text-[#e0e0e0] font-sans flex flex-col overflow-hidden select-none">
      <TopBar
        onSearch={handleSearch}
        onClearSearch={clearSearch}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLogs={openLatestLogs}
        onOpenDownloadsFolder={handleOpenDownloadsFolder}
        onNavigate={handleViewChange}
        hasLogs={downloadHistory.length > 0 || Boolean(selectedLogId)}
        activeCount={activeCount}
        historyCount={downloadHistory.length}
        repoType={repoType}
        onRepoTypeChange={handleRepoTypeChange}
        updateInfo={updateInfo}
        onOpenUpdate={() => setIsUpdateModalOpen(true)}
      />
      <div className="flex-1 flex overflow-hidden">
        <SidebarLeft
          savedRepos={savedRepos}
          onSelectRepo={(id) => selectRepo(id, 'model')}
          onDeleteRepo={deleteRepoFromHistory}
          currentView={view}
          onViewChange={handleViewChange}
          onOpenDownloadsFolder={handleOpenDownloadsFolder}
          activeCount={activeCount}
          completedCount={completedCount}
          failedCount={failedCount}
          historyCount={downloadHistory.length}
          downloadPath={settings.download_path}
          currentVersion={appVersion}
        />
        {keepAdvancedSearchMounted && (
          <div className={view === 'search' ? 'flex flex-1 min-w-0' : 'hidden'}>
            <AdvancedSearchPage
              repoType={repoType}
              hfToken={settings.hf_token}
              onRepoTypeChange={handleRepoTypeChange}
              onSelectRepo={(id, selectedRepoType) => selectRepo(id, selectedRepoType, 'search')}
              onNotify={addToast}
            />
          </div>
        )}
        {view !== 'search' && (
          <Canvas
            view={view}
            repo={repo}
            repoType={repoType}
            files={files}
            readme={readme}
            searchResults={searchResults}
            downloadHistory={downloadHistory}
            onToggleFile={toggleFile}
            onSetFileSelection={setFileSelection}
            onClearSelected={clearSelectedFiles}
            onSelectRepo={(id) => selectRepo(id, repoType, 'home')}
            onBack={backToResults}
            onOpenFolder={handleOpenFolder}
            onCancelDownload={cancelActiveDownload}
            onPauseDownload={pauseDownload}
            onResumeDownload={resumeDownload}
            onRetryDownload={retryDownload}
            onDeleteDownload={deleteDownloadItem}
            onDeletePhysicalDownload={deletePhysicalDownload}
            onOpenLogs={openLogs}
            loading={loading}
          />
        )}
        {view !== 'search' && (
          <SidebarRight
            downloadHistory={downloadHistory}
            onClearHistory={clearDownloadHistory}
            onDeleteDownload={deleteDownloadItem}
            onCancelDownload={cancelActiveDownload}
            onPauseDownload={pauseDownload}
            onResumeDownload={resumeDownload}
            onRetryDownload={retryDownload}
            onOpenLogs={openLogs}
          />
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        lmStudioPreferredPath={lmStudioPreferredPath}
        onSave={handleSaveSettings}
        onResetAppData={resetAppData}
      />

      <LogModal
        isOpen={isLogModalOpen}
        logDetails={logDetails}
        onClear={clearLogs}
        onClose={() => setIsLogModalOpen(false)}
      />

      <UpdateModal
        isOpen={isUpdateModalOpen}
        updateInfo={updateInfo}
        onClose={() => setIsUpdateModalOpen(false)}
      />

      <AnimatePresence>
        {view === 'home' && repo && files.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-[min(760px,calc(100vw-2rem))]"
          >
            <div className="glass px-6 py-4 rounded-[28px] border border-hf-purple/30 shadow-2xl shadow-hf-purple/20 flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 bg-hf-purple rounded-2xl flex items-center justify-center text-white shadow-lg shadow-hf-purple/40 shrink-0">
                  <Download className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {selectedFiles.length > 0 ? `${selectedFiles.length} Files Selected` : 'Full Repository'}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                    {selectedFiles.length === 0
                      ? `${files.length} files / ${formatBytes(totalBytes)}`
                      : formatBytes(selectedBytes)}
                  </div>
                  {diskInfo && (
                    <div className={`text-[10px] font-bold ${diskInfo.enough ? 'text-hf-blue' : 'text-red-400'}`}>
                      Disk: {formatBytes(diskInfo.availableBytes)} free
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                {selectedFiles.length > 0 && (
                  <button
                    onClick={clearSelectedFiles}
                    className="px-5 py-3 rounded-xl hover:bg-zinc-800 text-zinc-400 text-sm font-bold transition-all"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={startDownload}
                  disabled={isStartingDownload}
                  className="min-w-[190px] bg-hf-purple hover:bg-hf-purple/90 text-white px-7 py-3 rounded-xl font-bold text-sm shadow-lg shadow-hf-purple/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isStartingDownload ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Queueing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      {selectedFiles.length > 0 ? 'Queue Download' : 'Queue Full Repo'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

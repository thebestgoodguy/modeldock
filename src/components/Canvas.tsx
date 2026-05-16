// Developer / Creator: Sadri ERCAN
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  Archive,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Database,
  Download,
  ExternalLink,
  File,
  FileText,
  Filter,
  Folder,
  Gauge,
  HardDrive,
  Heart,
  History,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Terminal,
  Trash2,
  XCircle,
  Zap
} from 'lucide-react';
import { DownloadItem, HFFile, HFRepoInfo, RepoType } from '../types';
import { ReadmeViewer } from './ReadmeViewer';

interface CanvasProps {
  view: 'home' | 'active' | 'downloads';
  repo: HFRepoInfo | null;
  repoType: RepoType;
  files: HFFile[];
  readme: string;
  searchResults: any[];
  downloadHistory: DownloadItem[];
  onToggleFile: (path: string) => void;
  onSetFileSelection: (paths: string[], selected: boolean) => void;
  onClearSelected: () => void;
  onSelectRepo: (repoId: string) => void;
  onBack: () => void;
  onOpenFolder: (id: string) => void;
  onCancelDownload: (id: string) => void;
  onPauseDownload: (id: string) => void;
  onResumeDownload: (id: string) => void;
  onRetryDownload: (id: string) => void;
  onDeleteDownload: (id: string) => void;
  onDeletePhysicalDownload: (folderName: string) => void;
  onOpenLogs: (id: string) => void;
  loading: boolean;
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return 'Size unknown';
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function getRepoLabel(repoType: RepoType) {
  if (repoType === 'dataset') return 'Dataset';
  if (repoType === 'space') return 'Space';
  return 'Model';
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    queued: 'Queued',
    starting: 'Starting',
    downloading: 'Downloading',
    paused: 'Paused',
    completed: 'Completed',
    failed: 'Failed',
    canceled: 'Canceled',
    unknown: 'Unknown'
  };
  return labels[status] || status;
}

function statusClasses(status: string) {
  if (status === 'completed') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (status === 'failed' || status === 'canceled' || status === 'unknown') return 'bg-red-500/15 text-red-400 border-red-500/25';
  if (status === 'paused') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
}

function resultId(result: any) {
  return result.id || result.modelId || result.name || '';
}

function compactNumber(value: number | undefined) {
  const number = value || 0;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return String(number);
}

function repoParts(id: string) {
  const [owner, ...nameParts] = id.split('/');
  return {
    owner: owner || id,
    name: nameParts.join('/') || id
  };
}

function isActiveStatus(status: string) {
  return ['queued', 'starting', 'downloading', 'paused'].includes(status);
}

export const Canvas = ({
  view,
  repo,
  repoType,
  files,
  readme,
  searchResults,
  downloadHistory,
  onToggleFile,
  onSetFileSelection,
  onClearSelected,
  onSelectRepo,
  onBack,
  onOpenFolder,
  onCancelDownload,
  onPauseDownload,
  onResumeDownload,
  onRetryDownload,
  onDeleteDownload,
  onDeletePhysicalDownload,
  onOpenLogs,
  loading
}: CanvasProps) => {
  const [filter, setFilter] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [fileKind, setFileKind] = useState('all');
  const [repoTab, setRepoTab] = useState<'files' | 'readme'>('files');

  const availableFilters = useMemo(() => {
    const tags = new Set<string>();
    searchResults.forEach((result) => {
      if (result.pipeline_tag || result.sdk) tags.add(result.pipeline_tag || result.sdk);
    });
    return Array.from(tags).sort();
  }, [searchResults]);

  const filteredResults = useMemo(() => {
    return searchResults.filter((result) => {
      const id = resultId(result).toLowerCase();
      const matchesFilter = !filter || result.pipeline_tag === filter || result.sdk === filter;
      const matchesSearch = id.includes(localSearch.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [searchResults, filter, localSearch]);

  const activeDownloads = useMemo(() => {
    return (downloadHistory || []).filter((item) => isActiveStatus(item.status));
  }, [downloadHistory]);

  const completedDownloads = useMemo(() => {
    return (downloadHistory || []).filter((item) => !isActiveStatus(item.status));
  }, [downloadHistory]);

  const downloadStats = useMemo(() => {
    const completed = downloadHistory.filter((item) => item.status === 'completed').length;
    const failed = downloadHistory.filter((item) => item.status === 'failed' || item.status === 'canceled').length;
    const paused = downloadHistory.filter((item) => item.status === 'paused').length;
    return {
      total: downloadHistory.length,
      active: activeDownloads.length,
      completed,
      failed,
      paused
    };
  }, [downloadHistory, activeDownloads.length]);

  const filteredFiles = useMemo(() => {
    const query = fileSearch.toLowerCase();
    return files.filter((file) => {
      const lowerPath = file.path.toLowerCase();
      const matchesSearch = !query || lowerPath.includes(query);
      const matchesKind =
        fileKind === 'all' ||
        (fileKind === 'large' && file.size >= 1024 * 1024 * 1024) ||
        (fileKind !== 'large' && lowerPath.endsWith(`.${fileKind}`));
      return matchesSearch && matchesKind;
    });
  }, [files, fileKind, fileSearch]);

  const groupedFiles = useMemo(() => {
    const groups = new Map<string, HFFile[]>();
    filteredFiles.forEach((file) => {
      const folderPath = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : 'root';
      const list = groups.get(folderPath) || [];
      list.push(file);
      groups.set(folderPath, list);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredFiles]);

  const renderDownloadActions = (item: DownloadItem) => {
    const isRunning = item.status === 'downloading' || item.status === 'starting' || item.status === 'queued';
    const isPaused = item.status === 'paused';
    const canRetry = ['failed', 'canceled', 'completed', 'unknown'].includes(item.status);

    return (
      <div className="flex items-center justify-end gap-1.5">
        <button onClick={() => onOpenLogs(item.id)} className="table-icon-button" title="Logs">
          <Terminal className="w-4 h-4" />
        </button>
        {!isRunning && !isPaused && (
          <button onClick={() => onOpenFolder(item.id)} className="table-icon-button" title="Open Folder">
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
        {isRunning && (
          <button onClick={() => onPauseDownload(item.id)} className="table-icon-button hover:text-amber-400" title="Pause">
            <Pause className="w-4 h-4" />
          </button>
        )}
        {isPaused && (
          <button onClick={() => onResumeDownload(item.id)} className="table-icon-button hover:text-cyan-400" title="Resume">
            <Play className="w-4 h-4" />
          </button>
        )}
        {canRetry && (
          <button onClick={() => onRetryDownload(item.id)} className="table-icon-button hover:text-hf-purple" title="Retry">
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        {isRunning || isPaused ? (
          <button onClick={() => onCancelDownload(item.id)} className="table-icon-button hover:text-red-400" title="Cancel">
            <XCircle className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => (item.folderName ? onDeletePhysicalDownload(item.folderName) : onDeleteDownload(item.id))}
            className="table-icon-button hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl"></div>
            <div className="flex flex-col gap-2">
              <div className="w-48 h-6 bg-zinc-800 rounded-lg"></div>
              <div className="w-32 h-4 bg-zinc-800/50 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'downloads' || view === 'active') {
    const items = view === 'active' ? activeDownloads : completedDownloads;
    const title = view === 'active' ? 'Active Queue' : 'Download Library';
    const subtitle = view === 'active'
      ? 'Running, queued, and paused tasks'
      : 'Completed, canceled, and physical records';
    const Icon = view === 'active' ? Zap : Archive;
    const metrics = [
      { label: 'Active', value: downloadStats.active, icon: Zap, color: 'text-cyan-400' },
      { label: 'Completed', value: downloadStats.completed, icon: CheckCircle2, color: 'text-emerald-400' },
      { label: 'Paused', value: downloadStats.paused, icon: Pause, color: 'text-amber-400' },
      { label: 'Failed', value: downloadStats.failed, icon: AlertCircle, color: 'text-red-400' }
    ];

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between gap-6 mb-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-hf-purple">
                <Icon className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-black tracking-tight">{title}</h2>
                <p className="text-zinc-500 text-sm">{subtitle}</p>
              </div>
            </div>
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              {items.length} visible / {downloadStats.total} total
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-zinc-800 bg-zinc-950/35 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">{metric.label}</div>
                  <div className="text-xl font-black text-zinc-100 mt-1">{metric.value}</div>
                </div>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-custom">
          {items.length === 0 ? (
            <div className="h-full min-h-[360px] rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/25 flex flex-col items-center justify-center text-center">
              <Icon className="w-12 h-12 mb-4 text-zinc-700" />
              <p className="text-lg font-bold text-zinc-400">No tasks here</p>
              <p className="text-sm text-zinc-600 mt-1">Queued downloads will appear in the activity sidebar.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-zinc-800/70 bg-zinc-950/25 overflow-hidden">
              <div className="grid grid-cols-[minmax(0,1.7fr)_120px_170px_minmax(0,1.2fr)_170px] gap-4 px-5 py-3 border-b border-zinc-800/70 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                <span>Repository</span>
                <span>Status</span>
                <span>Progress</span>
                <span>Location</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-zinc-900">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="grid grid-cols-[minmax(0,1.7fr)_120px_170px_minmax(0,1.2fr)_170px] gap-4 px-5 py-4 items-center hover:bg-zinc-900/35 transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                        <Database className="w-4 h-4 text-hf-purple" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-100 truncate">{item.repoId}</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">{getRepoLabel(item.repoType || 'model')}</div>
                      </div>
                    </div>

                    <span className={`w-fit px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${statusClasses(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="font-black text-zinc-300">{item.progress || 0}%</span>
                        <span className="text-zinc-500">{item.speed || '0 KB/s'}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress || 0}%` }}
                          className="h-full bg-gradient-to-r from-hf-purple to-cyan-400"
                        />
                      </div>
                    </div>

                    <div className="min-w-0 text-xs text-zinc-500 truncate">
                      {item.folderName || item.savePath || item.fullPath || new Date(item.timestamp).toLocaleString()}
                    </div>

                    {renderDownloadActions(item)}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (repo) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-8 pb-0">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass glass-hover text-zinc-400 hover:text-zinc-200 text-[10px] font-bold transition-all mb-4 w-fit"
          >
            <ChevronLeft className="w-3 h-3" />
            BACK TO RESULTS
          </button>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-start justify-between mb-6 gap-6">
            <div className="flex gap-6 items-center min-w-0">
              <div className="w-20 h-20 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl border border-zinc-700 flex items-center justify-center text-3xl shadow-2xl">
                <Database className="w-9 h-9 text-hf-purple" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1 min-w-0">
                  <h1 className="text-3xl font-bold tracking-tight truncate">{repo.id.split('/')[1] || repo.id}</h1>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-400 font-bold uppercase border border-zinc-700">
                    {getRepoLabel(repo.repoType || repoType)}
                  </span>
                </div>
                <p className="text-zinc-500 text-sm flex items-center gap-2">
                  by <span className="text-hf-purple font-medium">{repo.author}</span>
                  <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                  <Clock className="w-4 h-4" /> Updated {new Date(repo.lastModified).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-3 shrink-0">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-hover text-sm font-medium">
                <Heart className="w-4 h-4 text-zinc-500" />
                {repo.likes}
              </button>
              <button
                onClick={() => window.open(`https://huggingface.co/${repo.repoType === 'dataset' ? 'datasets/' : repo.repoType === 'space' ? 'spaces/' : ''}${repo.id}`, '_blank')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-hf-purple text-white text-sm font-bold shadow-lg shadow-hf-purple/20 hover:scale-105 transition-transform"
              >
                <ExternalLink className="w-4 h-4" />
                View on HF
              </button>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setRepoTab('files')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${repoTab === 'files' ? 'bg-hf-purple text-white' : 'bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'}`}
            >
              <Layers className="w-4 h-4" />
              Files
            </button>
            <button
              onClick={() => setRepoTab('readme')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${repoTab === 'readme' ? 'bg-hf-purple text-white' : 'bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'}`}
            >
              <FileText className="w-4 h-4" />
              README
            </button>
          </div>
        </div>

        {repoTab === 'readme' ? (
          <div className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-custom">
            <ReadmeViewer content={readme} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-custom">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-3xl glass border border-zinc-800/50">
                <div className="flex-1 min-w-[240px] relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Filter files..."
                    value={fileSearch}
                    onChange={(event) => setFileSearch(event.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-hf-purple/50 transition-all"
                  />
                </div>

                <select
                  value={fileKind}
                  onChange={(event) => setFileKind(event.target.value)}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-hf-purple/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="all">All files</option>
                  <option value="gguf">GGUF</option>
                  <option value="safetensors">Safetensors</option>
                  <option value="bin">BIN</option>
                  <option value="json">JSON</option>
                  <option value="large">Large files</option>
                </select>

                <button onClick={() => onSetFileSelection(filteredFiles.map((file) => file.path), true)} className="px-4 py-3 rounded-2xl bg-hf-purple/10 hover:bg-hf-purple text-hf-purple hover:text-white text-xs font-bold transition-all">
                  Select Visible
                </button>
                <button onClick={onClearSelected} className="px-4 py-3 rounded-2xl bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all">
                  Clear
                </button>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Files & Folders</h3>
                <span className="text-[10px] text-zinc-500">{filteredFiles.length} of {files.length} files</span>
              </div>

              <AnimatePresence mode="popLayout">
                {groupedFiles.map(([folderPath, folderFiles]) => (
                  <motion.div key={folderPath} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border border-zinc-800/50 rounded-3xl overflow-hidden bg-zinc-950/20">
                    <div className="px-4 py-3 bg-zinc-900/40 border-b border-zinc-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Folder className="w-4 h-4 text-hf-blue shrink-0" />
                        <span className="text-xs font-bold text-zinc-300 truncate">{folderPath}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">{folderFiles.length}</span>
                    </div>

                    <div className="divide-y divide-zinc-900/80">
                      {folderFiles.map((file) => {
                        const fileName = file.path.split('/').pop() || file.path;
                        return (
                          <div
                            key={file.path}
                            onClick={() => onToggleFile(file.path)}
                            className={`group flex items-center gap-4 p-4 transition-all cursor-pointer ${file.selected ? 'bg-hf-purple/5' : 'hover:bg-zinc-900/50'}`}
                          >
                            <div className={`p-2.5 rounded-xl transition-colors ${file.selected ? 'bg-hf-purple text-white' : 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700'}`}>
                              <File className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold truncate text-zinc-200">{fileName}</div>
                              <div className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5">
                                <HardDrive className="w-3 h-3" />
                                {formatBytes(file.size)}
                              </div>
                            </div>
                            {file.selected ? (
                              <CheckCircle2 className="w-5 h-5 text-hf-purple" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-zinc-700 group-hover:border-hf-purple/50 transition-colors"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (searchResults && searchResults.length > 0) {
    return (
      <div className="flex-1 overflow-y-auto p-8 scrollbar-custom">
        <div className="mb-7 flex flex-col gap-5">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-6 flex items-center justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-hf-purple/10 rounded-xl">
                  <Search className="w-6 h-6 text-hf-purple" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">{getRepoLabel(repoType)} Results</h2>
              </div>
              <p className="text-zinc-500 text-sm">{filteredResults.length} visible from {searchResults.length} Hugging Face results</p>
            </div>
            <div className="hidden xl:grid grid-cols-3 gap-2 shrink-0">
              <div className="result-stat-pill">
                <span>Type</span>
                <strong>{getRepoLabel(repoType)}</strong>
              </div>
              <div className="result-stat-pill">
                <span>Visible</span>
                <strong>{filteredResults.length}</strong>
              </div>
              <div className="result-stat-pill">
                <span>Total</span>
                <strong>{searchResults.length}</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl glass border border-zinc-800/50">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter results by name..."
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-hf-purple/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-3 min-w-[200px]">
              <Filter className="w-4 h-4 text-zinc-500" />
              <select value={filter || ''} onChange={(event) => setFilter(event.target.value || null)} className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-hf-purple/50 transition-all appearance-none cursor-pointer">
                <option value="">All Categories</option>
                {availableFilters.map((item) => (
                  <option key={item} value={item}>{item.replace('-', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredResults.map((result) => {
            const id = resultId(result);
            const parts = repoParts(id);
            const category = result.pipeline_tag || result.sdk || getRepoLabel(repoType);
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onSelectRepo(id)}
                className="group rounded-3xl border border-zinc-800 bg-zinc-950/30 hover:bg-zinc-900/45 hover:border-hf-purple/45 transition-all cursor-pointer overflow-hidden"
              >
                <div className="p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-hf-purple/40 transition-colors">
                    <Database className="w-6 h-6 text-hf-purple" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-hf-purple/10 text-hf-purple border border-hf-purple/20">
                        {category}
                      </span>
                      {result.private && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Private
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-zinc-100 truncate group-hover:text-hf-purple transition-colors">
                      {parts.name}
                    </h3>
                    <p className="text-xs text-zinc-500 truncate">by {result.author || parts.owner}</p>
                  </div>

                  <button className="px-3 py-2 rounded-xl bg-zinc-800/70 group-hover:bg-hf-purple text-zinc-300 group-hover:text-white text-xs font-bold transition-all">
                    Open
                  </button>
                </div>

                <div className="grid grid-cols-3 border-t border-zinc-900 bg-zinc-950/35">
                  <div className="search-result-metric">
                    <Heart className="w-3.5 h-3.5 text-red-400" />
                    <span>{compactNumber(result.likes)}</span>
                  </div>
                  <div className="search-result-metric">
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{compactNumber(result.downloads)}</span>
                  </div>
                  <div className="search-result-metric">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{result.lastModified ? new Date(result.lastModified).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  const recentItems = downloadHistory.slice(0, 4);

  return (
    <div className="flex-1 overflow-y-auto p-8 scrollbar-custom">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)] gap-6">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-7 overflow-hidden relative">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-hf-purple via-cyan-500 to-emerald-400" />
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Local model hub
                </div>
                <h1 className="text-4xl font-black tracking-tight text-zinc-100">ModelDock</h1>
                <p className="mt-3 text-zinc-500 max-w-2xl leading-6">
                  Search Hugging Face, inspect files, and queue local downloads without leaving your workspace.
                </p>
              </div>
              <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                <Boxes className="w-11 h-11 text-hf-purple" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-7">
              <div className="dashboard-chip">
                <Zap className="w-4 h-4 text-cyan-400" />
                Queue first
              </div>
              <div className="dashboard-chip">
                <Gauge className="w-4 h-4 text-amber-400" />
                Disk aware
              </div>
              <div className="dashboard-chip">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Live logs
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-5">
            <div className="flex items-center gap-3 mb-5">
              <BarChart3 className="w-5 h-5 text-hf-purple" />
              <h2 className="font-black text-zinc-100">Today</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-tile">
                <span>Active</span>
                <strong>{downloadStats.active}</strong>
              </div>
              <div className="stat-tile">
                <span>Done</span>
                <strong>{downloadStats.completed}</strong>
              </div>
              <div className="stat-tile">
                <span>Records</span>
                <strong>{downloadStats.total}</strong>
              </div>
              <div className="stat-tile">
                <span>Failed</span>
                <strong>{downloadStats.failed}</strong>
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { title: 'Models', body: 'Weights, tokenizers, configs', icon: Database, color: 'text-hf-purple' },
            { title: 'Datasets', body: 'Files and data snapshots', icon: Archive, color: 'text-cyan-400' },
            { title: 'Spaces', body: 'App repositories', icon: Layers, color: 'text-emerald-400' }
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-zinc-800 bg-zinc-950/25 p-5">
              <item.icon className={`w-6 h-6 mb-4 ${item.color}`} />
              <h3 className="font-bold text-zinc-100">{item.title}</h3>
              <p className="text-xs text-zinc-500 mt-1">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-5">
            <div className="flex items-center gap-3 mb-5">
              <Download className="w-5 h-5 text-cyan-400" />
              <h2 className="font-black text-zinc-100">Download Flow</h2>
            </div>
            <div className="space-y-3">
              {['Pick model, dataset, or space', 'Filter files or select full repo', 'Queue download and watch sidebar'].map((text, index) => (
                <div key={text} className="flex items-center gap-3 rounded-2xl border border-zinc-800/70 p-3">
                  <div className="w-7 h-7 rounded-xl bg-zinc-900 flex items-center justify-center text-xs font-black text-hf-purple">{index + 1}</div>
                  <span className="text-sm text-zinc-300">{text}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-amber-400" />
                <h2 className="font-black text-zinc-100">Recent Activity</h2>
              </div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold">{recentItems.length} shown</span>
            </div>
            {recentItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-600">
                No downloads yet.
              </div>
            ) : (
              <div className="space-y-2">
                {recentItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-950/30 p-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${statusClasses(item.status)}`}>
                      {item.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : isActiveStatus(item.status) ? <Zap className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-zinc-200 truncate">{item.repoId}</div>
                      <div className="text-[10px] text-zinc-500 capitalize">{item.status}</div>
                    </div>
                    <button onClick={() => onOpenLogs(item.id)} className="table-icon-button" title="Logs">
                      <Terminal className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

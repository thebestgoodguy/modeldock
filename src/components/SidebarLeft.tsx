// Developer / Creator: Sadri ERCAN
import {
  Archive,
  Box,
  CheckCircle2,
  Clock3,
  DownloadCloud,
  FolderOpen,
  Gauge,
  HardDrive,
  History,
  Home,
  Layers3,
  Search,
  Trash2,
  XCircle,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppView } from '../types';

interface SidebarLeftProps {
  savedRepos: any[];
  onSelectRepo: (id: string) => void;
  onDeleteRepo: (id: string) => void;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  onOpenDownloadsFolder: () => void;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  historyCount: number;
  downloadPath: string;
  currentVersion?: string;
}

export const SidebarLeft = ({
  savedRepos,
  onSelectRepo,
  onDeleteRepo,
  currentView,
  onViewChange,
  onOpenDownloadsFolder,
  activeCount,
  completedCount,
  failedCount,
  historyCount,
  downloadPath,
  currentVersion
}: SidebarLeftProps) => {
  const menuItems: { id: AppView; icon: typeof Home; label: string; count: number | null }[] = [
    { id: 'home', icon: Home, label: 'Dashboard', count: null },
    { id: 'search', icon: Search, label: 'Advanced Search', count: null },
    { id: 'active', icon: DownloadCloud, label: 'Active Queue', count: activeCount },
    { id: 'downloads', icon: History, label: 'Library', count: historyCount }
  ];

  const queueLoad = Math.min(100, activeCount * 25);

  return (
    <div className="w-64 glass border-r border-zinc-800/50 flex flex-col p-4 gap-5 overflow-hidden">
      <div className="flex flex-col gap-2">
        <span className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Navigate</span>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all duration-300 group ${
              currentView === item.id
                ? 'bg-hf-purple/10 text-hf-purple'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className={`w-4 h-4 ${currentView === item.id ? 'text-hf-purple' : 'group-hover:scale-110 transition-transform'}`} />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {Boolean(item.count) && (
              <span className="min-w-5 h-5 px-1 bg-zinc-800 rounded-full text-[10px] text-zinc-300 font-bold flex items-center justify-center">
                {item.count}
              </span>
            )}
          </button>
        ))}

        <button
          onClick={onOpenDownloadsFolder}
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 transition-all duration-300 group"
        >
          <FolderOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Downloads Folder</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase">
            <Zap className="w-3 h-3 text-cyan-400" />
            Active
          </div>
          <div className="mt-2 text-2xl font-black text-zinc-100">{activeCount}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Done
          </div>
          <div className="mt-2 text-2xl font-black text-zinc-100">{completedCount}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-hf-purple" />
            <span className="text-xs font-bold text-zinc-200">Queue Load</span>
          </div>
          <span className="text-[10px] text-zinc-500">{queueLoad}%</span>
        </div>
        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${queueLoad}%` }}
            className="h-full bg-gradient-to-r from-hf-purple via-cyan-500 to-emerald-400"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-zinc-200">Local Target</span>
        </div>
        <p className="text-[10px] leading-4 text-zinc-500 break-all font-mono">
          {downloadPath || 'Not configured'}
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pr-2 scrollbar-custom space-y-4">
          <div className="flex flex-col gap-2">
            <span className="px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Clock3 className="w-3 h-3" />
              Recent Repos
            </span>
            {!Array.isArray(savedRepos) || savedRepos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-4 text-[10px] text-zinc-600">
                No repositories saved yet.
              </div>
            ) : (
              savedRepos.slice(0, 6).map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => onSelectRepo(repo.id)}
                  className="group flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-950/25 hover:bg-zinc-900/70 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-zinc-800/70 flex items-center justify-center shrink-0">
                    <Box className="w-4 h-4 text-hf-purple" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold truncate">
                      {repo.pipeline_tag || 'Model'}
                    </div>
                    <div className="text-xs font-bold text-zinc-300 truncate group-hover:text-hf-purple">
                      {repo.id.split('/').pop()}
                    </div>
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteRepo(repo.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/15 rounded-lg text-zinc-500 hover:text-red-400 transition-all"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="rounded-2xl border border-zinc-800/80 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Archive className="w-4 h-4 text-cyan-400" />
                Records
              </div>
              <span className="text-xs font-black text-zinc-100">{historyCount}</span>
            </div>
            <div className="rounded-2xl border border-zinc-800/80 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <XCircle className="w-4 h-4 text-red-400" />
                Failed
              </div>
              <span className="text-xs font-black text-zinc-100">{failedCount}</span>
            </div>
            <div className="rounded-2xl border border-zinc-800/80 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Layers3 className="w-4 h-4 text-emerald-400" />
                Formats
              </div>
              <span className="text-[10px] font-bold text-zinc-500">GGUF / SafeTensors</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-zinc-800/50 flex items-center justify-between px-2 text-[10px] text-zinc-500 font-bold tracking-wider uppercase">
        <span>ModelDock App</span>
        <span className="bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800 text-zinc-400 font-mono">v{currentVersion || '1.0.1'}</span>
      </div>
    </div>
  );
};

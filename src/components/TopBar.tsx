// Developer / Creator: Sadri ERCAN
import { useState } from 'react';
import {
  Box,
  Braces,
  Database,
  Download,
  DownloadCloud,
  FolderOpen,
  Github,
  History,
  Home,
  LayoutGrid,
  Search,
  Settings,
  Terminal,
  X
} from 'lucide-react';
import { RepoType } from '../types';

const repoTypeItems: { id: RepoType; label: string; icon: typeof Box }[] = [
  { id: 'model', label: 'Model', icon: Box },
  { id: 'dataset', label: 'Dataset', icon: Database },
  { id: 'space', label: 'Space', icon: Braces }
];

export const TopBar = ({
  onSearch,
  onClearSearch,
  onOpenSettings,
  onOpenLogs,
  onOpenDownloadsFolder,
  onNavigate,
  hasLogs,
  activeCount,
  historyCount,
  repoType,
  onRepoTypeChange
}: {
  onSearch: (val: string) => void;
  onClearSearch: () => void;
  onOpenSettings: () => void;
  onOpenLogs: () => void;
  onOpenDownloadsFolder: () => void;
  onNavigate: (view: 'home' | 'active' | 'downloads') => void;
  hasLogs: boolean;
  activeCount: number;
  historyCount: number;
  repoType: RepoType;
  onRepoTypeChange: (repoType: RepoType) => void;
}) => {
  const [query, setQuery] = useState('');
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  const submit = () => {
    const value = query.trim();
    if (value) onSearch(value);
  };

  const clearSearch = () => {
    setQuery('');
    onClearSearch();
  };

  const runQuickAction = (action: () => void) => {
    action();
    setQuickMenuOpen(false);
  };

  return (
    <div className="h-16 glass border-b border-zinc-800/50 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-tr from-hf-purple to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-hf-purple/20">
          <Download className="text-white w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-none hf-gradient-text">ModelDock</span>
          <span className="text-[10px] text-zinc-500 font-medium tracking-widest uppercase">Local Hub</span>
        </div>
      </div>

      <div className="flex-1 max-w-4xl px-8 flex gap-3 items-center">
        <div className="flex items-center gap-1 bg-zinc-950/60 border border-zinc-800 rounded-2xl p-1">
          {repoTypeItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onRepoTypeChange(item.id)}
              className={`h-9 px-3 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${
                repoType === item.id
                  ? 'bg-hf-purple text-white shadow-lg shadow-hf-purple/20'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/70'
              }`}
              title={item.label}
            >
              <item.icon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 group-focus-within:text-hf-purple transition-colors" />
          <input
            type="text"
            value={query}
            placeholder={`Search author or ${repoType} ID...`}
            className="w-full h-11 bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-11 pr-36 text-sm focus:outline-none focus:ring-2 focus:ring-hf-purple/50 focus:border-hf-purple/50 transition-all placeholder:text-zinc-600"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-[76px] top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-all flex items-center justify-center"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={submit}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 rounded-xl bg-zinc-800 hover:bg-hf-purple text-zinc-200 text-xs font-bold transition-all"
          >
            Search
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        <button
          onClick={() => window.open('https://github.com/thebestgoodguy/modeldock.git', '_blank', 'noopener,noreferrer')}
          className="p-2.5 rounded-xl glass-hover text-zinc-400 hover:text-white transition-colors"
          title="GitHub repository"
        >
          <Github className="w-5 h-5" />
        </button>
        <button
          onClick={() => setQuickMenuOpen((value) => !value)}
          className="p-2.5 rounded-xl glass-hover text-zinc-400 hover:text-white transition-colors"
          title="Quick actions"
        >
          <LayoutGrid className="w-5 h-5" />
        </button>
        {quickMenuOpen && (
          <div className="absolute right-16 top-12 w-72 rounded-3xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl p-3 z-[80]">
            <div className="px-3 py-2">
              <div className="text-xs font-bold text-zinc-100">Quick Actions</div>
              <div className="text-[10px] text-zinc-500">{activeCount} active / {historyCount} records</div>
            </div>
            <div className="grid gap-1">
              <button onClick={() => runQuickAction(() => onNavigate('home'))} className="quick-menu-item">
                <Home className="w-4 h-4 text-hf-purple" />
                <span>Dashboard</span>
              </button>
              <button onClick={() => runQuickAction(() => onNavigate('active'))} className="quick-menu-item">
                <DownloadCloud className="w-4 h-4 text-cyan-400" />
                <span>Active Queue</span>
              </button>
              <button onClick={() => runQuickAction(() => onNavigate('downloads'))} className="quick-menu-item">
                <History className="w-4 h-4 text-amber-400" />
                <span>Download History</span>
              </button>
              <button onClick={() => runQuickAction(onOpenDownloadsFolder)} className="quick-menu-item">
                <FolderOpen className="w-4 h-4 text-emerald-400" />
                <span>Open Downloads Folder</span>
              </button>
              <button onClick={() => runQuickAction(onOpenSettings)} className="quick-menu-item">
                <Settings className="w-4 h-4 text-zinc-400" />
                <span>Preferences</span>
              </button>
            </div>
          </div>
        )}
        <button
          onClick={onOpenLogs}
          disabled={!hasLogs}
          className="p-2.5 rounded-xl glass-hover text-zinc-400 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-zinc-400"
          title="Logs"
        >
          <Terminal className="w-5 h-5" />
        </button>
        <div className="h-8 w-px bg-zinc-800 mx-1"></div>
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-xl glass-hover text-zinc-400 hover:text-white transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

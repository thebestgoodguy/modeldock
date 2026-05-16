// Developer / Creator: Sadri ERCAN
import React from 'react';
import {
  CheckCircle2,
  Clock,
  DownloadCloud,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Terminal,
  Trash2,
  X,
  XCircle,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { DownloadItem } from '../types';

interface SidebarRightProps {
  downloadHistory: DownloadItem[];
  onClearHistory: () => void;
  onDeleteDownload: (id: string) => void;
  onCancelDownload: (id: string) => void;
  onPauseDownload: (id: string) => void;
  onResumeDownload: (id: string) => void;
  onRetryDownload: (id: string) => void;
  onOpenLogs: (id: string) => void;
}

function statusTone(status: string) {
  if (status === 'completed') return 'text-emerald-400';
  if (status === 'failed' || status === 'canceled') return 'text-red-400';
  if (status === 'paused') return 'text-amber-400';
  return 'text-cyan-400';
}

export const SidebarRight = ({
  downloadHistory = [],
  onClearHistory,
  onDeleteDownload,
  onCancelDownload,
  onPauseDownload,
  onResumeDownload,
  onRetryDownload,
  onOpenLogs
}: SidebarRightProps) => {
  const activeItems = downloadHistory.filter((item) =>
    ['queued', 'starting', 'downloading', 'paused'].includes(item.status)
  );
  const completedCount = downloadHistory.filter((item) => item.status === 'completed').length;
  const failedCount = downloadHistory.filter((item) => item.status === 'failed' || item.status === 'canceled').length;
  const latestItems = downloadHistory.slice(0, 5);

  return (
    <div className="w-80 glass border-l border-zinc-800/50 flex flex-col overflow-hidden">
      <div className="p-5 flex flex-col gap-5 flex-1 min-h-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-hf-purple" />
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest">Activity</h3>
          </div>
          <button
            onClick={onClearHistory}
            className="p-1.5 hover:bg-red-500/10 rounded-xl text-zinc-500 hover:text-red-500 transition-all"
            title="Clear History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
            <div className="text-[9px] text-zinc-500 font-bold uppercase">Active</div>
            <div className="text-xl font-black text-cyan-400">{activeItems.length}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
            <div className="text-[9px] text-zinc-500 font-bold uppercase">Done</div>
            <div className="text-xl font-black text-emerald-400">{completedCount}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
            <div className="text-[9px] text-zinc-500 font-bold uppercase">Failed</div>
            <div className="text-xl font-black text-red-400">{failedCount}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-custom space-y-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-3 h-3" />
                Live Queue
              </span>
              <span className="text-[10px] text-zinc-600">{activeItems.length} running</span>
            </div>

            {activeItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-800 p-5 text-center">
                <DownloadCloud className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
                <p className="text-xs text-zinc-500">Queue is idle</p>
              </div>
            ) : (
              activeItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-2xl bg-zinc-950/35 border border-zinc-800/70 flex flex-col gap-3 hover:border-hf-purple/30 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-zinc-200 truncate">{item.repoId.split('/').pop()}</div>
                      <div className={`text-[10px] capitalize font-bold ${statusTone(item.status)}`}>{item.status}</div>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.status === 'paused' ? (
                        <button onClick={() => onResumeDownload(item.id)} className="side-icon-button" title="Resume">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => onPauseDownload(item.id)} className="side-icon-button" title="Pause">
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => onOpenLogs(item.id)} className="side-icon-button" title="Logs">
                        <Terminal className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onCancelDownload(item.id)} className="side-icon-button hover:text-red-400" title="Cancel">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress || 0}%` }}
                        className="h-full bg-gradient-to-r from-hf-purple to-cyan-400"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase">
                      <span className="text-cyan-400">{item.progress || 0}%</span>
                      <span className="text-zinc-500">{item.speed || '0 KB/s'}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Recent
              </span>
              <span className="text-[10px] text-zinc-600">{downloadHistory.length} records</span>
            </div>

            {latestItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-4 text-[10px] text-zinc-600">
                No download records yet.
              </div>
            ) : (
              latestItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-zinc-800/70 bg-zinc-950/25 p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center ${statusTone(item.status)}`}>
                    {item.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                      item.status === 'failed' || item.status === 'canceled' ? <XCircle className="w-4 h-4" /> :
                      item.status === 'paused' ? <Pause className="w-4 h-4" /> :
                      <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-zinc-300 truncate">{item.repoId.split('/').pop()}</div>
                    <div className="text-[10px] text-zinc-600 capitalize">{item.status}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onOpenLogs(item.id)} className="side-icon-button" title="Logs">
                      <Terminal className="w-3.5 h-3.5" />
                    </button>
                    {(item.status === 'failed' || item.status === 'canceled') && (
                      <button onClick={() => onRetryDownload(item.id)} className="side-icon-button" title="Retry">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!['queued', 'starting', 'downloading', 'paused'].includes(item.status) && (
                      <button onClick={() => onDeleteDownload(item.id)} className="side-icon-button hover:text-red-400" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

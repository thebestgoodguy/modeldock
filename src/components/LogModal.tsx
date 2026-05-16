// Developer / Creator: Sadri ERCAN
import { AnimatePresence, motion } from 'motion/react';
import { Terminal, Trash2, X } from 'lucide-react';

interface LogModalProps {
  isOpen: boolean;
  logDetails: any | null;
  onClose: () => void;
  onClear: () => void;
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

export const LogModal = ({ isOpen, logDetails, onClose, onClear }: LogModalProps) => {
  const logs = logDetails?.logs || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-8"
        >
          <motion.div
            initial={{ scale: 0.96, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 20 }}
            className="w-full max-w-4xl max-h-[78vh] glass border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-zinc-800/70 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Terminal className="w-5 h-5 text-hf-purple shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-bold text-zinc-100 truncate">{logDetails?.repoId || 'Download Logs'}</h3>
                  <p className="text-xs text-zinc-500">{statusLabel(logDetails?.status || 'unknown')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClear}
                  className="px-3 py-2 rounded-xl bg-zinc-800/70 hover:bg-red-500/15 text-zinc-300 hover:text-red-400 text-xs font-bold transition-all flex items-center gap-2"
                  title="Clear logs"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
                <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400" title="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <pre className="p-5 h-[58vh] overflow-auto scrollbar-custom text-xs leading-5 text-zinc-300 whitespace-pre-wrap font-mono bg-zinc-950/40">
              {logs.length > 0 ? logs.join('\n') : 'No logs yet.'}
            </pre>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

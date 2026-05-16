// Developer / Creator: Sadri ERCAN
import { AnimatePresence, motion } from 'motion/react';
import { Download, ExternalLink, Sparkles, X } from 'lucide-react';
import { UpdateInfo } from '../types';

interface UpdateModalProps {
  isOpen: boolean;
  updateInfo: UpdateInfo | null;
  onClose: () => void;
}

export const UpdateModal = ({ isOpen, updateInfo, onClose }: UpdateModalProps) => {
  if (!updateInfo) return null;

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
            className="w-full max-w-3xl max-h-[80vh] glass border border-hf-purple/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-zinc-800/70 flex items-center justify-between gap-4 bg-gradient-to-r from-hf-purple/10 to-transparent">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-hf-purple rounded-2xl flex items-center justify-center text-white shadow-lg shadow-hf-purple/40 shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-zinc-100 text-lg truncate">
                    Update Available: v{updateInfo.latestVersion}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Current Version: v{updateInfo.currentVersion}
                  </p>
                </div>
              </div>

              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400" title="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto scrollbar-custom space-y-4 bg-zinc-950/40">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">What's New / Changelog</div>
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap font-sans">
                {updateInfo.changelog || 'No changelog provided for this release.'}
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800/70 flex items-center justify-end gap-3 bg-zinc-950/60">
              <button
                onClick={() => window.open(updateInfo.releaseUrl, '_blank', 'noopener,noreferrer')}
                className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Release Page
              </button>
              <button
                onClick={() => {
                  window.open(updateInfo.downloadUrl || updateInfo.releaseUrl, '_blank', 'noopener,noreferrer');
                  onClose();
                }}
                className="px-6 py-3 rounded-xl bg-hf-purple hover:bg-hf-purple/90 text-white text-xs font-bold transition-all shadow-lg shadow-hf-purple/20 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Update
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle2, Cpu, FolderOpen, Gauge, RotateCcw, Save, Settings, Shield, X } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  lmStudioPreferredPath: string;
  onSave: (settings: AppSettings) => void;
  onResetAppData: () => Promise<void> | void;
}

export const SettingsModal = ({
  isOpen,
  onClose,
  settings,
  lmStudioPreferredPath,
  onSave,
  onResetAppData
}: SettingsModalProps) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setResetConfirm(false);
      setResetting(false);
    }
  }, [isOpen, settings]);

  const updateField = (key: keyof AppSettings, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const useLmStudioPath = () => {
    const lmPath = localSettings.lm_studio_path || lmStudioPreferredPath;
    if (lmPath) {
      setLocalSettings((prev) => ({
        ...prev,
        lm_studio_path: lmPath,
        download_path: lmPath
      }));
    }
  };

  const handleSave = () => {
    onSave(localSettings);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  const handleResetAppData = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      window.setTimeout(() => setResetConfirm(false), 4000);
      return;
    }

    setResetting(true);
    try {
      await onResetAppData();
      setResetConfirm(false);
      onClose();
    } finally {
      setResetting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl glass rounded-[24px] border border-zinc-800 shadow-2xl overflow-hidden"
          >
            <div className="p-8 max-h-[88vh] overflow-y-auto scrollbar-custom">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-hf-purple/10 rounded-xl">
                    <Settings className="w-6 h-6 text-hf-purple" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Preferences</h2>
                    <p className="text-xs text-zinc-500">Token, folders, queue, and worker settings</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    Hugging Face API Token
                  </label>
                  <input
                    type="password"
                    value={localSettings.hf_token}
                    onChange={(e) => updateField('hf_token', e.target.value)}
                    placeholder="hf_..."
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-hf-purple/50 transition-all placeholder:text-zinc-700"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <FolderOpen className="w-3 h-3" />
                      Download Directory
                    </label>
                    <input
                      type="text"
                      value={localSettings.download_path}
                      onChange={(e) => updateField('download_path', e.target.value)}
                      placeholder="C:/Models"
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-hf-purple/50 transition-all placeholder:text-zinc-700 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <FolderOpen className="w-3 h-3" />
                      LM Studio Models
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={localSettings.lm_studio_path || lmStudioPreferredPath}
                        onChange={(e) => updateField('lm_studio_path', e.target.value)}
                        placeholder="C:/Users/me/.lmstudio/models"
                        className="min-w-0 flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-hf-purple/50 transition-all placeholder:text-zinc-700 font-mono"
                      />
                      <button
                        onClick={useLmStudioPath}
                        className="px-3 rounded-2xl bg-zinc-800 hover:bg-hf-purple text-zinc-200 text-xs font-bold transition-all"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <Gauge className="w-3 h-3" />
                      Queue Slots
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={localSettings.max_concurrent_downloads}
                      onChange={(e) => updateField('max_concurrent_downloads', e.target.value)}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-hf-purple/50 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <Cpu className="w-3 h-3" />
                      Workers
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="32"
                      value={localSettings.max_workers}
                      onChange={(e) => updateField('max_workers', e.target.value)}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-hf-purple/50 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <Gauge className="w-3 h-3" />
                      Soft Limit KB/s
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={localSettings.speed_limit_kbps}
                      onChange={(e) => updateField('speed_limit_kbps', e.target.value)}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-hf-purple/50 transition-all"
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-6 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" />
                      Reset App Data
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      Clears recent, library records, saved repos, and hides older local folders. Downloaded files stay on disk.
                    </p>
                  </div>
                  <button
                    onClick={handleResetAppData}
                    disabled={resetting}
                    className={`shrink-0 px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      resetConfirm
                        ? 'bg-red-500 text-white hover:bg-red-400'
                        : 'bg-red-500/10 text-red-400 hover:bg-red-500/15'
                    } disabled:opacity-60`}
                  >
                    <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
                    {resetting ? 'Resetting' : resetConfirm ? 'Confirm Reset' : 'Reset App'}
                  </button>
                </div>
              </div>

              <div className="mt-10 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-2xl glass glass-hover text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saved}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                    saved
                      ? 'bg-green-500 text-white'
                      : 'bg-hf-purple text-white shadow-lg shadow-hf-purple/20 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {saved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

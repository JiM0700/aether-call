import React, { useEffect } from 'react';
import { QualityLevel, QUALITY_PRESETS } from '../utils/presets';
import { Sliders, Sparkles, Check, Wifi } from 'lucide-react';

interface QualityModalProps {
  currentQuality: QualityLevel;
  onSelectQuality: (quality: QualityLevel) => void;
  onClose: () => void;
}

export const QualityModal: React.FC<QualityModalProps> = ({
  currentQuality,
  onSelectQuality,
  onClose,
}) => {
  const options: QualityLevel[] = ['auto', '4k', '1080p', '720p', '480p', '360p', 'audio-only'];

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="max-w-md w-full glass-panel-elevated rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Quality & Lag Prevention</h3>
              <p className="text-xs text-slate-400">Select manual resolution or smart network auto-scaling</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {options.map((key) => {
            const preset = QUALITY_PRESETS[key];
            const isSelected = currentQuality === key;
            const isAuto = key === 'auto';

            return (
              <button
                key={key}
                onClick={() => {
                  onSelectQuality(key);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left border transition ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500/60 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-900/40 border-white/5 hover:bg-slate-800/40 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isAuto
                        ? 'bg-amber-500/20 text-amber-400'
                        : isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isAuto ? <Sparkles className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-100 text-sm">{preset.label}</span>
                      {isAuto && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{preset.description}</div>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 ml-2">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

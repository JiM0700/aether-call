import React, { useState, useEffect } from 'react';
import { Server, Check, RotateCcw, ExternalLink, HelpCircle } from 'lucide-react';

interface SignalingModalProps {
  currentUrl: string;
  onSave: (url: string) => void;
  onClose: () => void;
}

export const SignalingModal: React.FC<SignalingModalProps> = ({
  currentUrl,
  onSave,
  onClose,
}) => {
  const [urlInput, setUrlInput] = useState<string>(currentUrl);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSave = () => {
    const trimmed = urlInput.trim();
    onSave(trimmed);
    setSaved(true);
    setTimeout(() => {
      onClose();
      window.location.reload();
    }, 600);
  };

  const handleReset = () => {
    localStorage.removeItem('aether_signaling_url');
    setUrlInput('');
    onSave('');
    setTimeout(() => {
      onClose();
      window.location.reload();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full glass-panel-elevated rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Signaling Relay Settings</h3>
              <p className="text-xs text-slate-400">Configure WebRTC handshake server</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Informative Note */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 text-xs text-amber-200">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <HelpCircle className="w-4 h-4 shrink-0" />
            Why is a signaling server required?
          </div>
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            WebRTC peer-to-peer audio and video requires an ephemeral WebSocket relay for the initial handshake.
            GitHub Pages only hosts static files and cannot run WebSockets.
          </p>
        </div>

        {/* URL Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Signaling Server URL
          </label>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="e.g. https://your-server.onrender.com or http://localhost:5173"
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Quick Options */}
        <div className="space-y-2 pt-1 text-xs">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            How to run or deploy a signaling server:
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1 text-[11px] text-slate-300">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>Option 1: Run Locally (with embedded signaling)</span>
            </div>
            <code className="block bg-slate-950 p-2 rounded-lg font-mono text-emerald-400">
              npm run dev
            </code>
            <p className="text-slate-400 text-[10px]">
              Vite now embeds the signaling server directly on port 5173. Both local and mobile devices on your Wi-Fi will connect automatically.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5 text-[11px] text-slate-300">
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Option 2: Free 1-Click Cloud Deployment</span>
              <a
                href="https://render.com"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[10px]"
              >
                Render.com <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-400 text-[10px]">
              Deploy this repository as a free Web Service on Render (Build: <code className="text-slate-200">npm run build</code>, Start: <code className="text-slate-200">npm run start</code>). Render will give you a free permanent HTTPS URL you can paste here.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <button
            onClick={handleReset}
            className="px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Default
          </button>

          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-blue-600/20"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved! Reloading...
              </>
            ) : (
              'Save & Reconnect'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

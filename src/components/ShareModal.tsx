import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, Copy, Check, ShieldCheck, QrCode } from 'lucide-react';

interface ShareModalProps {
  callUrl: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ callUrl, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(callUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Failed to copy to clipboard', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="max-w-md w-full glass-panel-elevated rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Invite with Link or QR</h3>
              <p className="text-xs text-slate-400">Scan or share to connect securely across any device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
          <div className="p-3 bg-white rounded-2xl shadow-xl">
            <QRCodeSVG value={callUrl} size={180} level="M" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <QrCode className="w-3.5 h-3.5 text-blue-400" />
            Scan with iPhone / Android Camera to join immediately
          </div>
        </div>

        {/* Copyable Link */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Secure Direct Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={callUrl}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono focus:outline-none select-all"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 shrink-0 transition shadow-lg ${
                copied
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Zero-Storage & E2EE Info Notice */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-xs text-emerald-300">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          <div className="text-[11px] leading-relaxed">
            The URL fragment (<code className="font-mono text-emerald-200">#key=...</code>) contains your
            client-side cryptographic key. It is never transmitted to the cloud server, ensuring zero-knowledge
            tamper-proof privacy.
          </div>
        </div>
      </div>
    </div>
  );
};

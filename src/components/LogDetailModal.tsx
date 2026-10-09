import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Terminal,
  Shield,
  Ban,
  Globe,
  Clock,
  Layers,
  FileCode,
} from 'lucide-react';
import { SecurityLog } from '../types/security.ts';

interface LogDetailModalProps {
  log: SecurityLog | null;
  onClose: () => void;
  onBanIp: (ip: string, reason: string) => Promise<void>;
  isBanned: boolean;
}

export const LogDetailModal: React.FC<LogDetailModalProps> = ({
  log,
  onClose,
  onBanIp,
  isBanned,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!log) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const iptablesCmd = `sudo iptables -A INPUT -s ${log.sourceIp} -j DROP`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Log Event Forensic Analysis</h3>
              <span className="text-[11px] text-slate-400 font-mono">ID: {log.id}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Raw Syslog Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
              <span className="flex items-center gap-1">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                RAW SYSLOG STRING (RFC 3164)
              </span>
              <button
                onClick={() => handleCopy('raw', log.raw)}
                className="hover:text-white flex items-center gap-1 text-slate-400"
              >
                {copiedKey === 'raw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'raw' ? 'Copied' : 'Copy Raw'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-slate-200 text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {log.raw}
            </pre>
          </div>

          {/* Parsed Fields Grid */}
          <div className="space-y-2">
            <span className="text-slate-400 font-mono text-[11px] block font-bold">
              NORMALIZED EVENT ATTRIBUTES
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-[11px]">
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">TIMESTAMP:</span>
                <span className="text-slate-200">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">SERVICE DAEMON:</span>
                <span className="text-cyan-400 font-bold">{log.service}</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">EVENT CLASSIFIER:</span>
                <span className="text-amber-400 font-bold">{log.eventType}</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">ACCOUNT USER:</span>
                <span className={log.username === 'root' ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                  {log.username}
                </span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">SOURCE IP &amp; PORT:</span>
                <span className="text-amber-300 font-bold">{log.sourceIp}:{log.port}</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">SEVERITY:</span>
                <span className="text-rose-400 font-bold uppercase">{log.severity}</span>
              </div>
            </div>
          </div>

          {/* Geo IP & Host Intel */}
          <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-mono text-[11px] block flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              THREAT GEOLOCATION &amp; NETWORK TELEMETRY
            </span>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{log.geo?.flag || '🛡️'}</span>
              <div>
                <p className="font-bold text-white text-xs">
                  {log.geo?.country} ({log.geo?.city})
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Organization / ISP: {log.geo?.org || 'Standard Public Netblock'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Mitigation Rule */}
          <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 font-mono block">QUICK FIREWALL MITIGATION:</span>
              <code className="px-2 py-1 bg-slate-950 rounded text-cyan-300 font-mono text-[11px] border border-slate-800">
                {iptablesCmd}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy('iptables', iptablesCmd)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono flex items-center gap-1"
              >
                {copiedKey === 'iptables' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
              {!isBanned && log.sourceIp !== '127.0.0.1' && (
                <button
                  onClick={() => onBanIp(log.sourceIp, `Mitigated from log inspector: ${log.eventType}`)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold"
                >
                  Ban Host Now
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 text-xs transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

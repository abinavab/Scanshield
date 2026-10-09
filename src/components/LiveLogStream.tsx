import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Pause,
  Play,
  ArrowDown,
  Search,
  Filter,
  Maximize2,
  Copy,
  Check,
} from 'lucide-react';
import { SecurityLog } from '../types/security.ts';

interface LiveLogStreamProps {
  logs: SecurityLog[];
  onSelectLog: (log: SecurityLog) => void;
  maxDisplay?: number;
}

export const LiveLogStream: React.FC<LiveLogStreamProps> = ({
  logs,
  onSelectLog,
  maxDisplay = 200,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [frozenLogs, setFrozenLogs] = useState<SecurityLog[]>(logs);

  useEffect(() => {
    if (!isPaused) {
      setFrozenLogs(logs);
    }
  }, [logs, isPaused]);

  const filteredLogs = frozenLogs
    .filter((l) => {
      if (severityFilter !== 'ALL' && l.severity !== severityFilter) return false;
      if (!filterText) return true;
      const q = filterText.toLowerCase();
      return (
        l.message.toLowerCase().includes(q) ||
        l.username.toLowerCase().includes(q) ||
        l.sourceIp.includes(q) ||
        l.raw.toLowerCase().includes(q)
      );
    })
    .slice(0, maxDisplay);

  const handleCopyRaw = (e: React.MouseEvent, log: SecurityLog) => {
    e.stopPropagation();
    navigator.clipboard.writeText(log.raw);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getSeverityStyle = (severity: SecurityLog['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/60';
      case 'high':
        return 'text-orange-400 bg-orange-950/40 border-orange-800/60';
      case 'medium':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/60';
      case 'low':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60';
      default:
        return 'text-slate-400 bg-slate-900/40 border-slate-800/60';
    }
  };

  const getEventBadge = (eventType: SecurityLog['eventType']) => {
    switch (eventType) {
      case 'FAILED_PASSWORD':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">FAILED PWD</span>;
      case 'INVALID_USER':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">INVALID USER</span>;
      case 'ACCEPTED_PASSWORD':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">ACCEPTED</span>;
      case 'SUDO_FAILURE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">SUDO ABUSE</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">{eventType}</span>;
    }
  };

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col h-[520px]">
      {/* Stream Toolbar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-bold text-slate-200">LIVE SYSLOG STREAM</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800/50 font-mono">
            /var/log/auth.log
          </span>
          {isPaused && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40 animate-pulse">
              STREAM PAUSED
            </span>
          )}
        </div>

        {/* Filters and Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Filter IP, user, command..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-7 pr-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500 w-44 sm:w-56"
            />
          </div>

          {/* Severity selector */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High &amp; Above</option>
            <option value="medium">Medium</option>
            <option value="low">Low (Success)</option>
          </select>

          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              isPaused
                ? 'bg-amber-600/30 text-amber-300 border-amber-500 hover:bg-amber-600/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title={isPaused ? 'Resume live autoscroll' : 'Pause stream to inspect logs'}
          >
            {isPaused ? <Play className="w-3 h-3 fill-amber-300" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </div>

      {/* Terminal View Content */}
      <div
        ref={containerRef}
        className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5 bg-slate-950/95 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <Terminal className="w-8 h-8 opacity-40" />
            <p className="text-xs">No log events matching current filter.</p>
            <button
              onClick={() => {
                setFilterText('');
                setSeverityFilter('ALL');
              }}
              className="text-cyan-400 hover:underline text-xs"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const dateStr = new Date(log.timestamp).toLocaleTimeString();
            return (
              <div
                key={log.id}
                onClick={() => onSelectLog(log)}
                className={`group p-2 rounded-lg border transition-all cursor-pointer hover:bg-slate-900/90 hover:border-slate-700 ${getSeverityStyle(
                  log.severity
                )}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400">{dateStr}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold text-[10px]">
                      {log.service}
                    </span>
                    {getEventBadge(log.eventType)}
                    <span className="text-cyan-300 font-bold">
                      user:{' '}
                      <span className={log.username === 'root' || log.username === 'admin' ? 'text-rose-400 font-extrabold' : 'text-slate-200'}>
                        {log.username}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 flex items-center gap-1">
                      <span>{log.geo?.flag || '🌐'}</span>
                      <span className="font-semibold text-amber-300">{log.sourceIp}</span>
                      <span className="text-slate-500">:{log.port}</span>
                    </span>
                    <button
                      onClick={(e) => handleCopyRaw(e, log)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-opacity"
                      title="Copy raw syslog string"
                    >
                      {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="text-slate-300 break-all text-[11px] leading-relaxed font-sans">
                  {log.message}
                </div>

                {log.isSimulated && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 italic font-mono">
                    <span>⚡ Generated in Kali Attack Simulator</span>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Footer Status Bar */}
      <div className="px-4 py-2 bg-slate-900/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <span>Displaying: <strong className="text-slate-200">{filteredLogs.length}</strong> events</span>
          <span>Buffer: <strong className="text-slate-200">{logs.length}</strong> / 3000 max</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <span>Click any line to inspect RFC fields &amp; MITRE technique</span>
        </div>
      </div>
    </div>
  );
};

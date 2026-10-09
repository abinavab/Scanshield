import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Terminal,
  Eye,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Shield,
} from 'lucide-react';
import { SecurityLog } from '../types/security.ts';

interface ForensicsViewProps {
  logs: SecurityLog[];
  onSelectLog: (log: SecurityLog) => void;
}

export const ForensicsView: React.FC<ForensicsViewProps> = ({ logs, onSelectLog }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [ipFilter, setIpFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (serviceFilter !== 'ALL' && log.service !== serviceFilter) return false;
    if (eventFilter !== 'ALL' && log.eventType !== eventFilter) return false;
    if (severityFilter !== 'ALL' && log.severity !== severityFilter) return false;
    if (ipFilter && !log.sourceIp.includes(ipFilter.trim())) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.username.toLowerCase().includes(q) ||
        log.sourceIp.includes(q) ||
        log.raw.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const exportCsv = () => {
    const headers = ['Timestamp', 'Service', 'Event Type', 'Username', 'Source IP', 'Port', 'Severity', 'Message', 'Raw'];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.service}"`,
      `"${l.eventType}"`,
      `"${l.username}"`,
      `"${l.sourceIp}"`,
      l.port,
      `"${l.severity}"`,
      `"${l.message.replace(/"/g, '""')}"`,
      `"${l.raw.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `security_forensics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `security_logs_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadge = (sev: SecurityLog['severity']) => {
    switch (sev) {
      case 'critical':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">CRITICAL</span>;
      case 'high':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">HIGH</span>;
      case 'medium':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">MEDIUM</span>;
      case 'low':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">LOW</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">INFO</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              Security Log Forensics &amp; Deep Query Engine
            </h2>
            <p className="text-xs text-slate-400">
              Query, filter, and inspect normalized syslog and PAM authentication events.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={exportJson}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Query input */}
          <div className="md:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search in message, raw syslog, username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Service */}
          <div>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Services</option>
              <option value="sshd">sshd (OpenSSH)</option>
              <option value="sudo">sudo (Privilege)</option>
              <option value="vsftpd">vsftpd (FTP)</option>
              <option value="apache">apache</option>
            </select>
          </div>

          {/* Event Type */}
          <div>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Event Types</option>
              <option value="FAILED_PASSWORD">FAILED_PASSWORD</option>
              <option value="INVALID_USER">INVALID_USER</option>
              <option value="ACCEPTED_PASSWORD">ACCEPTED_PASSWORD</option>
              <option value="SUDO_FAILURE">SUDO_FAILURE</option>
              <option value="CONNECTION_CLOSED">CONNECTION_CLOSED</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {(searchQuery || serviceFilter !== 'ALL' || eventFilter !== 'ALL' || severityFilter !== 'ALL') && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>
              Found <strong className="text-white">{filteredLogs.length}</strong> matching records out of {logs.length}
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setServiceFilter('ALL');
                setEventFilter('ALL');
                setSeverityFilter('ALL');
                setIpFilter('');
              }}
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset all filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Forensics Table */}
      <div className="bg-slate-950 rounded-xl border border-slate-800/80 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="p-3">TIMESTAMP</th>
                <th className="p-3">SEVERITY</th>
                <th className="p-3">DAEMON</th>
                <th className="p-3">EVENT TYPE</th>
                <th className="p-3">TARGET USER</th>
                <th className="p-3">SOURCE IP &amp; GEO</th>
                <th className="p-3">FORENSIC SUMMARY</th>
                <th className="p-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-mono">
                    No log records match current query parameters.
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, 150).map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => onSelectLog(log)}
                    className="hover:bg-slate-900/60 cursor-pointer transition-colors group"
                  >
                    <td className="p-3 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}{' '}
                      <span className="text-slate-600">
                        {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {getSeverityBadge(log.severity)}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 font-mono border border-slate-800 text-[11px]">
                        {log.service}
                      </span>
                    </td>

                    <td className="p-3 font-mono text-[11px] whitespace-nowrap text-slate-300">
                      {log.eventType}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`font-mono font-bold text-[11px] ${
                          log.username === 'root' || log.username === 'admin'
                            ? 'text-rose-400'
                            : 'text-slate-200'
                        }`}
                      >
                        {log.username}
                      </span>
                    </td>

                    <td className="p-3 whitespace-nowrap font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span>{log.geo?.flag || '🛡️'}</span>
                        <span className="text-amber-300 font-semibold">{log.sourceIp}</span>
                        <span className="text-slate-500">:{log.port}</span>
                      </div>
                    </td>

                    <td className="p-3 text-slate-300 max-w-xs truncate font-sans text-[11px]">
                      {log.message}
                    </td>

                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleCopy(log.id, log.raw)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                          title="Copy raw syslog entry"
                        >
                          {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onSelectLog(log)}
                          className="p-1 hover:bg-slate-800 rounded text-cyan-400 hover:text-cyan-300"
                          title="Inspect raw RFC fields"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-900/60 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Showing up to 150 of {filteredLogs.length} filtered results</span>
          <span>Buffer capacity: 3,000 logs</span>
        </div>
      </div>
    </div>
  );
};

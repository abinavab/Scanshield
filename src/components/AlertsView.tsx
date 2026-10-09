import React, { useState } from 'react';
import {
  ShieldAlert,
  Flame,
  CheckCircle2,
  Clock,
  Ban,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Search,
  Filter,
  Eye,
  Terminal,
} from 'lucide-react';
import { SecurityAlert, AlertStatus, AlertSeverity, SecurityLog } from '../types/security.ts';

interface AlertsViewProps {
  alerts: SecurityAlert[];
  logs: SecurityLog[];
  onUpdateAlert: (id: string, update: { status?: AlertStatus; analystNotes?: string }) => Promise<void>;
  onBanIp: (ip: string, reason: string) => Promise<void>;
  onUnbanIp: (ip: string) => Promise<void>;
  bannedIps: string[];
  onSelectLog: (log: SecurityLog) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  logs,
  onUpdateAlert,
  onBanIp,
  onUnbanIp,
  bannedIps,
  onSelectLog,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);
  const [activeNotesId, setActiveNotesId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState<string>('');
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  const filteredAlerts = alerts.filter((a) => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.sourceIp.includes(q) ||
        a.targetedUsernames.some((u) => u.toLowerCase().includes(q)) ||
        a.mitreTechnique.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRuleId(id);
    setTimeout(() => setCopiedRuleId(null), 1500);
  };

  const handleOpenNotes = (alert: SecurityAlert) => {
    setActiveNotesId(alert.id);
    setNotesInput(alert.analystNotes || '');
  };

  const handleSaveNotes = async (alertId: string) => {
    await onUpdateAlert(alertId, { analystNotes: notesInput });
    setActiveNotesId(null);
  };

  const toggleLogsExpand = (alertId: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [alertId]: !prev[alertId],
    }));
  };

  const getSeverityBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'LOW':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  const getStatusBadge = (status: AlertStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse';
      case 'INVESTIGATING':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'MITIGATED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'FALSE_POSITIVE':
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Security Incident Triage &amp; Alert Management
          </h2>
          <p className="text-xs text-slate-400">
            Real-time rule matches, MITRE ATT&amp;CK correlations, automated bans, and analyst responses.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search alerts, IPs, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500 w-48 sm:w-60"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active (Needs Action)</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="MITIGATED">Mitigated</option>
            <option value="FALSE_POSITIVE">False Positive</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-12 text-center text-slate-500 space-y-3">
            <ShieldAlert className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium text-slate-300">No Incidents Matching Criteria</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No alerts found for current filters. You can simulate an SSH Brute-Force or Password Spraying attack to test the detection engine.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isBanned = bannedIps.includes(alert.sourceIp);
            const associatedLogs = logs.filter((l) => alert.associatedLogIds?.includes(l.id));

            return (
              <div
                key={alert.id}
                className="bg-slate-950 rounded-xl border border-slate-800/80 shadow-xl overflow-hidden hover:border-slate-700/80 transition-all"
              >
                {/* Alert Header */}
                <div className="p-4 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getSeverityBadge(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold border ${getStatusBadge(alert.status)}`}>
                      {alert.status}
                    </span>
                    <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Alert Body */}
                <div className="p-4 space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {alert.description}
                  </p>

                  {/* Telemetry and MITRE Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* Attacker Info */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <span className="text-[11px] text-slate-500 font-mono block">ATTACKER HOST</span>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{alert.geo?.flag || '🛡️'}</span>
                        <div>
                          <p className="font-mono font-bold text-amber-300">{alert.sourceIp}</p>
                          <p className="text-[11px] text-slate-400 truncate">{alert.geo?.country} ({alert.geo?.city})</p>
                        </div>
                      </div>
                    </div>

                    {/* Targeted Accounts */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <span className="text-[11px] text-slate-500 font-mono block">TARGETED USERNAMES</span>
                      <div className="flex flex-wrap gap-1">
                        {alert.targetedUsernames.map((user) => (
                          <span
                            key={user}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                              user === 'root' || user === 'admin'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {user}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Window & Attempts */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <span className="text-[11px] text-slate-500 font-mono block">SLIDING WINDOW STATS</span>
                      <p className="font-mono text-slate-200">
                        <strong className="text-rose-400 font-bold">{alert.attemptsCount}</strong> attempts in{' '}
                        <strong className="text-cyan-300">{alert.windowSeconds}s</strong>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Velocity: ~{((alert.attemptsCount / alert.windowSeconds) * 60).toFixed(1)} attempts/min
                      </p>
                    </div>

                    {/* MITRE ATT&CK Technique */}
                    <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/50 space-y-1.5">
                      <span className="text-[11px] text-indigo-400 font-mono block flex items-center justify-between">
                        <span>MITRE ATT&amp;CK</span>
                        <a
                          href={alert.mitreTechnique.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-0.5 text-cyan-400"
                        >
                          <span>{alert.mitreTechnique.id}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </span>
                      <p className="font-bold text-white text-[11px] truncate">
                        {alert.mitreTechnique.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Tactic: {alert.mitreTechnique.tactic}
                      </p>
                    </div>
                  </div>

                  {/* Firewall & Mitigation Section */}
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Ban className="w-4 h-4 text-purple-400" />
                      <span className="text-slate-300 font-medium">Linux Firewall Mitigation:</span>
                      <code className="px-2 py-1 bg-slate-950 rounded text-cyan-300 font-mono text-[11px] border border-slate-800">
                        sudo iptables -A INPUT -s {alert.sourceIp} -j DROP
                      </code>
                      <button
                        onClick={() =>
                          handleCopy(
                            alert.id,
                            `sudo iptables -A INPUT -s ${alert.sourceIp} -j DROP`
                          )
                        }
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy iptables command"
                      >
                        {copiedRuleId === alert.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {isBanned ? (
                        <button
                          onClick={() => onUnbanIp(alert.sourceIp)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-xs transition-colors"
                        >
                          Unban IP
                        </button>
                      ) : (
                        <button
                          onClick={() => onBanIp(alert.sourceIp, `Mitigated from Alert: ${alert.title}`)}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-semibold shadow transition-colors"
                        >
                          Ban IP in Firewall
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Associated Attack Log Evidence Dropdown */}
                  <div className="border border-slate-850 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleLogsExpand(alert.id)}
                      className="w-full px-3 py-2 bg-slate-900/60 hover:bg-slate-900 flex items-center justify-between text-xs text-slate-300 font-mono transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Attack Evidence Log Sequence ({associatedLogs.length} events logged)</span>
                      </span>
                      <span className="text-cyan-400 text-[11px]">
                        {expandedLogIds[alert.id] ? '▲ Collapse' : '▼ Expand Evidence'}
                      </span>
                    </button>

                    {expandedLogIds[alert.id] && (
                      <div className="p-3 bg-slate-950 font-mono text-[11px] space-y-1.5 max-h-48 overflow-y-auto border-t border-slate-850">
                        {associatedLogs.length === 0 ? (
                          <p className="text-slate-500 italic">No historical log entries retained in local buffer.</p>
                        ) : (
                          associatedLogs.map((log) => (
                            <div
                              key={log.id}
                              onClick={() => onSelectLog(log)}
                              className="p-1.5 rounded bg-slate-900/70 hover:bg-slate-850 cursor-pointer text-slate-300 flex items-center justify-between gap-2 border border-slate-800/40"
                            >
                              <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                              <span className="text-cyan-300 font-bold truncate flex-1">{log.message}</span>
                              <Eye className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Analyst Notes & Status Actions */}
                  <div className="pt-2 border-t border-slate-850 flex flex-wrap items-center justify-between gap-3 text-xs">
                    {/* Status Changer */}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono">Triage Status:</span>
                      {(['ACTIVE', 'INVESTIGATING', 'MITIGATED', 'FALSE_POSITIVE'] as AlertStatus[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => onUpdateAlert(alert.id, { status: st })}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                            alert.status === st
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    {/* Analyst Notes Button / Form */}
                    <div className="flex items-center gap-2">
                      {activeNotesId === alert.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Add forensic notes..."
                            value={notesInput}
                            onChange={(e) => setNotesInput(e.target.value)}
                            className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs w-56"
                          />
                          <button
                            onClick={() => handleSaveNotes(alert.id)}
                            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setActiveNotesId(null)}
                            className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenNotes(alert)}
                          className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 text-xs font-mono"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>
                            {alert.analystNotes ? `Notes: "${alert.analystNotes}"` : '+ Add Analyst Notes'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

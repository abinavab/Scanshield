import React, { useState } from 'react';
import {
  ShieldAlert,
  Flame,
  Activity,
  Lock,
  Unlock,
  AlertTriangle,
  Play,
  Globe,
  Users,
  Server,
  Ban,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { SystemStats, SecurityLog, SecurityAlert } from '../types/security.ts';
import { LiveLogStream } from './LiveLogStream.tsx';

interface SocDashboardProps {
  stats: SystemStats | null;
  logs: SecurityLog[];
  alerts: SecurityAlert[];
  onSelectLog: (log: SecurityLog) => void;
  onSelectAlert: (alert: SecurityAlert) => void;
  onQuickSimulate: (scenario: string) => void;
  onBanIp: (ip: string, reason: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const SocDashboard: React.FC<SocDashboardProps> = ({
  stats,
  logs,
  alerts,
  onSelectLog,
  onSelectAlert,
  onQuickSimulate,
  onBanIp,
  onNavigateTab,
}) => {
  const [simulating, setSimulating] = useState<string | null>(null);

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const failureRate =
    stats && stats.totalLogs > 0
      ? Math.round((stats.failedLogins / stats.totalLogs) * 100)
      : 0;

  const handleRunSim = async (scenario: string) => {
    setSimulating(scenario);
    try {
      await onQuickSimulate(scenario);
    } finally {
      setTimeout(() => setSimulating(null), 800);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Events Ingested */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Events Analyzed</span>
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/40">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {stats?.totalLogs.toLocaleString() || '0'}
            </span>
            <span className="text-xs text-cyan-400 font-mono flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              {stats?.eventsPerSecond || 0} EPS
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Real-time syslog rate from Kali agent &amp; probes
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
        </div>

        {/* Card 2: Active Brute-Force Threats */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Threats</span>
            <div className="p-2 rounded-lg bg-rose-950 text-rose-400 border border-rose-800/40">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {activeAlerts.length}
            </span>
            {activeAlerts.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold animate-pulse">
                ACTION REQUIRED
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {stats?.failedLogins || 0} failed login attempts tracked
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
        </div>

        {/* Card 3: Auth Failure Ratio */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Auth Failure Ratio</span>
            <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-800/40">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">{failureRate}%</span>
            <span className="text-xs text-slate-400 font-mono">
              ({stats?.successfulLogins || 0} OK / {stats?.failedLogins || 0} FAIL)
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(failureRate, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Elevated failure indicates active credential guessing
          </p>
        </div>

        {/* Card 4: Firewall Banned IPs */}
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Firewall Drop List (Fail2ban)</span>
            <div className="p-2 rounded-lg bg-purple-950 text-purple-400 border border-purple-800/40">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-300">
              {stats?.bannedIpsCount || 0}
            </span>
            <span className="text-xs text-purple-400 font-mono">IPs Blocked</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Automated iptables &amp; ufw mitigation rules active
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
        </div>
      </div>

      {/* Quick Attack Simulator Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-4 rounded-xl border border-indigo-900/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Play className="w-4 h-4 fill-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Kali Linux Attack Demonstrator &amp; SIEM Validation
            </h3>
            <p className="text-xs text-slate-400">
              Trigger instant simulated attack payloads to test the detection engine and live alert triggers.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => handleRunSim('SSH_HYDRA_BRUTEFORCE')}
            disabled={simulating !== null}
            className="flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-all flex items-center justify-center gap-1.5"
          >
            <span>{simulating === 'SSH_HYDRA_BRUTEFORCE' ? 'Injecting...' : 'Hydra SSH Brute-Force (T1110.001)'}</span>
          </button>

          <button
            onClick={() => handleRunSim('PASSWORD_SPRAYING')}
            disabled={simulating !== null}
            className="flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/60 transition-all flex items-center justify-center gap-1.5"
          >
            <span>{simulating === 'PASSWORD_SPRAYING' ? 'Injecting...' : 'Password Spraying (T1110.003)'}</span>
          </button>

          <button
            onClick={() => handleRunSim('CREDENTIAL_COMPROMISE')}
            disabled={simulating !== null}
            className="flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/60 transition-all flex items-center justify-center gap-1.5"
          >
            <span>{simulating === 'CREDENTIAL_COMPROMISE' ? 'Injecting...' : 'Credential Takeover (T1078)'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Live Terminal & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Log Stream Terminal */}
        <div className="lg:col-span-2 space-y-4">
          <LiveLogStream logs={logs} onSelectLog={onSelectLog} />
        </div>

        {/* Right 1 Col: Active Alerts & Threats Triage Snapshot */}
        <div className="space-y-4 flex flex-col">
          <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-4 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-slate-100">Active Incident Triage</h3>
              </div>
              <button
                onClick={() => onNavigateTab('alerts')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
              >
                <span>View All ({alerts.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5 flex-1 overflow-y-auto max-h-[440px] pr-1">
              {activeAlerts.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-300">No Active Threats Detected</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    All authentication streams within baseline limits. Run a Kali attack simulation to test.
                  </p>
                </div>
              ) : (
                activeAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => onSelectAlert(alert)}
                    className="p-3 rounded-lg bg-slate-900/90 border border-rose-900/40 hover:border-rose-700/80 transition-all cursor-pointer group shadow-sm hover:shadow-rose-950/20"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {alert.severity}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 group-hover:text-rose-300 transition-colors line-clamp-1">
                      {alert.title}
                    </h4>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span className="text-amber-300 flex items-center gap-1">
                        <span>{alert.geo?.flag || '🛡️'}</span>
                        <span>{alert.sourceIp}</span>
                      </span>
                      <span className="text-rose-400 font-semibold">
                        {alert.attemptsCount} attempts
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                      <span className="text-cyan-400 font-mono">{alert.mitreTechnique.id}</span>
                      <span>•</span>
                      <span className="truncate">{alert.mitreTechnique.name}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Insights: Attacker Origin Intelligence & Targeted Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Col 1: Top Attacking Source IPs */}
        <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100">Top Threat Origin IPs</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">Failed Attemps</span>
          </div>

          <div className="mt-3 space-y-2">
            {stats?.topAttackingIps && stats.topAttackingIps.length > 0 ? (
              stats.topAttackingIps.map((item, index) => (
                <div
                  key={item.ip}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-850 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono w-4">#{index + 1}</span>
                    <span className="font-mono text-amber-300 font-semibold">{item.ip}</span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[100px]">
                      {item.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-rose-400">{item.count}</span>
                    <button
                      onClick={() => onBanIp(item.ip, 'Banned from Top Threats list')}
                      className="px-2 py-0.5 rounded text-[10px] bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-mono"
                      title="Add to firewall drop list"
                    >
                      Ban
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No attacking IPs logged yet.</p>
            )}
          </div>
        </div>

        {/* Col 2: Top Targeted Accounts */}
        <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">Targeted Accounts</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">Attempts</span>
          </div>

          <div className="mt-3 space-y-2">
            {stats?.topTargetedUsers && stats.topTargetedUsers.length > 0 ? (
              stats.topTargetedUsers.map((item, index) => (
                <div
                  key={item.username}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-850 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono w-4">#{index + 1}</span>
                    <span
                      className={`font-mono font-bold ${
                        item.username === 'root' || item.username === 'admin'
                          ? 'text-rose-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {item.username}
                    </span>
                    {item.username === 'root' && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                        SUPERUSER
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-amber-400">{item.count} attacks</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No targeted users logged yet.</p>
            )}
          </div>
        </div>

        {/* Col 3: Kali Agent Fleet Telemetry */}
        <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Kali Linux Shipper Agent</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 font-bold">
                ONLINE
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Agent Host:</span>
                <span className="font-mono text-slate-200 font-semibold">kali-rolling-soc</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Log Source:</span>
                <span className="font-mono text-cyan-300">/var/log/auth.log</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Transport Protocol:</span>
                <span className="font-mono text-slate-200">HTTPS REST JSON Batch</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Detection Engine:</span>
                <span className="font-mono text-emerald-400">Sliding Window (Active)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => onNavigateTab('kali')}
              className="w-full py-2 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Connect External Kali Linux VM</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

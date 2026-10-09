import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { SocDashboard } from './components/SocDashboard.tsx';
import { AlertsView } from './components/AlertsView.tsx';
import { ForensicsView } from './components/ForensicsView.tsx';
import { KaliGuideView } from './components/KaliGuideView.tsx';
import { RulesEngineView } from './components/RulesEngineView.tsx';
import { AcademicVivaView } from './components/AcademicVivaView.tsx';
import { AttackSimulatorModal } from './components/AttackSimulatorModal.tsx';
import { LogDetailModal } from './components/LogDetailModal.tsx';
import {
  SecurityLog,
  SecurityAlert,
  DetectionRule,
  BannedIp,
  AgentNode,
  SystemStats,
  AlertStatus,
} from './types/security.ts';
import {
  fetchSystemStats,
  fetchLogs,
  fetchAlerts,
  fetchRules,
  fetchBannedIps,
  fetchAgents,
  updateAlert,
  updateRules,
  banIpApi,
  unbanIpApi,
  triggerSimulation,
  resetSystemState,
  ingestLogsApi,
} from './utils/api.ts';
import { playAlertChime } from './utils/audioAlert.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [bannedIps, setBannedIps] = useState<BannedIp[]>([]);
  const [agents, setAgents] = useState<AgentNode[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);

  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const soundEnabledRef = useRef<boolean>(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
  const [isSimulateOpen, setIsSimulateOpen] = useState<boolean>(false);

  // Initial load
  const loadInitialData = useCallback(async () => {
    try {
      const [statsRes, logsRes, alertsRes, rulesRes, bansRes, agentsRes] = await Promise.all([
        fetchSystemStats(),
        fetchLogs({ limit: 150 }),
        fetchAlerts(),
        fetchRules(),
        fetchBannedIps(),
        fetchAgents(),
      ]);

      setStats(statsRes);
      setLogs(logsRes.logs);
      setAlerts(alertsRes.alerts);
      setRules(rulesRes.rules);
      setBannedIps(bansRes.bannedIps);
      setAgents(agentsRes.agents);
    } catch (err) {
      console.warn('Initial data load warning:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Setup SSE stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/stream');

        eventSource.onopen = () => {
          setSseConnected(true);
        };

        eventSource.addEventListener('handshake', () => {
          setSseConnected(true);
        });

        eventSource.addEventListener('new_log', (e: MessageEvent) => {
          try {
            const newLog: SecurityLog = JSON.parse(e.data);
            setLogs((prev) => [newLog, ...prev.slice(0, 1500)]);

            // Update stats incrementally
            setStats((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                totalLogs: prev.totalLogs + 1,
                failedLogins:
                  newLog.eventType === 'FAILED_PASSWORD' || newLog.eventType === 'INVALID_USER'
                    ? prev.failedLogins + 1
                    : prev.failedLogins,
                successfulLogins:
                  newLog.eventType === 'ACCEPTED_PASSWORD' ? prev.successfulLogins + 1 : prev.successfulLogins,
              };
            });
          } catch (err) {
            console.error('Failed to parse new_log:', err);
          }
        });

        eventSource.addEventListener('new_alert', (e: MessageEvent) => {
          try {
            const newAlert: SecurityAlert = JSON.parse(e.data);
            setAlerts((prev) => [newAlert, ...prev]);

            if (soundEnabledRef.current) {
              playAlertChime(newAlert.severity);
            }

            // Refresh stats to recalculate threat matrix
            fetchSystemStats().then(setStats).catch(() => {});
          } catch (err) {
            console.error('Failed to parse new_alert:', err);
          }
        });

        eventSource.addEventListener('ip_banned', (e: MessageEvent) => {
          try {
            const bannedObj: BannedIp = JSON.parse(e.data);
            setBannedIps((prev) => [bannedObj, ...prev.filter((b) => b.ip !== bannedObj.ip)]);
            fetchSystemStats().then(setStats).catch(() => {});
          } catch (err) {
            console.error('Failed to parse ip_banned:', err);
          }
        });

        eventSource.addEventListener('banned_ips_updated', (e: MessageEvent) => {
          try {
            const list: BannedIp[] = JSON.parse(e.data);
            setBannedIps(list);
          } catch (err) {
            console.error('Failed to parse banned_ips_updated:', err);
          }
        });

        eventSource.addEventListener('alert_updated', (e: MessageEvent) => {
          try {
            const updatedAlert: SecurityAlert = JSON.parse(e.data);
            setAlerts((prev) => prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a)));
            fetchSystemStats().then(setStats).catch(() => {});
          } catch (err) {
            console.error('Failed to parse alert_updated:', err);
          }
        });

        eventSource.addEventListener('rules_updated', (e: MessageEvent) => {
          try {
            const updatedRules: DetectionRule[] = JSON.parse(e.data);
            setRules(updatedRules);
          } catch (err) {
            console.error('Failed to parse rules_updated:', err);
          }
        });

        eventSource.addEventListener('agent_heartbeat', (e: MessageEvent) => {
          try {
            const agent: AgentNode = JSON.parse(e.data);
            setAgents((prev) => {
              const existingIdx = prev.findIndex((a) => a.id === agent.id);
              if (existingIdx >= 0) {
                const copy = [...prev];
                copy[existingIdx] = agent;
                return copy;
              }
              return [agent, ...prev];
            });
          } catch (err) {
            console.error('Failed to parse agent_heartbeat:', err);
          }
        });

        eventSource.addEventListener('state_reset', () => {
          loadInitialData();
        });

        eventSource.onerror = () => {
          setSseConnected(false);
          eventSource?.close();
          reconnectTimer = setTimeout(connectSSE, 4000);
        };
      } catch {
        setSseConnected(false);
        reconnectTimer = setTimeout(connectSSE, 4000);
      }
    };

    connectSSE();

    return () => {
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [loadInitialData]);

  // Periodic stats poll (fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSystemStats().then(setStats).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Action handlers
  const handleQuickSimulate = async (scenario: string) => {
    await triggerSimulation(scenario);
    await loadInitialData();
  };

  const handleCustomSimulate = async (
    scenario: string,
    options?: { targetUser?: string; attackerIp?: string; count?: number }
  ) => {
    await triggerSimulation(scenario, options);
    await loadInitialData();
  };

  const handleIngestManualRaw = async (raw: string) => {
    await ingestLogsApi(raw);
    await loadInitialData();
  };

  const handleBanIp = async (ip: string, reason: string, durationMinutes = 30) => {
    const res = await banIpApi(ip, reason, durationMinutes);
    setBannedIps(res.bannedIps);
    await loadInitialData();
  };

  const handleUnbanIp = async (ip: string) => {
    const res = await unbanIpApi(ip);
    setBannedIps(res.bannedIps);
    await loadInitialData();
  };

  const handleUpdateAlert = async (
    id: string,
    update: { status?: AlertStatus; analystNotes?: string }
  ) => {
    const res = await updateAlert(id, update);
    setAlerts((prev) => prev.map((a) => (a.id === id ? res.alert : a)));
  };

  const handleSaveRules = async (updatedRules: DetectionRule[]) => {
    const res = await updateRules(updatedRules);
    setRules(res.rules);
  };

  const handleResetState = async () => {
    if (window.confirm('Reset all security logs, alerts, and banned IPs to the baseline demonstration dataset?')) {
      await resetSystemState();
      await loadInitialData();
    }
  };

  const isSelectedLogBanned = selectedLog
    ? bannedIps.some((b) => b.ip === selectedLog.sourceIp)
    : false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Navigation Header */}
      <Header
        stats={stats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sseConnected={sseConnected}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onOpenSimulate={() => setIsSimulateOpen(true)}
        onResetState={handleResetState}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'dashboard' && (
          <SocDashboard
            stats={stats}
            logs={logs}
            alerts={alerts}
            onSelectLog={(log) => setSelectedLog(log)}
            onSelectAlert={() => setActiveTab('alerts')}
            onQuickSimulate={handleQuickSimulate}
            onBanIp={handleBanIp}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsView
            alerts={alerts}
            logs={logs}
            onUpdateAlert={handleUpdateAlert}
            onBanIp={handleBanIp}
            onUnbanIp={handleUnbanIp}
            bannedIps={bannedIps.map((b) => b.ip)}
            onSelectLog={(log) => setSelectedLog(log)}
          />
        )}

        {activeTab === 'forensics' && (
          <ForensicsView
            logs={logs}
            onSelectLog={(log) => setSelectedLog(log)}
          />
        )}

        {activeTab === 'kali' && (
          <KaliGuideView
            agents={agents}
            onTriggerSim={handleQuickSimulate}
          />
        )}

        {activeTab === 'rules' && (
          <RulesEngineView
            rules={rules}
            bannedIps={bannedIps}
            onSaveRules={handleSaveRules}
            onBanIp={handleBanIp}
            onUnbanIp={handleUnbanIp}
          />
        )}

        {activeTab === 'viva' && (
          <AcademicVivaView
            stats={stats}
            alerts={alerts}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-4 px-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400">AEGIS-SOC</span>
          <span>•</span>
          <span>Real-Time Security Log Monitoring &amp; Brute-Force Detection System</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span>Level 5 Capstone Defense</span>
          <span>•</span>
          <span>OpenSSH / Linux PAM Ingestion</span>
          <span>•</span>
          <span className="text-cyan-400">MITRE ATT&amp;CK T1110</span>
        </div>
      </footer>

      {/* Attack Simulator Modal */}
      <AttackSimulatorModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onRunSimulation={handleCustomSimulate}
        onIngestManualRaw={handleIngestManualRaw}
      />

      {/* Forensic Log Detail Modal */}
      <LogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        onBanIp={handleBanIp}
        isBanned={isSelectedLogBanned}
      />
    </div>
  );
}

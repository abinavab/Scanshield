import React, { useState } from 'react';
import {
  X,
  Play,
  Flame,
  ShieldAlert,
  Terminal,
  Cpu,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface AttackSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunSimulation: (scenario: string, options?: { targetUser?: string; attackerIp?: string; count?: number }) => Promise<void>;
  onIngestManualRaw: (raw: string) => Promise<void>;
}

export const AttackSimulatorModal: React.FC<AttackSimulatorModalProps> = ({
  isOpen,
  onClose,
  onRunSimulation,
  onIngestManualRaw,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [selectedScenario, setSelectedScenario] = useState('SSH_HYDRA_BRUTEFORCE');
  const [targetUser, setTargetUser] = useState('root');
  const [attackerIp, setAttackerIp] = useState('194.26.29.112');
  const [count, setCount] = useState(6);
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  // Custom raw log injection
  const [customRawLog, setCustomRawLog] = useState(
    'Oct 08 21:30:15 kali sshd[30192]: Failed password for invalid user admin from 185.220.101.5 port 54122 ssh2'
  );

  if (!isOpen) return null;

  const handleLaunch = async () => {
    setLoading(true);
    setResultMsg(null);
    try {
      if (activeTab === 'presets') {
        await onRunSimulation(selectedScenario, { targetUser, attackerIp, count });
        setResultMsg(`Successfully executed simulation: ${selectedScenario}`);
      } else {
        await onIngestManualRaw(customRawLog);
        setResultMsg('Raw log event ingested and evaluated by SIEM engine!');
      }
      setTimeout(() => {
        setResultMsg(null);
        onClose();
      }, 1200);
    } catch {
      setResultMsg('Error executing simulation');
    } finally {
      setLoading(false);
    }
  };

  const presetScenarios = [
    {
      id: 'SSH_HYDRA_BRUTEFORCE',
      title: 'Hydra SSH Dictionary Attack (T1110.001)',
      desc: 'Simulates 6+ rapid SSH auth attempts against root using a common password dictionary.',
      badge: 'CRITICAL',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      defaultUser: 'root',
      defaultIp: '194.26.29.112',
    },
    {
      id: 'PASSWORD_SPRAYING',
      title: 'Horizontal Password Spraying Campaign (T1110.003)',
      desc: 'Simulates a single IP attempting the same credential across 6 different usernames.',
      badge: 'HIGH',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      defaultUser: 'admin',
      defaultIp: '45.148.10.88',
    },
    {
      id: 'CREDENTIAL_COMPROMISE',
      title: 'Brute-Force Followed by Successful Login (T1078)',
      desc: 'Simulates 3 failed password attempts followed by a successful login from the same IP.',
      badge: 'CRITICAL',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      defaultUser: 'deploy',
      defaultIp: '185.191.171.12',
    },
    {
      id: 'SUDO_PRIVILEGE_ESCALATION',
      title: 'Local Sudo Privilege Escalation Abuse (T1548.003)',
      desc: 'Simulates 3 incorrect sudo password attempts from an unprivileged local terminal.',
      badge: 'HIGH',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      defaultUser: 'kali',
      defaultIp: '192.168.1.105',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-400" />
            <h3 className="text-sm font-bold text-white">Kali Linux Attack Simulator</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-4 pt-3 flex items-center gap-2 border-b border-slate-850 bg-slate-950/60 text-xs">
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-2 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'presets'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pre-Built Attack Scenarios
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-2 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'custom'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Syslog Injector
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'presets' ? (
            <>
              <div className="space-y-2">
                <label className="text-slate-400 font-medium block">Select Attack Pattern:</label>
                <div className="space-y-2">
                  {presetScenarios.map((sc) => (
                    <div
                      key={sc.id}
                      onClick={() => {
                        setSelectedScenario(sc.id);
                        setTargetUser(sc.defaultUser);
                        setAttackerIp(sc.defaultIp);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedScenario === sc.id
                          ? 'bg-slate-900 border-cyan-500/80 shadow-md shadow-cyan-950/40'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-100">{sc.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${sc.badgeColor}`}>
                          {sc.badge}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{sc.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">Target Username:</label>
                  <input
                    type="text"
                    value={targetUser}
                    onChange={(e) => setTargetUser(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">Attacker Source IP:</label>
                  <input
                    type="text"
                    value={attackerIp}
                    onChange={(e) => setAttackerIp(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {selectedScenario === 'SSH_HYDRA_BRUTEFORCE' && (
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">
                    Attempt Count: <strong className="text-cyan-400">{count} attempts</strong> (Threshold is 5)
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <label className="text-slate-400 font-medium block">
                Paste Raw Syslog / Auth Log Line (RFC 3164 / OpenSSH):
              </label>
              <textarea
                rows={4}
                value={customRawLog}
                onChange={(e) => setCustomRawLog(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:border-cyan-500 focus:outline-none leading-relaxed"
                placeholder="Failed password for root from 192.168.1.100 port 55412 ssh2"
              />
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-850 text-slate-400 text-[11px] space-y-1">
                <span className="font-bold text-slate-300 block">Example Supported Formats:</span>
                <p>• <code>Failed password for invalid user admin from 1.2.3.4 port 48212 ssh2</code></p>
                <p>• <code>Accepted password for ubuntu from 192.168.1.50 port 52114 ssh2</code></p>
                <p>• <code>attacker : 3 incorrect password attempts ; TTY=pts/1 ; PWD=/ ; USER=root</code></p>
              </div>
            </div>
          )}

          {resultMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{resultMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950 flex items-center gap-1.5 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{loading ? 'Launching Attack...' : 'Launch Attack & Test SIEM'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

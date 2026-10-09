import React, { useState } from 'react';
import {
  Shield,
  Sliders,
  Ban,
  Clock,
  Trash2,
  Plus,
  Save,
  Check,
  Copy,
  ExternalLink,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import { DetectionRule, BannedIp, AlertSeverity } from '../types/security.ts';

interface RulesEngineViewProps {
  rules: DetectionRule[];
  bannedIps: BannedIp[];
  onSaveRules: (updatedRules: DetectionRule[]) => Promise<void>;
  onBanIp: (ip: string, reason: string, durationMinutes?: number) => Promise<void>;
  onUnbanIp: (ip: string) => Promise<void>;
}

export const RulesEngineView: React.FC<RulesEngineViewProps> = ({
  rules,
  bannedIps,
  onSaveRules,
  onBanIp,
  onUnbanIp,
}) => {
  const [localRules, setLocalRules] = useState<DetectionRule[]>(rules);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedRule, setCopiedRule] = useState<string | null>(null);

  // Manual Ban Modal/Form state
  const [showManualBan, setShowManualBan] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [manualDuration, setManualDuration] = useState('30');

  const handleRuleChange = (
    index: number,
    field: keyof DetectionRule,
    value: unknown
  ) => {
    const updated = [...localRules];
    updated[index] = { ...updated[index], [field]: value };
    setLocalRules(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveRules(localRules);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRule(key);
    setTimeout(() => setCopiedRule(null), 1500);
  };

  const handleAddManualBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp) return;
    await onBanIp(manualIp.trim(), manualReason || 'Manual ban by SOC admin', parseInt(manualDuration, 10));
    setManualIp('');
    setManualReason('');
    setShowManualBan(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            Detection Rule Engine &amp; Firewall Mitigation Policies
          </h2>
          <p className="text-xs text-slate-400">
            Configure correlation thresholds, sliding time-windows, automated Fail2ban dropping, and view blocked hosts.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-cyan-950"
        >
          {saveSuccess ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved Policy!' : 'Apply & Save Rules'}</span>
        </button>
      </div>

      {/* Rules Config List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
          Configured Correlation Rules (SIEM Engine)
        </h3>

        {localRules.map((rule, idx) => (
          <div
            key={rule.id}
            className={`p-4 rounded-xl border transition-all ${
              rule.enabled
                ? 'bg-slate-950 border-slate-800/80'
                : 'bg-slate-950/50 border-slate-900 opacity-60'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-850">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`enable-${rule.id}`}
                  checked={rule.enabled}
                  onChange={(e) => handleRuleChange(idx, 'enabled', e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <div>
                  <label htmlFor={`enable-${rule.id}`} className="text-sm font-bold text-white cursor-pointer flex items-center gap-2">
                    {rule.name}
                    <span className="text-xs text-cyan-400 font-mono px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800/40">
                      {rule.technique}
                    </span>
                  </label>
                  <p className="text-xs text-slate-400 mt-0.5">{rule.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Severity:</span>
                <select
                  value={rule.severity}
                  onChange={(e) => handleRuleChange(idx, 'severity', e.target.value as AlertSeverity)}
                  className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-200"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            {/* Threshold Sliders */}
            <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              {/* Threshold */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Threshold Limit:</span>
                  <span className="text-white font-bold">{rule.threshold} failed events</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={rule.threshold}
                  onChange={(e) => handleRuleChange(idx, 'threshold', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Time Window */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Time Window:</span>
                  <span className="text-white font-bold">{rule.windowSeconds} seconds</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="600"
                  step="15"
                  value={rule.windowSeconds}
                  onChange={(e) => handleRuleChange(idx, 'windowSeconds', parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Auto Ban Policy */}
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-850">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`ban-${rule.id}`}
                    checked={rule.autoBan}
                    onChange={(e) => handleRuleChange(idx, 'autoBan', e.target.checked)}
                    className="w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <label htmlFor={`ban-${rule.id}`} className="text-xs text-slate-300 cursor-pointer">
                    Auto-Ban IP (Fail2ban)
                  </label>
                </div>
                {rule.autoBan && (
                  <span className="text-[11px] text-amber-400">
                    {rule.autoBanDurationMinutes} min ban
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Firewall Banned IPs Table */}
      <div className="bg-slate-950 rounded-xl border border-slate-800/80 shadow-xl overflow-hidden space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-850">
          <div className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Active Firewall Banned IPs (Drop List)</h3>
              <p className="text-xs text-slate-400">
                Host IPs automatically blocked due to brute-force rule triggers or manual analyst enforcement.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowManualBan(true)}
            className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manually Ban IP</span>
          </button>
        </div>

        {/* Modal: Manual Ban */}
        {showManualBan && (
          <form
            onSubmit={handleAddManualBan}
            className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3 text-xs"
          >
            <h4 className="font-bold text-white font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Add Manual Firewall IP Drop Rule
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Target IP Address:</label>
                <input
                  type="text"
                  placeholder="e.g. 198.51.100.55"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Reason / Case #:</label>
                <input
                  type="text"
                  placeholder="e.g. Malicious scanning detected"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Duration (minutes):</label>
                <select
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">1 Hour</option>
                  <option value="1440">24 Hours</option>
                  <option value="0">Permanent</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualBan(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-semibold"
              >
                Enforce Ban
              </button>
            </div>
          </form>
        )}

        {/* Banned Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-850">
              <tr>
                <th className="p-3">ATTACKER IP</th>
                <th className="p-3">LOCATION</th>
                <th className="p-3">BAN REASON</th>
                <th className="p-3">EXPIRES IN</th>
                <th className="p-3">LINUX IPTABLES COMMAND</th>
                <th className="p-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {bannedIps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No active IP bans in firewall drop list.
                  </td>
                </tr>
              ) : (
                bannedIps.map((banned) => {
                  const now = Date.now();
                  const expireMs = banned.expiresAt ? new Date(banned.expiresAt).getTime() : null;
                  const remainingMinutes = expireMs ? Math.max(0, Math.round((expireMs - now) / 60000)) : null;

                  return (
                    <tr key={banned.ip} className="hover:bg-slate-900/50">
                      <td className="p-3 text-amber-300 font-bold whitespace-nowrap">
                        {banned.ip}
                      </td>
                      <td className="p-3 text-slate-300 whitespace-nowrap">
                        {banned.geo?.flag || '🛡️'} {banned.geo?.country || 'Unknown'}
                      </td>
                      <td className="p-3 text-slate-400 font-sans max-w-xs truncate">
                        {banned.reason}
                      </td>
                      <td className="p-3 whitespace-nowrap text-cyan-300">
                        {remainingMinutes !== null ? `${remainingMinutes} mins` : 'Permanent'}
                      </td>
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <code className="text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {banned.iptablesRule}
                          </code>
                          <button
                            onClick={() => handleCopy(banned.ip, banned.iptablesRule)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                            title="Copy iptables command"
                          >
                            {copiedRule === banned.ip ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onUnbanIp(banned.ip)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition-colors"
                        >
                          Unban IP
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

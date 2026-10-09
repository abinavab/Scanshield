import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Terminal,
  Volume2,
  VolumeX,
  Play,
  RefreshCw,
  BookOpen,
  Cpu,
  Flame,
} from 'lucide-react';
import { SystemStats } from '../types/security.ts';

interface HeaderProps {
  stats: SystemStats | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sseConnected: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  onOpenSimulate: () => void;
  onResetState: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  activeTab,
  setActiveTab,
  sseConnected,
  soundEnabled,
  setSoundEnabled,
  onOpenSimulate,
  onResetState,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0] + ' UTC' + (now.getTimezoneOffset() <= 0 ? '+' : '-') + Math.abs(now.getTimezoneOffset() / 60));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const threatColor = {
    LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    GUARDED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ELEVATED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    CRITICAL: 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse',
  }[stats?.threatLevel || 'LOW'];

  return (
    <header className="bg-slate-950/95 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md">
      {/* Top Meta Bar */}
      <div className="px-4 py-2 border-b border-slate-900 flex flex-wrap items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                sseConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500 animate-ping'
              }`}
            />
            <span className={sseConnected ? 'text-emerald-400 font-medium' : 'text-rose-400'}>
              {sseConnected ? 'LIVE STREAM ACTIVE (SSE)' : 'DISCONNECTED / RECONNECTING'}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <span className="hidden sm:inline bg-slate-900 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900/50 font-mono text-[11px]">
            Academic Level 5 Capstone
          </span>
          <span className="hidden md:inline text-slate-500 font-mono">
            Kali Agent Fleet: <span className="text-slate-300 font-bold">{stats?.activeAgentsCount ?? 1} Online</span>
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">THREAT DEFCON:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${threatColor}`}>
              {stats?.threatLevel || 'GUARDED'}
            </span>
          </div>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">{currentTime}</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide font-sans flex items-center gap-2">
                AEGIS-SOC <span className="text-cyan-400 font-mono text-xs font-normal">v2.4</span>
              </h1>
              {stats?.activeAlerts && stats.activeAlerts > 0 ? (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full animate-pulse">
                  <Flame className="w-3 h-3 text-rose-400" />
                  {stats.activeAlerts} ACTIVE THREATS
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Real-Time Security Log Monitoring &amp; Brute-Force Detection System
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-slate-800 text-cyan-300 border-cyan-800/60 hover:bg-slate-750'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title={soundEnabled ? 'Mute Alert Chimes' : 'Enable Alert Audio Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{soundEnabled ? 'Audio Chime ON' : 'Muted'}</span>
          </button>

          {/* Quick Simulate Attack Modal Trigger */}
          <button
            onClick={onOpenSimulate}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/40 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Simulate Kali Attack</span>
          </button>

          {/* Reset Baseline */}
          <button
            onClick={onResetState}
            className="p-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-1 transition-colors"
            title="Reset to clean sample baseline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Reset Lab</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-4 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-slate-900 bg-slate-950/60">
        {[
          { id: 'dashboard', label: 'SOC Command Center', icon: Cpu },
          {
            id: 'alerts',
            label: 'Incidents & Alerts',
            icon: ShieldAlert,
            badge: stats?.activeAlerts || 0,
            badgeColor: 'bg-rose-500 text-white',
          },
          { id: 'forensics', label: 'Log Forensics & Search', icon: Terminal },
          { id: 'kali', label: 'Kali Linux Integration & Agent', icon: Terminal, highlight: true },
          {
            id: 'rules',
            label: 'Detection Rules & Firewall',
            icon: Shield,
            badge: stats?.bannedIpsCount || 0,
            badgeColor: 'bg-amber-500 text-slate-950 font-bold',
          },
          { id: 'viva', label: 'Level 5 Academic Defense & Report', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 ? (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${tab.badgeColor}`}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </header>
  );
};

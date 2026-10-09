import React, { useState } from 'react';
import {
  Terminal,
  Server,
  Play,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Download,
  AlertCircle,
  HelpCircle,
  Code,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { AgentNode } from '../types/security.ts';

interface KaliGuideViewProps {
  agents: AgentNode[];
  onTriggerSim: (scenario: string) => void;
}

export const KaliGuideView: React.FC<KaliGuideViewProps> = ({ agents, onTriggerSim }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://your-soc-app.run.app';

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const pythonShipperCode = `#!/usr/bin/env python3
"""
========================================================================
Kali Linux Real-Time Security Log Shipper Agent
Level 5 Cybersecurity Academic Capstone
Tails /var/log/auth.log and streams authentication logs to the Cloud SIEM
========================================================================
"""

import time
import os
import sys
import json
import socket
import platform
import urllib.request
import urllib.error

# Ingestion configuration
SIEM_BASE_URL = "${currentHost}"
INGEST_URL = f"{SIEM_BASE_URL}/api/logs/ingest"
HEARTBEAT_URL = f"{SIEM_BASE_URL}/api/agent/heartbeat"
AUTH_LOG_PATH = "/var/log/auth.log"
AGENT_ID = f"kali-{socket.gethostname()}"

print("="*65)
print(f"[*] Starting Security Log Shipper Agent [{AGENT_ID}]")
print(f"[*] Target SIEM Ingestion Server: {INGEST_URL}")
print(f"[*] Monitoring Log Source: {AUTH_LOG_PATH}")
print("="*65)

def send_heartbeat():
    """Sends host telemetry and health ping to SIEM"""
    try:
        payload = {
            "id": AGENT_ID,
            "hostname": socket.gethostname(),
            "ip": socket.gethostbyname(socket.gethostname()) if not socket.gethostbyname(socket.gethostname()).startswith("127.") else "192.168.1.105",
            "os": platform.platform(),
            "kernel": platform.release(),
            "version": "1.2.0"
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(HEARTBEAT_URL, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as res:
            pass
    except Exception as e:
        pass

def send_batch(log_lines):
    """Transmits batched log lines to SIEM REST endpoint"""
    if not log_lines:
        return
    try:
        data = json.dumps(log_lines).encode("utf-8")
        req = urllib.request.Request(INGEST_URL, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as res:
            print(f"[+] Transmitted {len(log_lines)} logs -> HTTP {res.status} OK")
    except Exception as e:
        print(f"[-] Transmission error: {e}")

def tail_auth_log():
    """Continuously follows /var/log/auth.log similar to tail -f"""
    if not os.path.exists(AUTH_LOG_PATH):
        print(f"[-] ERROR: {AUTH_LOG_PATH} not found!")
        print("[-] Note: On newer Debian/Ubuntu, enable rsyslog: 'sudo apt install rsyslog'")
        sys.exit(1)

    print("[+] Shipper active! Waiting for authentication events...")
    with open(AUTH_LOG_PATH, "r") as f:
        # Seek to the end of file so we only ship new events
        f.seek(0, os.SEEK_END)
        batch = []
        last_heartbeat = time.time()
        
        while True:
            line = f.readline()
            if line:
                cleaned = line.strip()
                if cleaned:
                    print(f"[LOG] {cleaned}")
                    batch.append(cleaned)
                    if len(batch) >= 5:
                        send_batch(batch)
                        batch = []
            else:
                if batch:
                    send_batch(batch)
                    batch = []
                now = time.time()
                if now - last_heartbeat > 30:
                    send_heartbeat()
                    last_heartbeat = now
                time.sleep(0.3)

if __name__ == "__main__":
    send_heartbeat()
    try:
        tail_auth_log()
    except KeyboardInterrupt:
        print("\\n[*] Shipper stopped by user.")
`;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 p-6 rounded-xl border border-indigo-900/40 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-[11px] font-bold">
              KALI LINUX LAB GUIDE
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono text-[11px]">
              Zero-to-Hero Level 5 Walkthrough
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Connecting Real Kali Linux Machines &amp; Launching Attacks
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Learn step-by-step how auth logs are produced on Linux, shipped securely across the network to our cloud SIEM, normalized via regex parsers, and evaluated by the sliding-window detection engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 font-mono block">CONNECTED AGENTS</span>
            <span className="text-lg font-bold font-mono text-emerald-400">{agents.length || 1} Active</span>
          </div>
        </div>
      </div>

      {/* Step Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {[
          { num: 1, title: '1. Architecture & Data Flow' },
          { num: 2, title: '2. Deploy Shipper Agent' },
          { num: 3, title: '3. Real Kali Attack Commands' },
          { num: 4, title: '4. Instant cURL Test' },
          { num: 5, title: '5. Troubleshooting & FAQ' },
        ].map((step) => (
          <button
            key={step.num}
            onClick={() => setActiveStep(step.num)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
              activeStep === step.num
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            {step.title}
          </button>
        ))}
      </div>

      {/* Step Content */}
      {activeStep === 1 && (
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" />
            End-to-End System Architecture: From Kali Terminal to SOC Alert
          </h3>

          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-3 leading-relaxed">
            <p className="text-cyan-400 font-bold">// REAL-TIME DATA TRANSMISSION PIPELINE</p>
            <div className="p-3 bg-slate-950 rounded border border-slate-850 overflow-x-auto text-[11px]">
              <pre className="text-slate-300">
{`+---------------------------------------+
|        KALI LINUX / UBUNTU            |
|  [Attacker: hydra / medusa / ssh]    |
|                  | (network attack)   |
|                  v                    |
|          OpenSSH Daemon (sshd)        |
|                  | (auth events)      |
|                  v                    |
|           /var/log/auth.log           |
|                  | (file read)        |
|                  v                    |
|      kali_shipper.py (Agent)         |
+---------------------------------------+
                   |
                   | HTTPS POST /api/logs/ingest (TLS)
                   v
+--------------------------------------------------------+
|          CLOUD SIEM BACKEND (Node.js Express)          |
|  1. Regex Log Normalization (RFC 3164)                 |
|  2. Geo-IP Resolution & Meta Enrichment                |
|  3. Sliding-Window Rate Tracker                        |
|  4. MITRE ATT&CK Evaluation Engine (T1110, T1078, etc.)|
|  5. Automated Firewall Drop List (Fail2ban Engine)     |
+--------------------------------------------------------+
                   |
                   | Server-Sent Events (SSE) Stream
                   v
+--------------------------------------------------------+
|       SOC ANALYST WEB DASHBOARD (React + Tailwind)     |
|  - Real-time Threat Triage                             |
|  - Threat Geo-Origins & IP Inspector                   |
|  - One-Click Linux Firewall (iptables / ufw) Rules     |
+--------------------------------------------------------+`}
              </pre>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
              <h4 className="font-bold text-cyan-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                1. Generation (Kali)
              </h4>
              <p className="text-slate-400">
                Whenever an SSH login fails, Linux PAM and OpenSSH record an event to <code>/var/log/auth.log</code> containing the timestamp, process ID, username, source IP, and port.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
              <h4 className="font-bold text-indigo-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                2. Ingestion &amp; Parsing
              </h4>
              <p className="text-slate-400">
                Our lightweight Python shipper tails the file in real time and dispatches HTTP batches to <code>/api/logs/ingest</code> without altering system configuration.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
              <h4 className="font-bold text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                3. Sliding Window Rule
              </h4>
              <p className="text-slate-400">
                The detection engine tallies consecutive failures per IP in a rolling 60-second window. Once the count exceeds 5, a CRITICAL alert triggers and the IP is banned!
              </p>
            </div>
          </div>
        </div>
      )}

      {activeStep === 2 && (
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-400" />
              Deploying the Python Log Shipper Agent on Kali Linux
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              You can run this script directly on your Kali Linux machine or any Ubuntu/Debian server to transmit real auth events to this dashboard.
            </p>
          </div>

          {/* Quick One-Liner Box */}
          <div className="p-4 bg-indigo-950/30 rounded-xl border border-indigo-900/50 space-y-3">
            <span className="text-xs font-bold text-indigo-300 font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              OPTION A: ONE-LINE QUICK INSTALL (Run in Kali Terminal)
            </span>
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto">
              <code>
                curl -sSL &quot;{currentHost}/api/agent/script/python&quot; -o kali_shipper.py &amp;&amp; sudo python3 kali_shipper.py
              </code>
              <button
                onClick={() =>
                  handleCopy(
                    'oneliner',
                    `curl -sSL "${currentHost}/api/agent/script/python" -o kali_shipper.py && sudo python3 kali_shipper.py`
                  )
                }
                className="ml-3 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                {copiedKey === 'oneliner' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Command</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              * Note: Must run with <code>sudo</code> because Linux restricts reading <code>/var/log/auth.log</code> to root or the <code>adm</code> group.
            </p>
          </div>

          {/* Manual Python Script View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono font-semibold text-slate-200">OPTION B: MANUAL SCRIPT (kali_shipper.py)</span>
              <button
                onClick={() => handleCopy('python_script', pythonShipperCode)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1 font-mono text-xs"
              >
                {copiedKey === 'python_script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Full Python Script</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-900 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 max-h-72 overflow-y-auto scrollbar-thin">
              {pythonShipperCode}
            </pre>
          </div>

          {/* Systemd Service Setup */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              OPTIONAL: Configure as Persistent Background Systemd Service
            </h4>
            <p className="text-xs text-slate-400">
              To make the agent run automatically in the background even after restarting Kali:
            </p>
            <div className="p-3 bg-slate-950 rounded border border-slate-850 font-mono text-xs text-slate-300 space-y-1">
              <p className="text-slate-500"># 1. Create systemd unit file:</p>
              <p className="text-cyan-300">sudo nano /etc/systemd/system/siem-shipper.service</p>
              <p className="text-slate-500 mt-2"># 2. Paste configuration &amp; start service:</p>
              <p className="text-emerald-400">sudo systemctl daemon-reload</p>
              <p className="text-emerald-400">sudo systemctl enable --now siem-shipper</p>
            </div>
          </div>
        </div>
      )}

      {activeStep === 3 && (
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-400" />
              Real Kali Linux Attack Commands &amp; Demonstration
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Run these real commands on your Kali machine against your test victim host to trigger the detection rules.
            </p>
          </div>

          {/* Attack 1: Hydra SSH */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  CRITICAL
                </span>
                <h4 className="text-sm font-bold text-white">
                  Attack 1: Hydra SSH Dictionary Brute-Force (MITRE T1110.001)
                </h4>
              </div>
              <button
                onClick={() => onTriggerSim('SSH_HYDRA_BRUTEFORCE')}
                className="px-2.5 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 rounded text-xs font-mono font-bold flex items-center gap-1 transition-colors"
              >
                <Play className="w-3 h-3 fill-rose-300" />
                <span>Simulate Here Now</span>
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Hydra rapidly iterates through dictionary passwords targeting the root account.
            </p>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs flex items-center justify-between text-cyan-300">
              <code>hydra -l root -P /usr/share/wordlists/rockyou.txt ssh://&lt;VICTIM_IP&gt; -t 4 -vV</code>
              <button
                onClick={() =>
                  handleCopy('hydra', 'hydra -l root -P /usr/share/wordlists/rockyou.txt ssh://<VICTIM_IP> -t 4 -vV')
                }
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
              >
                {copiedKey === 'hydra' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="p-2.5 bg-slate-950/60 rounded text-[11px] font-mono text-slate-400 space-y-1">
              <p className="text-slate-300 font-bold">What each flag does:</p>
              <p><code>-l root</code> : Target username</p>
              <p><code>-P /usr/share/wordlists/rockyou.txt</code> : Kali&apos;s standard wordlist of 14 million passwords</p>
              <p><code>-t 4</code> : Number of parallel connection threads</p>
              <p><code>-vV</code> : Very verbose output to terminal</p>
            </div>
          </div>

          {/* Attack 2: Password Spraying */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  HIGH
                </span>
                <h4 className="text-sm font-bold text-white">
                  Attack 2: Horizontal Password Spraying Campaign (MITRE T1110.003)
                </h4>
              </div>
              <button
                onClick={() => onTriggerSim('PASSWORD_SPRAYING')}
                className="px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded text-xs font-mono font-bold flex items-center gap-1 transition-colors"
              >
                <Play className="w-3 h-3 fill-amber-300" />
                <span>Simulate Here Now</span>
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Tests a single password (e.g. &quot;Summer2026!&quot;) against multiple different usernames to circumvent per-user lockout thresholds.
            </p>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs flex items-center justify-between text-cyan-300">
              <code>
                for user in admin dev deploy test backup guest; do sshpass -p &apos;Summer2026!&apos; ssh -o StrictHostKeyChecking=no $user@&lt;VICTIM_IP&gt;; done
              </code>
              <button
                onClick={() =>
                  handleCopy(
                    'spray',
                    "for user in admin dev deploy test backup guest; do sshpass -p 'Summer2026!' ssh -o StrictHostKeyChecking=no $user@<VICTIM_IP>; done"
                  )
                }
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
              >
                {copiedKey === 'spray' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Attack 3: Sudo Abuse */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  HIGH
                </span>
                <h4 className="text-sm font-bold text-white">
                  Attack 3: Local Sudo Privilege Escalation Abuse (MITRE T1548.003)
                </h4>
              </div>
              <button
                onClick={() => onTriggerSim('SUDO_PRIVILEGE_ESCALATION')}
                className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded text-xs font-mono font-bold flex items-center gap-1 transition-colors"
              >
                <Play className="w-3 h-3 fill-purple-300" />
                <span>Simulate Here Now</span>
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Generates repeated incorrect password attempts using sudo to gain root shell.
            </p>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs flex items-center justify-between text-cyan-300">
              <code>for i in 1 2 3; do echo &quot;wrongpassword&quot; | sudo -S ls 2&gt;&amp;1; done</code>
              <button
                onClick={() =>
                  handleCopy('sudo', 'for i in 1 2 3; do echo "wrongpassword" | sudo -S ls 2>&1; done')
                }
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
              >
                {copiedKey === 'sudo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeStep === 4 && (
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              Instant Terminal Testing: Direct Ingestion via cURL
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              You can test the entire SIEM pipeline in 2 seconds right now by copying and pasting these curl commands into your Kali or Linux terminal!
            </p>
          </div>

          <div className="space-y-4">
            {/* cURL 1 */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-white font-mono">
                1. Test Single Failed SSH Password Event:
              </span>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 font-mono text-xs text-cyan-300 flex items-center justify-between overflow-x-auto">
                <code>
                  curl -X POST &quot;{currentHost}/api/logs/ingest&quot; -H &quot;Content-Type: application/json&quot; -d &apos;{JSON.stringify({ raw: 'Failed password for root from 194.26.29.112 port 49120 ssh2' })}&apos;
                </code>
                <button
                  onClick={() =>
                    handleCopy(
                      'curl1',
                      `curl -X POST "${currentHost}/api/logs/ingest" -H "Content-Type: application/json" -d '{"raw":"Failed password for root from 194.26.29.112 port 49120 ssh2"}'`
                    )
                  }
                  className="ml-3 p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 whitespace-nowrap"
                >
                  {copiedKey === 'curl1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* cURL 2 */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-white font-mono">
                2. Trigger Instant Brute-Force Alert (Batch of 6 attempts):
              </span>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 font-mono text-xs text-cyan-300 flex items-center justify-between overflow-x-auto">
                <code>
                  curl -X POST &quot;{currentHost}/api/simulate&quot; -H &quot;Content-Type: application/json&quot; -d &apos;{JSON.stringify({ scenario: 'SSH_HYDRA_BRUTEFORCE', attackerIp: '185.220.101.5', count: 6 })}&apos;
                </code>
                <button
                  onClick={() =>
                    handleCopy(
                      'curl2',
                      `curl -X POST "${currentHost}/api/simulate" -H "Content-Type: application/json" -d '{"scenario":"SSH_HYDRA_BRUTEFORCE","attackerIp":"185.220.101.5","count":6}'`
                    )
                  }
                  className="ml-3 p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 whitespace-nowrap"
                >
                  {copiedKey === 'curl2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStep === 5 && (
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            Troubleshooting Common Beginner Errors
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <h4 className="font-bold text-rose-400 font-mono">
                [ERROR] Permission denied: &apos;/var/log/auth.log&apos;
              </h4>
              <p className="text-slate-300">
                <strong>Cause:</strong> Linux protects authentication logs so non-root users cannot read password attempts or usernames.
              </p>
              <p className="text-slate-400 font-mono">
                <strong>Fix:</strong> Run with sudo: <code>sudo python3 kali_shipper.py</code> or add your user to the adm group: <code>sudo usermod -aG adm $USER</code>
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <h4 className="font-bold text-amber-400 font-mono">
                [ERROR] FileNotFoundError: &apos;/var/log/auth.log&apos; does not exist
              </h4>
              <p className="text-slate-300">
                <strong>Cause:</strong> On newer Debian 12 / Ubuntu 24.04 installations, systemd-journald is used by default and rsyslog is not installed.
              </p>
              <p className="text-slate-400 font-mono">
                <strong>Fix:</strong> Install rsyslog: <code>sudo apt update &amp;&amp; sudo apt install -y rsyslog &amp;&amp; sudo systemctl restart rsyslog</code>
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <h4 className="font-bold text-cyan-400 font-mono">
                [QUESTION] How does the Kali VM reach the Cloud SIEM URL?
              </h4>
              <p className="text-slate-300">
                Because this application is hosted online via Google Cloud Run with an active public HTTPS URL, your Kali VM only needs standard outbound internet access (NAT or Bridged adapter). No port forwarding or static IP is required on your Kali VM!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

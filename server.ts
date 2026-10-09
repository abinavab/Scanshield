import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  SecurityLog,
  SecurityAlert,
  DetectionRule,
  BannedIp,
  AgentNode,
  SystemStats,
  GeoLocation,
  EventType,
} from './src/types/security.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure data directory exists
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'security_store.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create data dir:', err);
  }
}

// In-Memory Database State
interface StoreState {
  logs: SecurityLog[];
  alerts: SecurityAlert[];
  rules: DetectionRule[];
  bannedIps: BannedIp[];
  agents: Record<string, AgentNode>;
}

const DEFAULT_RULES: DetectionRule[] = [
  {
    id: 'rule-ssh-bruteforce',
    name: 'SSH Brute-Force Password Guessing',
    technique: 'T1110.001',
    description: 'Detects high-frequency failed SSH authentication attempts from a single IP.',
    enabled: true,
    threshold: 5,
    windowSeconds: 60,
    severity: 'CRITICAL',
    autoBan: true,
    autoBanDurationMinutes: 15,
  },
  {
    id: 'rule-password-spraying',
    name: 'Horizontal Password Spraying',
    technique: 'T1110.003',
    description: 'Detects single IP attempting credentials across multiple distinct usernames.',
    enabled: true,
    threshold: 4,
    windowSeconds: 120,
    severity: 'HIGH',
    autoBan: true,
    autoBanDurationMinutes: 30,
  },
  {
    id: 'rule-account-compromise',
    name: 'Brute-Force Followed by Successful Login',
    technique: 'T1078',
    description: 'Detects successful login following 3+ previous failed attempts from the same IP (possible credential compromise).',
    enabled: true,
    threshold: 3,
    windowSeconds: 300,
    severity: 'CRITICAL',
    autoBan: false,
    autoBanDurationMinutes: 60,
  },
  {
    id: 'rule-sudo-abuse',
    name: 'Sudo Privilege Escalation Abuse',
    technique: 'T1548.003',
    description: 'Detects repeated failed sudo privilege escalation attempts or unauthorized sudoers access.',
    enabled: true,
    threshold: 3,
    windowSeconds: 90,
    severity: 'HIGH',
    autoBan: true,
    autoBanDurationMinutes: 20,
  },
  {
    id: 'rule-burst-flood',
    name: 'Connection Flooding & Rapid Probing',
    technique: 'T1046',
    description: 'Detects rapid burst of authentication connection drops or port scans within a short interval.',
    enabled: true,
    threshold: 12,
    windowSeconds: 30,
    severity: 'MEDIUM',
    autoBan: true,
    autoBanDurationMinutes: 10,
  },
];

let store: StoreState = {
  logs: [],
  alerts: [],
  rules: DEFAULT_RULES,
  bannedIps: [],
  agents: {},
};

// Geo IP Lookup Simulation / Knowledge Base
const GEO_DATABASE: Record<string, GeoLocation> = {
  '192.168.1.105': { country: 'Local Network (Kali Lab)', countryCode: 'LAN', city: 'Kali Virtual Machine', flag: '🛡️', org: 'Private Subnet' },
  '10.0.2.15': { country: 'NAT Gateway (Kali)', countryCode: 'LAN', city: 'VirtualBox / VMware Host', flag: '🛡️', org: 'Internal Lab' },
  '127.0.0.1': { country: 'Localhost', countryCode: 'LOC', city: 'Loopback', flag: '💻', org: 'Local System' },
  '185.220.101.5': { country: 'Germany', countryCode: 'DE', city: 'Frankfurt', flag: '🇩🇪', org: 'Tor Exit Node / Bulletproof VPS' },
  '194.26.29.112': { country: 'Russia', countryCode: 'RU', city: 'Moscow', flag: '🇷🇺', org: 'Selectel ASN / Redline Botnet' },
  '45.148.10.88': { country: 'Netherlands', countryCode: 'NL', city: 'Amsterdam', flag: '🇳🇱', org: 'HostKey ISP / Scanner' },
  '218.92.0.18': { country: 'China', countryCode: 'CN', city: 'Lianyungang', flag: '🇨🇳', org: 'China Telecom Scanner' },
  '198.51.100.42': { country: 'United States', countryCode: 'US', city: 'Ashburn', flag: '🇺🇸', org: 'DigitalOcean Cloud Proxy' },
  '103.251.167.20': { country: 'India', countryCode: 'IN', city: 'Mumbai', flag: '🇮🇳', org: 'Reliance Jio Public IP' },
  '185.191.171.12': { country: 'United Kingdom', countryCode: 'GB', city: 'London', flag: '🇬🇧', org: 'Cloud VPS Host' },
  '178.128.23.45': { country: 'Singapore', countryCode: 'SG', city: 'Singapore', flag: '🇸🇬', org: 'Cloudflare / AWS Proxy' },
};

function resolveGeo(ip: string): GeoLocation {
  if (GEO_DATABASE[ip]) return GEO_DATABASE[ip];
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) {
    return {
      country: 'Kali Linux Lab (LAN)',
      countryCode: 'LAN',
      city: 'Local Virtual Lab',
      flag: '🛡️',
      org: 'Local Network Interface',
    };
  }
  // Deterministic pseudo-geo based on IP hash
  const hash = ip.split('.').reduce((acc, octet) => (acc * 31 + parseInt(octet || '0', 10)) % 1000, 0);
  const geos: GeoLocation[] = [
    { country: 'United States', countryCode: 'US', city: 'Chicago', flag: '🇺🇸', org: 'Amazon Web Services' },
    { country: 'Germany', countryCode: 'DE', city: 'Berlin', flag: '🇩🇪', org: 'Hetzner Online GmbH' },
    { country: 'France', countryCode: 'FR', city: 'Paris', flag: '🇫🇷', org: 'OVH SAS' },
    { country: 'Brazil', countryCode: 'BR', city: 'São Paulo', flag: '🇧🇷', org: 'Claro Brasil' },
    { country: 'Japan', countryCode: 'JP', city: 'Tokyo', flag: '🇯🇵', org: 'NTT Communications' },
    { country: 'Canada', countryCode: 'CA', city: 'Toronto', flag: '🇨🇦', org: 'OVH Hosting' },
  ];
  return geos[hash % geos.length];
}

// SSE Clients for Real-time Streaming
interface SseClient {
  id: string;
  res: Response;
}
let sseClients: SseClient[] = [];

function broadcastSse(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
    }
  });
}

// Load persisted state
function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.logs)) {
        store = {
          logs: parsed.logs,
          alerts: parsed.alerts || [],
          rules: parsed.rules && parsed.rules.length ? parsed.rules : DEFAULT_RULES,
          bannedIps: parsed.bannedIps || [],
          agents: parsed.agents || {},
        };
        console.log(`Loaded ${store.logs.length} logs and ${store.alerts.length} alerts from storage.`);
        return;
      }
    }
  } catch (err) {
    console.warn('Failed to load store, initializing seed data:', err);
  }
  seedInitialData();
}

function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    // ignore
  }
}

// Parse Raw Syslog or Ingested String
export function parseLogLine(raw: string, meta?: Partial<SecurityLog>): SecurityLog {
  const id = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();

  let service: SecurityLog['service'] = 'sshd';
  let eventType: EventType = 'UNKNOWN';
  let username = 'unknown';
  let sourceIp = '127.0.0.1';
  let port = 22;
  let severity: SecurityLog['severity'] = 'info';
  let message = raw.trim();

  // 1. SSH Failed password
  // e.g. "Oct 08 21:12:04 kali sshd[28419]: Failed password for invalid user admin from 192.168.1.105 port 44820 ssh2"
  // or "Failed password for root from 194.26.29.112 port 58210 ssh2"
  const failedPassMatch = raw.match(/Failed password for (invalid user\s+)?(\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/i);
  if (failedPassMatch) {
    service = 'sshd';
    const isInvalid = Boolean(failedPassMatch[1]);
    username = failedPassMatch[2];
    sourceIp = failedPassMatch[3];
    port = parseInt(failedPassMatch[4], 10);
    eventType = isInvalid ? 'INVALID_USER' : 'FAILED_PASSWORD';
    severity = 'high';
    message = `Failed authentication for ${isInvalid ? 'invalid user ' : ''}${username} from ${sourceIp}:${port}`;
  }
  // 2. SSH Invalid user
  // e.g. "Invalid user test from 185.220.101.5 port 39211"
  else if (raw.match(/Invalid user (\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/i)) {
    const m = raw.match(/Invalid user (\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/i)!;
    service = 'sshd';
    username = m[1];
    sourceIp = m[2];
    port = parseInt(m[3], 10);
    eventType = 'INVALID_USER';
    severity = 'medium';
    message = `Invalid user account attempted: '${username}' from ${sourceIp}`;
  }
  // 3. SSH Accepted password / publickey
  // e.g. "Accepted password for ubuntu from 192.168.1.50 port 52114 ssh2"
  else if (raw.match(/Accepted (password|publickey) for (\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/i)) {
    const m = raw.match(/Accepted (password|publickey) for (\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)/i)!;
    service = 'sshd';
    username = m[2];
    sourceIp = m[3];
    port = parseInt(m[4], 10);
    eventType = 'ACCEPTED_PASSWORD';
    severity = 'low';
    message = `Successful ${m[1]} login for user '${username}' from ${sourceIp}:${port}`;
  }
  // 4. Sudo incorrect password attempt / abuse
  // e.g. "attacker : 3 incorrect password attempts ; TTY=pts/2 ; PWD=/home/kali ; USER=root ; COMMAND=/bin/bash"
  else if (raw.includes('incorrect password attempts') || raw.includes('user NOT in sudoers') || raw.includes('sudo:')) {
    service = 'sudo';
    eventType = 'SUDO_FAILURE';
    severity = 'critical';
    const sudoUserMatch = raw.match(/^([a-zA-Z0-9_-]+)\s*:/);
    if (sudoUserMatch) username = sudoUserMatch[1];
    const ipMatch = raw.match(/(\d+\.\d+\.\d+\.\d+)/);
    if (ipMatch) sourceIp = ipMatch[1];
    message = `Sudo privilege escalation failure: ${raw}`;
  }
  // 5. Connection closed / disconnected preauth
  else if (raw.match(/Connection closed by (authenticating user )?(\d+\.\d+\.\d+\.\d+)/i) || raw.match(/Disconnected from (\d+\.\d+\.\d+\.\d+)/i)) {
    service = 'sshd';
    eventType = 'CONNECTION_CLOSED';
    severity = 'info';
    const ipMatch = raw.match(/(\d+\.\d+\.\d+\.\d+)/);
    if (ipMatch) sourceIp = ipMatch[1];
    message = `Connection terminated before completed authentication: ${sourceIp}`;
  } else {
    // generic fallback
    const ipMatch = raw.match(/(\d+\.\d+\.\d+\.\d+)/);
    if (ipMatch) sourceIp = ipMatch[1];
  }

  // Override with meta if explicitly provided
  if (meta?.service) service = meta.service;
  if (meta?.eventType) eventType = meta.eventType;
  if (meta?.username && meta.username !== 'unknown') username = meta.username;
  if (meta?.sourceIp) sourceIp = meta.sourceIp;
  if (meta?.port) port = meta.port;
  if (meta?.severity) severity = meta.severity;
  if (meta?.message) message = meta.message;

  return {
    id,
    timestamp: meta?.timestamp || now,
    service,
    eventType,
    username,
    sourceIp,
    port,
    message,
    raw,
    severity,
    geo: resolveGeo(sourceIp),
    agentId: meta?.agentId,
    isSimulated: meta?.isSimulated || false,
  };
}

// Banning Helper
function banIp(ip: string, reason: string, durationMinutes: number, alertId?: string) {
  const existingIndex = store.bannedIps.findIndex((b) => b.ip === ip);
  const now = new Date();
  const expiresAt = durationMinutes > 0 ? new Date(now.getTime() + durationMinutes * 60000).toISOString() : null;

  const bannedObj: BannedIp = {
    ip,
    bannedAt: now.toISOString(),
    expiresAt,
    reason,
    alertId,
    totalAttempts: (store.logs.filter((l) => l.sourceIp === ip).length) || 1,
    iptablesRule: `sudo iptables -A INPUT -s ${ip} -j DROP`,
    ufwRule: `sudo ufw deny from ${ip}`,
    geo: resolveGeo(ip),
  };

  if (existingIndex >= 0) {
    store.bannedIps[existingIndex] = bannedObj;
  } else {
    store.bannedIps.unshift(bannedObj);
  }

  broadcastSse('ip_banned', bannedObj);
  console.log(`[FIREWALL MITIGATION] IP Banned: ${ip} | Reason: ${reason} | Duration: ${durationMinutes} mins`);
}

// Detection Engine: Evaluates Rules on Ingest
export function evaluateDetectionEngine(newLog: SecurityLog): SecurityAlert[] {
  const triggeredAlerts: SecurityAlert[] = [];
  const nowMs = new Date(newLog.timestamp).getTime();

  // Ignore if already banned or internal whitelist
  if (newLog.sourceIp === '127.0.0.1') return [];

  // 1. RULE: SSH Brute Force (T1110.001)
  const sshRule = store.rules.find((r) => r.id === 'rule-ssh-bruteforce' && r.enabled);
  if (sshRule && (newLog.eventType === 'FAILED_PASSWORD' || newLog.eventType === 'INVALID_USER')) {
    const windowStartMs = nowMs - sshRule.windowSeconds * 1000;
    const windowLogs = store.logs.filter(
      (l) =>
        l.sourceIp === newLog.sourceIp &&
        (l.eventType === 'FAILED_PASSWORD' || l.eventType === 'INVALID_USER') &&
        new Date(l.timestamp).getTime() >= windowStartMs
    );

    // If threshold reached and we haven't already created an active alert in this window
    if (windowLogs.length >= sshRule.threshold) {
      const recentActive = store.alerts.find(
        (a) =>
          a.sourceIp === newLog.sourceIp &&
          a.type === 'BRUTE_FORCE_SSH' &&
          a.status === 'ACTIVE' &&
          nowMs - new Date(a.timestamp).getTime() < sshRule.windowSeconds * 1000
      );

      if (!recentActive) {
        const targetedUsernames = Array.from(new Set(windowLogs.map((l) => l.username)));
        const alert: SecurityAlert = {
          id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          timestamp: new Date().toISOString(),
          type: 'BRUTE_FORCE_SSH',
          title: `High-Frequency SSH Brute-Force Attack Detected (${windowLogs.length} attempts / ${sshRule.windowSeconds}s)`,
          description: `Host ${newLog.sourceIp} generated ${windowLogs.length} failed login attempts within ${sshRule.windowSeconds} seconds targeting accounts: [${targetedUsernames.join(', ')}].`,
          severity: sshRule.severity,
          sourceIp: newLog.sourceIp,
          targetedUsernames,
          attemptsCount: windowLogs.length,
          windowSeconds: sshRule.windowSeconds,
          mitreTechnique: {
            id: 'T1110.001',
            name: 'Brute Force: Password Guessing',
            tactic: 'Credential Access',
            url: 'https://attack.mitre.org/techniques/T1110/001/',
            description: 'Adversaries may guess passwords to gain access to target accounts through repeated dictionary or brute-force requests.',
            mitigation: 'Implement account lockouts, rate limiting, Fail2ban automated dropping, and mandatory SSH key authentication.',
          },
          status: 'ACTIVE',
          associatedLogIds: windowLogs.map((l) => l.id),
          autoBanned: sshRule.autoBan,
          geo: newLog.geo,
        };

        triggeredAlerts.push(alert);
        store.alerts.unshift(alert);

        if (sshRule.autoBan) {
          banIp(
            newLog.sourceIp,
            `SSH Brute Force: Exceeded ${sshRule.threshold} failed logins in ${sshRule.windowSeconds}s`,
            sshRule.autoBanDurationMinutes,
            alert.id
          );
        }
      }
    }
  }

  // 2. RULE: Password Spraying (T1110.003)
  const sprayRule = store.rules.find((r) => r.id === 'rule-password-spraying' && r.enabled);
  if (sprayRule && (newLog.eventType === 'FAILED_PASSWORD' || newLog.eventType === 'INVALID_USER')) {
    const windowStartMs = nowMs - sprayRule.windowSeconds * 1000;
    const windowLogs = store.logs.filter(
      (l) =>
        l.sourceIp === newLog.sourceIp &&
        (l.eventType === 'FAILED_PASSWORD' || l.eventType === 'INVALID_USER') &&
        new Date(l.timestamp).getTime() >= windowStartMs
    );
    const distinctUsers = Array.from(new Set(windowLogs.map((l) => l.username)));

    if (distinctUsers.length >= sprayRule.threshold) {
      const recentSpray = store.alerts.find(
        (a) =>
          a.sourceIp === newLog.sourceIp &&
          a.type === 'PASSWORD_SPRAYING' &&
          a.status === 'ACTIVE' &&
          nowMs - new Date(a.timestamp).getTime() < sprayRule.windowSeconds * 1000
      );

      if (!recentSpray) {
        const alert: SecurityAlert = {
          id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          timestamp: new Date().toISOString(),
          type: 'PASSWORD_SPRAYING',
          title: `Horizontal Password Spraying Pattern (${distinctUsers.length} accounts targeted)`,
          description: `Source IP ${newLog.sourceIp} attempted auth across ${distinctUsers.length} distinct usernames: [${distinctUsers.slice(0, 6).join(', ')}] avoiding single-user lockout thresholds.`,
          severity: sprayRule.severity,
          sourceIp: newLog.sourceIp,
          targetedUsernames: distinctUsers,
          attemptsCount: windowLogs.length,
          windowSeconds: sprayRule.windowSeconds,
          mitreTechnique: {
            id: 'T1110.003',
            name: 'Brute Force: Password Spraying',
            tactic: 'Credential Access',
            url: 'https://attack.mitre.org/techniques/T1110/003/',
            description: 'Adversaries may use a single or small set of common passwords against many different accounts to bypass account lockouts.',
            mitigation: 'Implement centralized rate limiting by IP across the enterprise, multi-factor authentication (MFA), and anomaly-based SIEM detection.',
          },
          status: 'ACTIVE',
          associatedLogIds: windowLogs.map((l) => l.id),
          autoBanned: sprayRule.autoBan,
          geo: newLog.geo,
        };

        triggeredAlerts.push(alert);
        store.alerts.unshift(alert);

        if (sprayRule.autoBan) {
          banIp(
            newLog.sourceIp,
            `Password Spraying: Attacked ${distinctUsers.length} different usernames`,
            sprayRule.autoBanDurationMinutes,
            alert.id
          );
        }
      }
    }
  }

  // 3. RULE: Account Compromise / Post-Bruteforce Success (T1078)
  const compromiseRule = store.rules.find((r) => r.id === 'rule-account-compromise' && r.enabled);
  if (compromiseRule && newLog.eventType === 'ACCEPTED_PASSWORD') {
    const windowStartMs = nowMs - compromiseRule.windowSeconds * 1000;
    const priorFails = store.logs.filter(
      (l) =>
        l.sourceIp === newLog.sourceIp &&
        (l.eventType === 'FAILED_PASSWORD' || l.eventType === 'INVALID_USER') &&
        new Date(l.timestamp).getTime() >= windowStartMs
    );

    if (priorFails.length >= compromiseRule.threshold) {
      const alert: SecurityAlert = {
        id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        type: 'ACCOUNT_COMPROMISE',
        title: `CRITICAL: Credential Compromise - Login Succeeded After ${priorFails.length} Failed Attempts!`,
        description: `Potential unauthorized account takeover: IP ${newLog.sourceIp} succeeded in authenticating as '${newLog.username}' immediately following ${priorFails.length} failed login attempts.`,
        severity: compromiseRule.severity,
        sourceIp: newLog.sourceIp,
        targetedUsernames: [newLog.username],
        attemptsCount: priorFails.length + 1,
        windowSeconds: compromiseRule.windowSeconds,
        mitreTechnique: {
          id: 'T1078',
          name: 'Valid Accounts: Compromised Credentials',
          tactic: 'Defense Evasion & Persistence',
          url: 'https://attack.mitre.org/techniques/T1078/',
          description: 'Adversaries may obtain and abuse credentials of existing accounts following successful brute-force guessing.',
          mitigation: 'Immediately revoke session tokens, force password reset, quarantine the user account, and inspect running processes.',
        },
        status: 'ACTIVE',
        associatedLogIds: [...priorFails.map((l) => l.id), newLog.id],
        autoBanned: compromiseRule.autoBan,
        geo: newLog.geo,
      };

      triggeredAlerts.push(alert);
      store.alerts.unshift(alert);

      if (compromiseRule.autoBan) {
        banIp(
          newLog.sourceIp,
          `Credential Compromise: Success after repeated brute-force attacks`,
          compromiseRule.autoBanDurationMinutes,
          alert.id
        );
      }
    }
  }

  // 4. RULE: Sudo Privilege Abuse (T1548.003)
  const sudoRule = store.rules.find((r) => r.id === 'rule-sudo-abuse' && r.enabled);
  if (sudoRule && newLog.eventType === 'SUDO_FAILURE') {
    const windowStartMs = nowMs - sudoRule.windowSeconds * 1000;
    const sudoFails = store.logs.filter(
      (l) =>
        l.service === 'sudo' &&
        l.eventType === 'SUDO_FAILURE' &&
        new Date(l.timestamp).getTime() >= windowStartMs
    );

    if (sudoFails.length >= sudoRule.threshold) {
      const recentSudoAlert = store.alerts.find(
        (a) =>
          a.type === 'SUDO_PRIVILEGE_ABUSE' &&
          a.status === 'ACTIVE' &&
          nowMs - new Date(a.timestamp).getTime() < sudoRule.windowSeconds * 1000
      );

      if (!recentSudoAlert) {
        const alert: SecurityAlert = {
          id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          timestamp: new Date().toISOString(),
          type: 'SUDO_PRIVILEGE_ABUSE',
          title: `Privilege Escalation Alert: Repeated Sudo Authentication Failures`,
          description: `Internal user '${newLog.username}' generated ${sudoFails.length} consecutive failed sudo attempts within ${sudoRule.windowSeconds}s. Potential privilege escalation attempt.`,
          severity: sudoRule.severity,
          sourceIp: newLog.sourceIp,
          targetedUsernames: [newLog.username, 'root'],
          attemptsCount: sudoFails.length,
          windowSeconds: sudoRule.windowSeconds,
          mitreTechnique: {
            id: 'T1548.003',
            name: 'Abuse Elevation Control: Sudo and Sudo Caching',
            tactic: 'Privilege Escalation',
            url: 'https://attack.mitre.org/techniques/T1548/003/',
            description: 'Adversaries may execute commands with elevated permissions or guess sudo passwords on local Unix systems.',
            mitigation: 'Restrict sudoers file permissions, audit wheel/sudo group membership, and configure pam_tally2 / pam_faillock.',
          },
          status: 'ACTIVE',
          associatedLogIds: sudoFails.map((l) => l.id),
          autoBanned: false,
          geo: newLog.geo,
        };

        triggeredAlerts.push(alert);
        store.alerts.unshift(alert);
      }
    }
  }

  return triggeredAlerts;
}

// Ingestion Pipeline
function ingestLogItem(raw: string, meta?: Partial<SecurityLog>): { log: SecurityLog; alerts: SecurityAlert[] } {
  const log = parseLogLine(raw, meta);
  // Prepend log to in-memory list (limit to 3,000 for performance)
  store.logs.unshift(log);
  if (store.logs.length > 3000) {
    store.logs.pop();
  }

  // Run detection
  const newAlerts = evaluateDetectionEngine(log);

  // Broadcast to live SSE stream
  broadcastSse('new_log', log);
  newAlerts.forEach((alert) => broadcastSse('new_alert', alert));

  return { log, alerts: newAlerts };
}

// Periodic cleanup of expired bans
setInterval(() => {
  const now = new Date().getTime();
  const initialCount = store.bannedIps.length;
  store.bannedIps = store.bannedIps.filter((b) => {
    if (!b.expiresAt) return true; // permanent
    return new Date(b.expiresAt).getTime() > now;
  });
  if (store.bannedIps.length !== initialCount) {
    broadcastSse('banned_ips_updated', store.bannedIps);
  }
}, 15000);

// Calculate system metrics
function getSystemStats(): SystemStats {
  const now = Date.now();
  const lastMinuteMs = now - 60000;
  const recentLogs = store.logs.filter((l) => new Date(l.timestamp).getTime() >= lastMinuteMs);
  const eventsPerSecond = parseFloat((recentLogs.length / 60).toFixed(2));

  const failedCount = store.logs.filter((l) => l.eventType === 'FAILED_PASSWORD' || l.eventType === 'INVALID_USER' || l.eventType === 'SUDO_FAILURE').length;
  const successCount = store.logs.filter((l) => l.eventType === 'ACCEPTED_PASSWORD' || l.eventType === 'SUDO_SUCCESS').length;
  const activeAlertsCount = store.alerts.filter((a) => a.status === 'ACTIVE').length;

  // Determine threat level
  let threatLevel: SystemStats['threatLevel'] = 'LOW';
  if (activeAlertsCount >= 5 || recentLogs.some((l) => l.severity === 'critical')) {
    threatLevel = 'CRITICAL';
  } else if (activeAlertsCount >= 3) {
    threatLevel = 'HIGH';
  } else if (activeAlertsCount >= 1 || eventsPerSecond > 2) {
    threatLevel = 'ELEVATED';
  } else if (failedCount > 10) {
    threatLevel = 'GUARDED';
  }

  // Top targeted usernames
  const userCounts: Record<string, number> = {};
  store.logs.forEach((l) => {
    if (l.username && l.username !== 'unknown') {
      userCounts[l.username] = (userCounts[l.username] || 0) + 1;
    }
  });
  const topTargetedUsers = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([username, count]) => ({ username, count }));

  // Top attacking IPs
  const ipCounts: Record<string, number> = {};
  store.logs.forEach((l) => {
    if (l.sourceIp && l.sourceIp !== '127.0.0.1') {
      ipCounts[l.sourceIp] = (ipCounts[l.sourceIp] || 0) + 1;
    }
  });
  const topAttackingIps = Object.entries(ipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ip, count]) => ({
      ip,
      count,
      country: resolveGeo(ip).country,
    }));

  const activeAgentsCount = Object.values(store.agents).filter((a) => a.status === 'ONLINE').length;

  return {
    totalLogs: store.logs.length,
    failedLogins: failedCount,
    successfulLogins: successCount,
    activeAlerts: activeAlertsCount,
    bannedIpsCount: store.bannedIps.length,
    activeAgentsCount,
    eventsPerSecond,
    threatLevel,
    topTargetedUsers,
    topAttackingIps,
  };
}

// Seed Initial Realistic Data for Demonstration
function seedInitialData() {
  const seedTimestamp = (offsetSecAgo: number) => new Date(Date.now() - offsetSecAgo * 1000).toISOString();

  const sampleEvents = [
    {
      raw: 'Oct 08 21:10:02 kali-victim sshd[18402]: Failed password for invalid user admin from 194.26.29.112 port 48921 ssh2',
      offset: 320,
    },
    {
      raw: 'Oct 08 21:10:05 kali-victim sshd[18403]: Failed password for invalid user root from 194.26.29.112 port 48922 ssh2',
      offset: 310,
    },
    {
      raw: 'Oct 08 21:10:07 kali-victim sshd[18404]: Failed password for invalid user test from 194.26.29.112 port 48923 ssh2',
      offset: 300,
    },
    {
      raw: 'Oct 08 21:10:09 kali-victim sshd[18405]: Failed password for invalid user oracle from 194.26.29.112 port 48924 ssh2',
      offset: 290,
    },
    {
      raw: 'Oct 08 21:10:12 kali-victim sshd[18406]: Failed password for invalid user deploy from 194.26.29.112 port 48925 ssh2',
      offset: 280,
    },
    {
      raw: 'Oct 08 21:14:15 kali-victim sshd[19022]: Failed password for root from 185.220.101.5 port 53102 ssh2',
      offset: 220,
    },
    {
      raw: 'Oct 08 21:14:17 kali-victim sshd[19023]: Failed password for root from 185.220.101.5 port 53104 ssh2',
      offset: 215,
    },
    {
      raw: 'Oct 08 21:14:19 kali-victim sshd[19024]: Failed password for root from 185.220.101.5 port 53106 ssh2',
      offset: 210,
    },
    {
      raw: 'Oct 08 21:14:21 kali-victim sshd[19025]: Failed password for root from 185.220.101.5 port 53108 ssh2',
      offset: 205,
    },
    {
      raw: 'Oct 08 21:14:23 kali-victim sshd[19026]: Failed password for root from 185.220.101.5 port 53110 ssh2',
      offset: 200,
    },
    {
      raw: 'Oct 08 21:14:25 kali-victim sshd[19027]: Failed password for root from 185.220.101.5 port 53112 ssh2',
      offset: 195,
    },
    {
      raw: 'Oct 08 21:18:40 kali-victim sudo: attacker : 3 incorrect password attempts ; TTY=pts/1 ; PWD=/home/kali ; USER=root ; COMMAND=/bin/bash',
      offset: 120,
    },
    {
      raw: 'Oct 08 21:20:00 kali-victim sshd[20101]: Accepted publickey for vyogarajan from 178.128.23.45 port 59281 ssh2: RSA SHA256:abc82f...',
      offset: 60,
    },
  ];

  sampleEvents.forEach((ev) => {
    const parsed = parseLogLine(ev.raw, {
      timestamp: seedTimestamp(ev.offset),
      isSimulated: true,
    });
    store.logs.unshift(parsed);
    evaluateDetectionEngine(parsed);
  });

  // Seed default registered Kali agent
  store.agents['kali-agent-01'] = {
    id: 'kali-agent-01',
    hostname: 'kali-rolling-soc',
    ip: '192.168.1.105',
    os: 'Kali Linux 2026.1 (Debian GNU/Linux)',
    lastSeen: new Date().toISOString(),
    status: 'ONLINE',
    logsShipped: 42,
    version: '1.2.0',
    kernel: 'Linux 6.6.9-kali1-amd64',
  };

  saveStore();
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Live SSE Stream Endpoint
app.get('/api/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const clientId = 'sse_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  sseClients.push({ id: clientId, res });

  // Send initial handshake
  res.write(`event: handshake\ndata: ${JSON.stringify({ clientId, status: 'CONNECTED', serverTime: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// 2. Log Ingestion (Single or Batch)
// Accepts:
//  - Raw string: "Failed password for root from ..."
//  - JSON object: { raw: string, service?: string, ... }
//  - Array of strings or objects: [ ... ]
app.post('/api/logs/ingest', (req: Request, res: Response) => {
  const body = req.body;
  const agentKey = req.headers['x-agent-key'] || req.headers['authorization'];

  if (!body) {
    return res.status(400).json({ error: 'Request body is empty' });
  }

  let itemsToIngest: any[] = [];
  if (Array.isArray(body)) {
    itemsToIngest = body;
  } else if (typeof body === 'string') {
    // Multi-line syslog text string
    itemsToIngest = body.split('\n').filter((l) => l.trim().length > 0);
  } else if (body.raw) {
    itemsToIngest = [body];
  } else if (body.logs && Array.isArray(body.logs)) {
    itemsToIngest = body.logs;
  } else {
    itemsToIngest = [body];
  }

  const results: SecurityLog[] = [];
  const triggeredAlerts: SecurityAlert[] = [];

  for (const item of itemsToIngest) {
    let rawStr = '';
    let meta: Partial<SecurityLog> = {};

    if (typeof item === 'string') {
      rawStr = item;
    } else {
      rawStr = item.raw || item.message || JSON.stringify(item);
      meta = {
        service: item.service,
        eventType: item.eventType,
        username: item.username,
        sourceIp: item.sourceIp || item.ip,
        port: item.port ? parseInt(item.port, 10) : undefined,
        severity: item.severity,
        agentId: item.agentId,
        timestamp: item.timestamp,
        isSimulated: item.isSimulated,
      };
    }

    if (rawStr.trim()) {
      const { log, alerts } = ingestLogItem(rawStr, meta);
      results.push(log);
      triggeredAlerts.push(...alerts);
    }
  }

  saveStore();

  return res.status(200).json({
    success: true,
    ingestedCount: results.length,
    alertsTriggeredCount: triggeredAlerts.length,
    alerts: triggeredAlerts,
    sample: results[0] || null,
  });
});

// 3. Get Logs with Search, Pagination, Filtering
app.get('/api/logs', (req: Request, res: Response) => {
  const { q, service, eventType, ip, severity, limit = '100', offset = '0' } = req.query;

  let filtered = [...store.logs];

  if (q && typeof q === 'string') {
    const query = q.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.message.toLowerCase().includes(query) ||
        l.username.toLowerCase().includes(query) ||
        l.sourceIp.includes(query) ||
        l.raw.toLowerCase().includes(query)
    );
  }

  if (service && typeof service === 'string' && service !== 'ALL') {
    filtered = filtered.filter((l) => l.service === service);
  }

  if (eventType && typeof eventType === 'string' && eventType !== 'ALL') {
    filtered = filtered.filter((l) => l.eventType === eventType);
  }

  if (ip && typeof ip === 'string') {
    filtered = filtered.filter((l) => l.sourceIp === ip);
  }

  if (severity && typeof severity === 'string' && severity !== 'ALL') {
    filtered = filtered.filter((l) => l.severity === severity);
  }

  const start = parseInt(offset as string, 10) || 0;
  const count = parseInt(limit as string, 10) || 100;
  const paginated = filtered.slice(start, start + count);

  return res.json({
    total: filtered.length,
    offset: start,
    limit: count,
    logs: paginated,
  });
});

// 4. Alerts API
app.get('/api/alerts', (req: Request, res: Response) => {
  const { status, severity } = req.query;
  let alerts = [...store.alerts];

  if (status && typeof status === 'string' && status !== 'ALL') {
    alerts = alerts.filter((a) => a.status === status);
  }

  if (severity && typeof severity === 'string' && severity !== 'ALL') {
    alerts = alerts.filter((a) => a.severity === severity);
  }

  return res.json({ alerts, total: alerts.length });
});

app.patch('/api/alerts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, analystNotes } = req.body;

  const alertIndex = store.alerts.findIndex((a) => a.id === id);
  if (alertIndex === -1) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  if (status) store.alerts[alertIndex].status = status;
  if (analystNotes !== undefined) store.alerts[alertIndex].analystNotes = analystNotes;

  saveStore();
  broadcastSse('alert_updated', store.alerts[alertIndex]);

  return res.json({ success: true, alert: store.alerts[alertIndex] });
});

// 5. Detection Rules API
app.get('/api/rules', (req: Request, res: Response) => {
  return res.json({ rules: store.rules });
});

app.put('/api/rules', (req: Request, res: Response) => {
  const { rules } = req.body;
  if (!Array.isArray(rules)) {
    return res.status(400).json({ error: 'Rules must be an array' });
  }
  store.rules = rules;
  saveStore();
  broadcastSse('rules_updated', store.rules);
  return res.json({ success: true, rules: store.rules });
});

// 6. Banned IPs & Mitigation API
app.get('/api/banned-ips', (req: Request, res: Response) => {
  return res.json({ bannedIps: store.bannedIps, total: store.bannedIps.length });
});

app.post('/api/banned-ips', (req: Request, res: Response) => {
  const { ip, reason, durationMinutes = 30 } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'IP is required' });
  }
  banIp(ip, reason || 'Manually banned by SOC Analyst', durationMinutes);
  saveStore();
  return res.json({ success: true, bannedIps: store.bannedIps });
});

app.delete('/api/banned-ips/:ip', (req: Request, res: Response) => {
  const { ip } = req.params;
  store.bannedIps = store.bannedIps.filter((b) => b.ip !== ip);
  saveStore();
  broadcastSse('banned_ips_updated', store.bannedIps);
  return res.json({ success: true, message: `Unbanned IP: ${ip}`, bannedIps: store.bannedIps });
});

// 7. Kali Agent Heartbeat & Registration
app.post('/api/agent/heartbeat', (req: Request, res: Response) => {
  const { id = 'kali-host', hostname = 'kali', ip, os = 'Kali Linux', version = '1.0.0', kernel, logsShipped = 0 } = req.body;
  const clientIp = ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '192.168.1.105';

  const agent: AgentNode = {
    id,
    hostname,
    ip: String(clientIp).replace('::ffff:', ''),
    os,
    lastSeen: new Date().toISOString(),
    status: 'ONLINE',
    logsShipped: (store.agents[id]?.logsShipped || 0) + logsShipped,
    version,
    kernel,
  };

  store.agents[id] = agent;
  saveStore();
  broadcastSse('agent_heartbeat', agent);

  return res.json({
    status: 'ACK',
    message: 'Heartbeat registered successfully',
    bannedIps: store.bannedIps.map((b) => b.ip),
    serverTime: new Date().toISOString(),
  });
});

app.get('/api/agents', (req: Request, res: Response) => {
  return res.json({ agents: Object.values(store.agents) });
});

// 8. System Stats
app.get('/api/stats', (req: Request, res: Response) => {
  return res.json(getSystemStats());
});

// 9. Kali Linux Agent Script Generators (Python & Bash)
app.get('/api/agent/script/python', (req: Request, res: Response) => {
  const hostUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  const scriptContent = `#!/usr/bin/env python3
"""
Kali Linux Real-Time Authentication Log Shipper Agent
Author: Cybersecurity SOC Team
Target URL: ${hostUrl}
"""

import time
import os
import sys
import json
import socket
import platform
import urllib.request
import urllib.error

INGEST_URL = "${hostUrl}/api/logs/ingest"
HEARTBEAT_URL = "${hostUrl}/api/agent/heartbeat"
AUTH_LOG_PATH = "/var/log/auth.log"
AGENT_ID = f"kali-{socket.gethostname()}"

print(f"[*] Starting Security Log Shipper Agent [{AGENT_ID}]")
print(f"[*] Forwarding logs to: {INGEST_URL}")

def send_heartbeat():
    try:
        payload = {
            "id": AGENT_ID,
            "hostname": socket.gethostname(),
            "ip": socket.gethostbyname(socket.gethostname()),
            "os": platform.platform(),
            "kernel": platform.release(),
            "version": "1.2.0"
        }
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(HEARTBEAT_URL, data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as res:
            pass
    except Exception as e:
        pass

def send_log_batch(lines):
    if not lines:
        return
    try:
        data = json.dumps(lines).encode('utf-8')
        req = urllib.request.Request(INGEST_URL, data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as res:
            print(f"[+] Shipped {len(lines)} log events -> Status: {res.status}")
    except Exception as e:
        print(f"[-] Failed to ship logs: {e}")

def tail_f(filepath):
    if not os.path.exists(filepath):
        print(f"[-] Warning: {filepath} not found. Creating simulated test stream...")
        return
    with open(filepath, 'r') as f:
        # Seek to end
        f.seek(0, os.SEEK_END)
        batch = []
        last_heartbeat = 0
        while True:
            line = f.readline()
            if line:
                batch.append(line.strip())
                if len(batch) >= 5:
                    send_log_batch(batch)
                    batch = []
            else:
                if batch:
                    send_log_batch(batch)
                    batch = []
                now = time.time()
                if now - last_heartbeat > 30:
                    send_heartbeat()
                    last_heartbeat = now
                time.sleep(0.5)

if __name__ == '__main__':
    send_heartbeat()
    tail_f(AUTH_LOG_PATH)
`;
  res.setHeader('Content-Type', 'text/x-python');
  res.setHeader('Content-Disposition', 'attachment; filename="kali_shipper.py"');
  return res.send(scriptContent);
});

// 10. Attack Simulation Route
app.post('/api/simulate', (req: Request, res: Response) => {
  const { scenario, targetUser = 'root', attackerIp = '194.26.29.112', count = 6 } = req.body;

  const generatedLogs: SecurityLog[] = [];
  const generatedAlerts: SecurityAlert[] = [];

  if (scenario === 'SSH_HYDRA_BRUTEFORCE') {
    const passwords = ['123456', 'password', 'admin123', 'toor', 'root2026', 'qwerty', 'letmein', 'kali'];
    for (let i = 0; i < count; i++) {
      const pass = passwords[i % passwords.length];
      const raw = `Oct 08 21:28:${String(10 + i * 2).padStart(2, '0')} kali-victim sshd[${28900 + i}]: Failed password for ${targetUser} from ${attackerIp} port ${49152 + i} ssh2 (Hydra/v9.5)`;
      const { log, alerts } = ingestLogItem(raw, {
        isSimulated: true,
        sourceIp: attackerIp,
        username: targetUser,
      });
      generatedLogs.push(log);
      generatedAlerts.push(...alerts);
    }
  } else if (scenario === 'PASSWORD_SPRAYING') {
    const users = ['admin', 'deploy', 'support', 'developer', 'accounting', 'backup', 'qa', 'sysadmin'];
    const ip = attackerIp || '45.148.10.88';
    users.slice(0, count).forEach((user, idx) => {
      const raw = `Oct 08 21:29:${String(idx * 3).padStart(2, '0')} kali-victim sshd[${29000 + idx}]: Failed password for invalid user ${user} from ${ip} port ${50100 + idx} ssh2`;
      const { log, alerts } = ingestLogItem(raw, {
        isSimulated: true,
        sourceIp: ip,
        username: user,
      });
      generatedLogs.push(log);
      generatedAlerts.push(...alerts);
    });
  } else if (scenario === 'CREDENTIAL_COMPROMISE') {
    // 3 failed attempts, then successful login!
    const ip = attackerIp || '185.191.171.12';
    for (let i = 0; i < 3; i++) {
      const raw = `Oct 08 21:30:${String(i * 2).padStart(2, '0')} kali-victim sshd[${29200 + i}]: Failed password for ${targetUser} from ${ip} port ${51200 + i} ssh2`;
      const { log, alerts } = ingestLogItem(raw, {
        isSimulated: true,
        sourceIp: ip,
        username: targetUser,
      });
      generatedLogs.push(log);
      generatedAlerts.push(...alerts);
    }
    // Success log
    const successRaw = `Oct 08 21:30:10 kali-victim sshd[29205]: Accepted password for ${targetUser} from ${ip} port 51208 ssh2`;
    const { log: sLog, alerts: sAlerts } = ingestLogItem(successRaw, {
      isSimulated: true,
      sourceIp: ip,
      username: targetUser,
    });
    generatedLogs.push(sLog);
    generatedAlerts.push(...sAlerts);
  } else if (scenario === 'SUDO_PRIVILEGE_ESCALATION') {
    const raw = `Oct 08 21:31:00 kali-victim sudo: ${targetUser} : 3 incorrect password attempts ; TTY=pts/2 ; PWD=/home/${targetUser} ; USER=root ; COMMAND=/bin/bash`;
    const { log, alerts } = ingestLogItem(raw, {
      isSimulated: true,
      sourceIp: attackerIp,
      username: targetUser,
    });
    generatedLogs.push(log);
    generatedAlerts.push(...alerts);
  } else {
    // Single custom failed attempt
    const raw = `Oct 08 21:32:00 kali-victim sshd[29999]: Failed password for ${targetUser} from ${attackerIp} port 49999 ssh2`;
    const { log, alerts } = ingestLogItem(raw, {
      isSimulated: true,
      sourceIp: attackerIp,
      username: targetUser,
    });
    generatedLogs.push(log);
    generatedAlerts.push(...alerts);
  }

  saveStore();

  return res.json({
    success: true,
    scenario,
    logsGeneratedCount: generatedLogs.length,
    alertsTriggeredCount: generatedAlerts.length,
    alerts: generatedAlerts,
  });
});

// 11. Reset State API (for lab exams or fresh testing)
app.post('/api/reset', (req: Request, res: Response) => {
  store = {
    logs: [],
    alerts: [],
    rules: DEFAULT_RULES,
    bannedIps: [],
    agents: {},
  };
  seedInitialData();
  broadcastSse('state_reset', { message: 'Reset performed' });
  return res.json({ success: true, message: 'System state reset to seeded baseline' });
});

// -------------------------------------------------------------
// Vite Dev Server / Static Hosting Middleware
// -------------------------------------------------------------
async function setupVite() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }
}

setupVite().then(() => {
  loadStore();
  app.listen(PORT, () => {
    console.log(`[SOC SIEM SERVER] Running on port ${PORT}`);
    console.log(`[ENDPOINT] Ingestion API: POST http://localhost:${PORT}/api/logs/ingest`);
    console.log(`[ENDPOINT] SSE Live Stream: GET http://localhost:${PORT}/api/stream`);
  });
});

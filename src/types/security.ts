export type SeverityLevel = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'INVESTIGATING' | 'MITIGATED' | 'FALSE_POSITIVE';

export type EventType =
  | 'FAILED_PASSWORD'
  | 'ACCEPTED_PASSWORD'
  | 'INVALID_USER'
  | 'SUDO_FAILURE'
  | 'SUDO_SUCCESS'
  | 'CONNECTION_CLOSED'
  | 'BURST_ATTEMPT'
  | 'UNKNOWN';

export interface GeoLocation {
  country: string;
  countryCode: string;
  city: string;
  flag: string;
  org?: string;
  lat?: number;
  lng?: number;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  service: 'sshd' | 'sudo' | 'vsftpd' | 'apache' | 'systemd-logind' | 'other';
  eventType: EventType;
  username: string;
  sourceIp: string;
  port: number;
  message: string;
  raw: string;
  severity: SeverityLevel;
  geo: GeoLocation;
  agentId?: string;
  isSimulated?: boolean;
}

export interface MitreTechnique {
  id: string;
  name: string;
  url: string;
  tactic: string;
  subtechnique?: string;
  description: string;
  mitigation: string;
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  type: 'BRUTE_FORCE_SSH' | 'PASSWORD_SPRAYING' | 'ACCOUNT_COMPROMISE' | 'SUDO_PRIVILEGE_ABUSE' | 'CONNECTION_FLOOD';
  title: string;
  description: string;
  severity: AlertSeverity;
  sourceIp: string;
  targetedUsernames: string[];
  attemptsCount: number;
  windowSeconds: number;
  mitreTechnique: MitreTechnique;
  status: AlertStatus;
  analystNotes?: string;
  associatedLogIds: string[];
  autoBanned: boolean;
  geo?: GeoLocation;
}

export interface DetectionRule {
  id: string;
  name: string;
  technique: string;
  description: string;
  enabled: boolean;
  threshold: number;
  windowSeconds: number;
  severity: AlertSeverity;
  autoBan: boolean;
  autoBanDurationMinutes: number;
}

export interface BannedIp {
  ip: string;
  bannedAt: string;
  expiresAt: string | null;
  reason: string;
  alertId?: string;
  totalAttempts: number;
  iptablesRule: string;
  ufwRule: string;
  geo?: GeoLocation;
}

export interface AgentNode {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  lastSeen: string;
  status: 'ONLINE' | 'OFFLINE';
  logsShipped: number;
  version: string;
  kernel?: string;
}

export interface SystemStats {
  totalLogs: number;
  failedLogins: number;
  successfulLogins: number;
  activeAlerts: number;
  bannedIpsCount: number;
  activeAgentsCount: number;
  eventsPerSecond: number;
  threatLevel: 'LOW' | 'GUARDED' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  topTargetedUsers: { username: string; count: number }[];
  topAttackingIps: { ip: string; count: number; country: string }[];
}

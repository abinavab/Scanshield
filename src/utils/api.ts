import {
  SecurityLog,
  SecurityAlert,
  DetectionRule,
  BannedIp,
  AgentNode,
  SystemStats,
} from '../types/security.ts';

export async function fetchSystemStats(): Promise<SystemStats> {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchLogs(params?: {
  q?: string;
  service?: string;
  eventType?: string;
  ip?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: SecurityLog[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set('q', params.q);
  if (params?.service) searchParams.set('service', params.service);
  if (params?.eventType) searchParams.set('eventType', params.eventType);
  if (params?.ip) searchParams.set('ip', params.ip);
  if (params?.severity) searchParams.set('severity', params.severity);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const res = await fetch(`/api/logs?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

export async function fetchAlerts(params?: {
  status?: string;
  severity?: string;
}): Promise<{ alerts: SecurityAlert[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.severity) searchParams.set('severity', params.severity);

  const res = await fetch(`/api/alerts?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function updateAlert(
  id: string,
  update: { status?: string; analystNotes?: string }
): Promise<{ success: boolean; alert: SecurityAlert }> {
  const res = await fetch(`/api/alerts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Failed to update alert');
  return res.json();
}

export async function fetchRules(): Promise<{ rules: DetectionRule[] }> {
  const res = await fetch('/api/rules');
  if (!res.ok) throw new Error('Failed to fetch rules');
  return res.json();
}

export async function updateRules(rules: DetectionRule[]): Promise<{ success: boolean; rules: DetectionRule[] }> {
  const res = await fetch('/api/rules', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules }),
  });
  if (!res.ok) throw new Error('Failed to update rules');
  return res.json();
}

export async function fetchBannedIps(): Promise<{ bannedIps: BannedIp[]; total: number }> {
  const res = await fetch('/api/banned-ips');
  if (!res.ok) throw new Error('Failed to fetch banned IPs');
  return res.json();
}

export async function banIpApi(ip: string, reason: string, durationMinutes = 30): Promise<{ success: boolean; bannedIps: BannedIp[] }> {
  const res = await fetch('/api/banned-ips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip, reason, durationMinutes }),
  });
  if (!res.ok) throw new Error('Failed to ban IP');
  return res.json();
}

export async function unbanIpApi(ip: string): Promise<{ success: boolean; bannedIps: BannedIp[] }> {
  const res = await fetch(`/api/banned-ips/${encodeURIComponent(ip)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to unban IP');
  return res.json();
}

export async function fetchAgents(): Promise<{ agents: AgentNode[] }> {
  const res = await fetch('/api/agents');
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}

export async function ingestLogsApi(
  payload: string | Record<string, unknown> | Array<unknown>
): Promise<{ success: boolean; ingestedCount: number; alertsTriggeredCount: number; alerts: SecurityAlert[] }> {
  const res = await fetch('/api/logs/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof payload === 'string' ? JSON.stringify({ raw: payload }) : JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to ingest logs');
  return res.json();
}

export async function triggerSimulation(scenario: string, options?: { targetUser?: string; attackerIp?: string; count?: number }) {
  const res = await fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario, ...options }),
  });
  if (!res.ok) throw new Error('Failed to run simulation');
  return res.json();
}

export async function resetSystemState() {
  const res = await fetch('/api/reset', {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset state');
  return res.json();
}

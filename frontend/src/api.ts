import type { ScheduleResponse, EventResponse, ScoresResponse, Decision, Notification, Event, RegretResponse } from './types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

export async function scheduleNotification(): Promise<ScheduleResponse> {
  return fetchJson('/schedule', { method: 'POST' });
}

export async function sendEvent(notificationId: string, action: 'open' | 'ignore'): Promise<EventResponse> {
  return fetchJson('/event', {
    method: 'POST',
    body: JSON.stringify({ notificationId, action })
  });
}

export async function getScores(): Promise<ScoresResponse> {
  return fetchJson('/scores');
}

export async function getEvents(limit: number = 50): Promise<{ events: Event[] }> {
  return fetchJson(`/events?limit=${limit}`);
}

export async function getLastDecision(): Promise<{ decision: Decision | null; message?: string }> {
  return fetchJson('/decision');
}

export async function getPendingNotification(): Promise<{ notification: (Notification & { bucketLabel: string }) | null }> {
  return fetchJson('/pending');
}

export async function getRegret(limit: number = 50): Promise<RegretResponse> {
  return fetchJson(`/regret?limit=${limit}`);
}

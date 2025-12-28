import { useState, useEffect, useCallback } from 'react';
import { getEvents } from '../api';
import type { Event } from '../types';

interface Props {
  refreshTrigger: number;
}

export function EventLog({ refreshTrigger }: Props) {
  const [events, setEvents] = useState<Event[]>([]);

  const loadEvents = useCallback(async () => {
    try {
      const { events: data } = await getEvents(30);
      setEvents(data);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents, refreshTrigger]);

  const getEventIcon = (type: Event['type']) => {
    switch (type) {
      case 'notification_sent': return '📤';
      case 'notification_opened': return '✅';
      case 'notification_ignored': return '❌';
      default: return '📋';
    }
  };

  const getEventColor = (type: Event['type']) => {
    switch (type) {
      case 'notification_sent': return 'text-neon-cyan';
      case 'notification_opened': return 'text-neon-lime';
      case 'notification_ignored': return 'text-neon-magenta';
      default: return 'text-soft-white';
    }
  };

  const formatReward = (reward: number | null) => {
    if (reward === null) return null;
    if (reward > 0) return `+${reward}`;
    return reward.toString();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatTimeToOpen = (ms: number | null) => {
    if (ms === null) return null;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-slate-deep/80 backdrop-blur-sm border border-slate-mid rounded-xl p-6">
      <h2 className="text-xl font-bold text-neon-lime flex items-center gap-2 mb-4">
        <span className="text-2xl">📜</span>
        Event Log
      </h2>

      {events.length === 0 ? (
        <p className="text-soft-white/50 text-sm text-center py-8">
          No events yet. Schedule and interact with notifications to see the event log.
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-mid scrollbar-track-midnight">
          {events.map(event => (
            <div 
              key={event.id} 
              className="flex items-start gap-3 p-3 bg-midnight/40 rounded-lg border border-slate-mid/50 hover:border-slate-mid transition-colors"
            >
              <span className="text-lg">{getEventIcon(event.type)}</span>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-medium ${getEventColor(event.type)}`}>
                    {event.type.replace('notification_', '').toUpperCase()}
                  </span>
                  <span className="text-soft-white/50 text-xs">•</span>
                  <span className="text-neon-amber text-sm">{event.bucketLabel}</span>
                </div>
                
                <div className="flex items-center gap-3 mt-1 text-xs text-soft-white/50">
                  <span>{formatTime(event.timestamp)}</span>
                  
                  {event.time_to_open_ms !== null && (
                    <>
                      <span>•</span>
                      <span>Response: {formatTimeToOpen(event.time_to_open_ms)}</span>
                    </>
                  )}
                </div>
              </div>
              
              {event.reward !== null && (
                <div className={`px-2 py-1 rounded text-sm font-mono font-bold ${
                  event.reward > 0 
                    ? 'bg-neon-lime/20 text-neon-lime' 
                    : 'bg-neon-magenta/20 text-neon-magenta'
                }`}>
                  {formatReward(event.reward)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


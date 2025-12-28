import { useState, useEffect, useCallback } from 'react';
import { scheduleNotification, sendEvent, getPendingNotification } from '../api';
import type { Notification, ScheduleResponse } from '../types';

interface Props {
  onAction: () => void;
}

export function NotificationPanel({ onAction }: Props) {
  const [notification, setNotification] = useState<(Notification & { bucketLabel?: string }) | null>(null);
  const [lastDecision, setLastDecision] = useState<ScheduleResponse['decision'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const loadPending = useCallback(async () => {
    try {
      const { notification: pending } = await getPendingNotification();
      if (pending) {
        setNotification(pending);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  useEffect(() => {
    if (!notification || notification.status !== 'pending') return;
    
    const interval = setInterval(() => {
      const sentAt = new Date(notification.sent_at).getTime();
      setElapsedTime(Math.floor((Date.now() - sentAt) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [notification]);

  const handleSchedule = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await scheduleNotification();
      setNotification(result.notification);
      setLastDecision(result.decision);
      setElapsedTime(0);
      setMessage({ 
        text: result.decision.explanation, 
        type: result.decision.isExploration ? 'info' : 'success' 
      });
      onAction();
    } catch (err) {
      setMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'open' | 'ignore') => {
    if (!notification) return;
    setLoading(true);
    try {
      const result = await sendEvent(notification.id, action);
      setMessage({ text: result.message, type: action === 'open' ? 'success' : 'info' });
      setNotification(null);
      setLastDecision(null);
      onAction();
    } catch (err) {
      setMessage({ text: (err as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="bg-slate-deep/80 backdrop-blur-sm border border-slate-mid rounded-xl p-6" data-tour="notification-control">
      <h2 className="text-xl font-bold text-neon-cyan mb-4 flex items-center gap-2">
        <span className="text-2xl">📬</span>
        Notification Control
      </h2>

      {notification && notification.status === 'pending' ? (
        <div className="space-y-4">
          <div className="bg-midnight/60 rounded-lg p-4 border border-neon-cyan/30">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-neon-cyan font-semibold">Notification Pending</p>
                <p className="text-soft-white/70 text-sm">
                  Scheduled for: <span className="text-neon-amber font-medium">{notification.bucketLabel}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-soft-white/50 text-xs">Elapsed</p>
                <p className="text-neon-lime font-mono text-lg">{formatTime(elapsedTime)}</p>
              </div>
            </div>
            
            {elapsedTime <= 300 && (
              <p className="text-neon-lime text-xs">
                ⚡ Open now for +2 reward (within 5 min)
              </p>
            )}
            {elapsedTime > 300 && (
              <p className="text-neon-amber text-xs">
                ⏰ Opening now gives +1 reward (delayed)
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleAction('open')}
              disabled={loading}
              className="flex-1 bg-neon-lime/20 hover:bg-neon-lime/30 text-neon-lime border border-neon-lime/50 rounded-lg py-3 px-4 font-semibold transition-all disabled:opacity-50"
            >
              ✓ Open
            </button>
            <button
              onClick={() => handleAction('ignore')}
              disabled={loading}
              className="flex-1 bg-neon-magenta/20 hover:bg-neon-magenta/30 text-neon-magenta border border-neon-magenta/50 rounded-lg py-3 px-4 font-semibold transition-all disabled:opacity-50"
            >
              ✗ Ignore
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-soft-white/60 text-sm">
            No active notification. Schedule one to see the learning system in action.
          </p>
          <button
            onClick={handleSchedule}
            disabled={loading}
            className="w-full bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 rounded-lg py-3 px-4 font-semibold transition-all disabled:opacity-50"
            data-tour="schedule-btn"
          >
            {loading ? '...' : '📅 Schedule Notification'}
          </button>
        </div>
      )}

      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-neon-lime/10 text-neon-lime border border-neon-lime/30' :
          message.type === 'error' ? 'bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/30' :
          'bg-neon-amber/10 text-neon-amber border border-neon-amber/30'
        }`}>
          {message.text}
        </div>
      )}

      {lastDecision && (
        <div className="mt-4 p-3 bg-midnight/40 rounded-lg border border-slate-mid">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-soft-white/50 text-xs uppercase tracking-wider mb-1">Decision Type</p>
              <p className={`font-semibold ${lastDecision.isExploration ? 'text-neon-amber' : 'text-neon-cyan'}`}>
                {lastDecision.isExploration ? '🎲 Exploration' : '🎯 Exploitation'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-soft-white/50 text-xs uppercase tracking-wider mb-1">Confidence</p>
              <p className="text-soft-white font-mono font-semibold">{lastDecision.confidence.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


import { useState, useEffect, useCallback } from 'react';
import { getRegret } from '../api';
import type { RegretResponse } from '../types';

interface Props {
  refreshTrigger: number;
}

export function RegretPanel({ refreshTrigger }: Props) {
  const [data, setData] = useState<RegretResponse | null>(null);

  const loadData = useCallback(async () => {
    try {
      const regretData = await getRegret(30);
      setData(regretData);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  if (!data) {
    return (
      <div className="bg-slate-deep/80 backdrop-blur-sm border border-slate-mid rounded-xl p-6">
        <p className="text-soft-white/50">Loading regret data...</p>
      </div>
    );
  }

  const getTrendIcon = () => {
    switch (data.stats.trendDirection) {
      case 'improving': return '📉';
      case 'degrading': return '📈';
      default: return '➡️';
    }
  };

  const getTrendColor = () => {
    switch (data.stats.trendDirection) {
      case 'improving': return 'text-neon-lime';
      case 'degrading': return 'text-neon-magenta';
      default: return 'text-soft-white/60';
    }
  };

  const maxRegret = data.bestPossibleReward - (-1);

  const recentHistory = data.history.slice(0, 20);
  const chartWidth = 100 / Math.max(recentHistory.length, 1);

  return (
    <div className="bg-slate-deep/80 backdrop-blur-sm border border-slate-mid rounded-xl p-6 space-y-5" data-tour="decision-quality">
      <h2 className="text-xl font-bold text-neon-lime flex items-center gap-2">
        <span className="text-2xl">📊</span>
        Decision Quality
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-midnight/60 rounded-lg p-4 text-center">
          <p className="text-soft-white/50 text-xs uppercase tracking-wider">Avg Regret</p>
          <p className="text-2xl font-mono font-bold text-soft-white">{data.stats.avgRegret.toFixed(2)}</p>
          <p className="text-soft-white/40 text-xs">lower is better</p>
        </div>
        <div className="bg-midnight/60 rounded-lg p-4 text-center">
          <p className="text-soft-white/50 text-xs uppercase tracking-wider">Total Decisions</p>
          <p className="text-2xl font-mono font-bold text-soft-white">{data.stats.totalEntries}</p>
          <p className="text-soft-white/40 text-xs">with feedback</p>
        </div>
        <div className="bg-midnight/60 rounded-lg p-4 text-center">
          <p className="text-soft-white/50 text-xs uppercase tracking-wider">Trend</p>
          <p className={`text-2xl font-mono font-bold ${getTrendColor()}`}>
            {getTrendIcon()} {Math.abs(data.stats.recentTrend).toFixed(0)}%
          </p>
          <p className="text-soft-white/40 text-xs">{data.stats.trendDirection}</p>
        </div>
      </div>

      {recentHistory.length > 0 && (
        <div data-tour="regret-chart">
          <h3 className="text-soft-white/70 text-sm uppercase tracking-wider mb-3">Regret Over Time</h3>
          <div className="bg-midnight/40 rounded-lg p-4">
            <div className="flex items-end h-24 gap-0.5">
              {recentHistory.slice().reverse().map((entry, idx) => {
                const height = (entry.regret / maxRegret) * 100;
                const isRecent = idx >= recentHistory.length - 3;
                return (
                  <div
                    key={entry.id}
                    className="flex-1 flex flex-col justify-end"
                    style={{ width: `${chartWidth}%` }}
                  >
                    <div
                      className={`rounded-t transition-all ${
                        entry.regret === 0 
                          ? 'bg-neon-lime' 
                          : entry.regret <= 1 
                            ? 'bg-neon-amber' 
                            : 'bg-neon-magenta'
                      } ${isRecent ? 'opacity-100' : 'opacity-60'}`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`Regret: ${entry.regret}, Bucket: ${entry.bucketLabel}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-soft-white/40">
              <span>← older</span>
              <span>newer →</span>
            </div>
          </div>
          
          <div className="flex justify-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-neon-lime" />
              <span className="text-soft-white/60">0 (optimal)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-neon-amber" />
              <span className="text-soft-white/60">1 (good)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-neon-magenta" />
              <span className="text-soft-white/60">3 (missed)</span>
            </div>
          </div>
        </div>
      )}

      {recentHistory.length > 0 && (
        <div>
          <h3 className="text-soft-white/70 text-sm uppercase tracking-wider mb-3">Recent Decisions</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentHistory.slice(0, 8).map(entry => (
              <div 
                key={entry.id}
                className="flex items-center justify-between p-2 bg-midnight/40 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    entry.regret === 0 
                      ? 'bg-neon-lime/20 text-neon-lime' 
                      : entry.regret <= 1 
                        ? 'bg-neon-amber/20 text-neon-amber' 
                        : 'bg-neon-magenta/20 text-neon-magenta'
                  }`}>
                    {entry.bucketLabel}
                  </span>
                  <span className="text-soft-white/60">
                    reward: {entry.actual_reward > 0 ? '+' : ''}{entry.actual_reward}
                  </span>
                </div>
                <div className={`font-mono ${
                  entry.regret === 0 
                    ? 'text-neon-lime' 
                    : entry.regret <= 1 
                      ? 'text-neon-amber' 
                      : 'text-neon-magenta'
                }`}>
                  regret: {entry.regret}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentHistory.length === 0 && (
        <div className="p-4 bg-midnight/40 rounded-lg border border-slate-mid text-center">
          <p className="text-soft-white/50 text-sm">
            No regret data yet. Schedule and respond to notifications to see decision quality analysis.
          </p>
        </div>
      )}

      <div className="pt-3 border-t border-slate-mid">
        <p className="text-soft-white/30 text-xs text-center">
          Regret = best possible reward ({data.bestPossibleReward}) − actual reward
        </p>
      </div>
    </div>
  );
}


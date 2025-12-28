import { useState, useEffect, useCallback } from 'react';
import { getScores, getLastDecision } from '../api';
import type { ScoresResponse, Decision } from '../types';

interface Props {
  refreshTrigger: number;
}

export function DebugPanel({ refreshTrigger }: Props) {
  const [scores, setScores] = useState<ScoresResponse | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [scoresData, decisionData] = await Promise.all([
        getScores(),
        getLastDecision()
      ]);
      setScores(scoresData);
      setDecision(decisionData.decision);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  if (!scores) {
    return (
      <div className="bg-slate-deep/80 backdrop-blur-sm border border-slate-mid rounded-xl p-6">
        <p className="text-soft-white/50">Loading...</p>
      </div>
    );
  }

  const maxScore = Math.max(...scores.buckets.map(b => Math.abs(b.score)), 0.1);

  const getBucketStyles = (bucketId: string) => {
    switch (bucketId) {
      case 'morning': return { text: 'text-neon-amber', bg: 'bg-neon-amber' };
      case 'afternoon': return { text: 'text-neon-lime', bg: 'bg-neon-lime' };
      case 'evening': return { text: 'text-neon-magenta', bg: 'bg-neon-magenta' };
      case 'night': return { text: 'text-neon-cyan', bg: 'bg-neon-cyan' };
      default: return { text: 'text-soft-white', bg: 'bg-soft-white' };
    }
  };

  return (
    <div className="bg-slate-deep/80 backdrop-blur-sm border border-slate-mid rounded-xl p-6 space-y-6">
      <h2 className="text-xl font-bold text-neon-magenta flex items-center gap-2">
        <span className="text-2xl">🔬</span>
        Debug Panel
      </h2>

      <div>
        <h3 className="text-soft-white/70 text-sm uppercase tracking-wider mb-3">Bucket Scores</h3>
        <div className="space-y-3">
          {scores.buckets.map(bucket => {
            const width = Math.abs(bucket.score) / maxScore * 100;
            const isPositive = bucket.score >= 0;
            const styles = getBucketStyles(bucket.bucket);
            
            return (
              <div key={bucket.bucket} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={`${styles.text} font-medium`}>{bucket.label}</span>
                  <span className="text-soft-white font-mono">{bucket.score.toFixed(3)}</span>
                </div>
                <div className="h-3 bg-midnight rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isPositive ? styles.bg : 'bg-neon-magenta'} transition-all duration-500`}
                    style={{ 
                      width: `${Math.max(width, 2)}%`,
                      opacity: isPositive ? 0.8 : 0.5
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-soft-white/70 text-sm uppercase tracking-wider mb-3">Open Rate per Bucket</h3>
        <div className="grid grid-cols-2 gap-2">
          {scores.buckets.map(bucket => {
            const styles = getBucketStyles(bucket.bucket);
            return (
              <div key={bucket.bucket} className="bg-midnight/60 rounded-lg p-3">
                <p className={`${styles.text} text-sm font-medium`}>{bucket.label}</p>
                <p className="text-soft-white text-xl font-mono">{bucket.openRate}%</p>
                <p className="text-soft-white/50 text-xs">{bucket.total_opened}/{bucket.total_sent} opened</p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-soft-white/70 text-sm uppercase tracking-wider mb-3">Exploration vs Exploitation</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neon-amber/10 border border-neon-amber/30 rounded-lg p-4 text-center">
            <p className="text-neon-amber text-3xl font-mono font-bold">{scores.totals.explorationCount}</p>
            <p className="text-neon-amber/70 text-sm">🎲 Explorations</p>
          </div>
          <div className="bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg p-4 text-center">
            <p className="text-neon-cyan text-3xl font-mono font-bold">{scores.totals.exploitationCount}</p>
            <p className="text-neon-cyan/70 text-sm">🎯 Exploitations</p>
          </div>
        </div>
        <div className="mt-3 bg-midnight/60 rounded-lg p-3 text-center">
          <p className="text-soft-white/50 text-xs">Overall Open Rate</p>
          <p className="text-soft-white text-2xl font-mono font-bold">{scores.totals.overallOpenRate}%</p>
          <p className="text-soft-white/50 text-xs">{scores.totals.totalOpened}/{scores.totals.totalSent} total</p>
        </div>
      </div>

      {decision && (
        <div>
          <h3 className="text-soft-white/70 text-sm uppercase tracking-wider mb-3">Last Decision Explanation</h3>
          <div className={`p-4 rounded-lg border ${
            decision.is_exploration 
              ? 'bg-neon-amber/10 border-neon-amber/30' 
              : 'bg-neon-cyan/10 border-neon-cyan/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{decision.is_exploration ? '🎲' : '🎯'}</span>
              <span className={`font-semibold ${decision.is_exploration ? 'text-neon-amber' : 'text-neon-cyan'}`}>
                {decision.is_exploration ? 'Exploration' : 'Exploitation'}
              </span>
            </div>
            <p className="text-soft-white/80 text-sm leading-relaxed">{decision.explanation}</p>
          </div>
        </div>
      )}

      {!decision && (
        <div className="p-4 bg-midnight/40 rounded-lg border border-slate-mid text-center">
          <p className="text-soft-white/50 text-sm">No decisions made yet. Schedule a notification to see explanations.</p>
        </div>
      )}
    </div>
  );
}


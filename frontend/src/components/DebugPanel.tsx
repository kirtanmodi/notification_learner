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

  const maxUCB = Math.max(...scores.buckets.map(b => b.ucbScore === 999 ? 0 : b.ucbScore), 0.1);

  const getBucketStyles = (bucketId: string) => {
    switch (bucketId) {
      case 'morning': return { text: 'text-neon-amber', bg: 'bg-neon-amber', border: 'border-neon-amber' };
      case 'afternoon': return { text: 'text-neon-lime', bg: 'bg-neon-lime', border: 'border-neon-lime' };
      case 'evening': return { text: 'text-neon-magenta', bg: 'bg-neon-magenta', border: 'border-neon-magenta' };
      case 'night': return { text: 'text-neon-cyan', bg: 'bg-neon-cyan', border: 'border-neon-cyan' };
      default: return { text: 'text-soft-white', bg: 'bg-soft-white', border: 'border-soft-white' };
    }
  };

  return (
    <div className="bg-slate-deep/80 backdrop-blur-sm border border-slate-mid rounded-xl p-6 space-y-6">
      <h2 className="text-xl font-bold text-neon-magenta flex items-center gap-2">
        <span className="text-2xl">🔬</span>
        Debug Panel
        <span className="text-xs font-normal text-soft-white/50 ml-2">UCB Mode</span>
      </h2>

      <div data-tour="ucb-scores">
        <h3 className="text-soft-white/70 text-sm uppercase tracking-wider mb-3">UCB Scores (Mean + Uncertainty Bonus)</h3>
        <div className="space-y-3">
          {scores.buckets.map(bucket => {
            const width = bucket.ucbScore === 999 ? 100 : (bucket.ucbScore / maxUCB * 100);
            const styles = getBucketStyles(bucket.bucket);
            const isUnexplored = bucket.ucbScore === 999;
            
            return (
              <div key={bucket.bucket} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={`${styles.text} font-medium`}>{bucket.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-soft-white/50 text-xs">
                      μ={(bucket.mean_reward ?? 0).toFixed(2)} + β={bucket.uncertaintyBonus === null ? '∞' : bucket.uncertaintyBonus.toFixed(2)}
                    </span>
                    <span className="text-soft-white font-mono">
                      {isUnexplored ? '∞' : (bucket.ucbScore ?? 0).toFixed(3)}
                    </span>
                  </div>
                </div>
                <div className="h-3 bg-midnight rounded-full overflow-hidden relative">
                  {!isUnexplored && bucket.mean_reward !== 0 && (
                    <div
                      className={`absolute h-full ${styles.bg} opacity-40`}
                      style={{ width: `${Math.max((bucket.mean_reward / maxUCB) * 100, 0)}%` }}
                    />
                  )}
                  <div
                    className={`h-full ${isUnexplored ? 'bg-gradient-to-r from-neon-amber to-neon-magenta animate-pulse' : styles.bg} transition-all duration-500`}
                    style={{ 
                      width: `${Math.max(width, 2)}%`,
                      opacity: 0.8
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-soft-white/40">
                  <span>Confidence: {(bucket.confidence ?? 0).toFixed(1)}%</span>
                  <span>n={bucket.reward_count ?? 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div data-tour="bucket-stats">
        <h3 className="text-soft-white/70 text-sm uppercase tracking-wider mb-3">Bucket Stats</h3>
        <div className="grid grid-cols-2 gap-2">
          {scores.buckets.map(bucket => {
            const styles = getBucketStyles(bucket.bucket);
            return (
              <div key={bucket.bucket} className="bg-midnight/60 rounded-lg p-3">
                <p className={`${styles.text} text-sm font-medium`}>{bucket.label}</p>
                <div className="grid grid-cols-2 gap-x-2 mt-1">
                  <div>
                    <p className="text-soft-white text-lg font-mono">{bucket.openRate}%</p>
                    <p className="text-soft-white/50 text-xs">open rate</p>
                  </div>
                  <div>
                    <p className="text-soft-white text-lg font-mono">{(bucket.confidence ?? 0).toFixed(0)}%</p>
                    <p className="text-soft-white/50 text-xs">confidence</p>
                  </div>
                </div>
                <p className="text-soft-white/40 text-xs mt-1">{bucket.total_opened}/{bucket.total_sent} opened</p>
              </div>
            );
          })}
        </div>
      </div>

      <div data-tour="exploration-exploitation">
        <h3 className="text-soft-white/70 text-sm uppercase tracking-wider mb-3">Exploration vs Exploitation</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neon-amber/10 border border-neon-amber/30 rounded-lg p-4 text-center">
            <p className="text-neon-amber text-3xl font-mono font-bold">{scores.totals.explorationCount}</p>
            <p className="text-neon-amber/70 text-sm">🎲 Explorations</p>
            <p className="text-neon-amber/50 text-xs mt-1">UCB uncertainty-driven</p>
          </div>
          <div className="bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg p-4 text-center">
            <p className="text-neon-cyan text-3xl font-mono font-bold">{scores.totals.exploitationCount}</p>
            <p className="text-neon-cyan/70 text-sm">🎯 Exploitations</p>
            <p className="text-neon-cyan/50 text-xs mt-1">Best mean reward</p>
          </div>
        </div>
        <div className="mt-3 bg-midnight/60 rounded-lg p-3 text-center">
          <p className="text-soft-white/50 text-xs">Overall Open Rate</p>
          <p className="text-soft-white text-2xl font-mono font-bold">{scores.totals.overallOpenRate}%</p>
          <p className="text-soft-white/50 text-xs">{scores.totals.totalOpened}/{scores.totals.totalSent} total</p>
        </div>
      </div>

      {decision && (
        <div data-tour="last-decision">
          <h3 className="text-soft-white/70 text-sm uppercase tracking-wider mb-3">Last Decision</h3>
          <div className={`p-4 rounded-lg border ${
            decision.is_exploration 
              ? 'bg-neon-amber/10 border-neon-amber/30' 
              : 'bg-neon-cyan/10 border-neon-cyan/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{decision.is_exploration ? '🎲' : '🎯'}</span>
                <span className={`font-semibold ${decision.is_exploration ? 'text-neon-amber' : 'text-neon-cyan'}`}>
                  {decision.is_exploration ? 'Exploration' : 'Exploitation'}
                </span>
              </div>
              <span className="text-soft-white/60 text-sm">
                Confidence: {decision.confidence.toFixed(1)}%
              </span>
            </div>
            <p className="text-soft-white/80 text-sm leading-relaxed">{decision.explanation}</p>
            
            <div className="mt-3 pt-3 border-t border-soft-white/10">
              <p className="text-soft-white/50 text-xs mb-2">UCB Scores at Decision Time:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(decision.scores_snapshot).map(([bucket, score]) => {
                  const styles = getBucketStyles(bucket);
                  const isChosen = bucket === decision.bucket;
                  const ucbValue = score?.ucb ?? 0;
                  return (
                    <div 
                      key={bucket} 
                      className={`px-2 py-1 rounded text-xs ${isChosen ? `${styles.bg}/20 ${styles.border} border` : 'bg-midnight/60'}`}
                    >
                      <span className={styles.text}>{bucket}</span>
                      <span className="text-soft-white/60 ml-1">
                        {ucbValue === Infinity || ucbValue >= 999 ? '∞' : ucbValue.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {!decision && (
        <div className="p-4 bg-midnight/40 rounded-lg border border-slate-mid text-center">
          <p className="text-soft-white/50 text-sm">No decisions made yet. Schedule a notification to see explanations.</p>
        </div>
      )}

      <div className="pt-3 border-t border-slate-mid">
        <p className="text-soft-white/30 text-xs text-center">
          UCB formula: score = μ + {scores.config.ucbC} × √(ln(n) / count)
        </p>
      </div>
    </div>
  );
}

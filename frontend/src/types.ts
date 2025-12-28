export type BucketId = 'morning' | 'afternoon' | 'evening' | 'night';

export interface Notification {
  id: string;
  bucket: BucketId;
  bucketLabel?: string;
  sent_at: string;
  opened_at: string | null;
  status: 'pending' | 'opened' | 'ignored';
}

export interface Event {
  id: number;
  type: 'notification_sent' | 'notification_opened' | 'notification_ignored';
  notification_id: string | null;
  bucket: BucketId;
  bucketLabel?: string;
  timestamp: string;
  time_to_open_ms: number | null;
  reward: number | null;
}

export interface UCBScoreBreakdown {
  ucb: number;
  mean: number;
  bonus: number;
}

export interface BucketScore {
  bucket: BucketId;
  label: string;
  score: number;
  mean_reward: number;
  total_reward: number;
  reward_count: number;
  total_sent: number;
  total_opened: number;
  exploration_count: number;
  exploitation_count: number;
  openRate: number;
  confidence: number;
  ucbScore: number;
  uncertaintyBonus: number | null;
  explorationRate: number;
  updated_at: string;
}

export interface ScoresResponse {
  buckets: BucketScore[];
  totals: {
    totalSent: number;
    totalOpened: number;
    explorationCount: number;
    exploitationCount: number;
    totalDecisions: number;
    totalRewardCount: number;
    overallOpenRate: number;
  };
  config: {
    ucbC: number;
    learningRate: number;
    decay: number;
  };
}

export interface Decision {
  id: number;
  notification_id: string;
  bucket: BucketId;
  bucketLabel?: string;
  is_exploration: boolean;
  scores_snapshot: Record<BucketId, UCBScoreBreakdown>;
  confidence: number;
  explanation: string;
  created_at: string;
}

export interface ScheduleResponse {
  notification: Notification;
  decision: {
    id: number;
    bucket: BucketId;
    bucketLabel: string;
    isExploration: boolean;
    confidence: number;
    explanation: string;
    ucbScores: Record<BucketId, UCBScoreBreakdown>;
  };
}

export interface EventResponse {
  event: Event;
  reward: number;
  newScore: number;
  regret: number;
  bucket: BucketId;
  bucketLabel: string;
  timeToOpenMs: number | null;
  message: string;
}

export interface RegretEntry {
  id: number;
  decision_id: number;
  notification_id: string;
  chosen_bucket: BucketId;
  bucketLabel: string;
  ucb_scores: Record<BucketId, number>;
  predicted_best: number;
  actual_reward: number;
  regret: number;
  created_at: string;
}

export interface RegretResponse {
  history: RegretEntry[];
  stats: {
    avgRegret: number;
    totalEntries: number;
    recentTrend: number;
    trendDirection: 'improving' | 'degrading' | 'stable';
  };
  bestPossibleReward: number;
}

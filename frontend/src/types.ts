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

export interface BucketScore {
  bucket: BucketId;
  label: string;
  score: number;
  total_sent: number;
  total_opened: number;
  exploration_count: number;
  exploitation_count: number;
  openRate: number;
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
    overallOpenRate: number;
  };
}

export interface Decision {
  id: number;
  notification_id: string;
  bucket: BucketId;
  bucketLabel?: string;
  is_exploration: boolean;
  scores_snapshot: Record<BucketId, number>;
  explanation: string;
  created_at: string;
}

export interface ScheduleResponse {
  notification: Notification;
  decision: {
    bucket: BucketId;
    bucketLabel: string;
    isExploration: boolean;
    explanation: string;
    scores: Record<BucketId, number>;
  };
}

export interface EventResponse {
  event: Event;
  reward: number;
  newScore: number;
  bucket: BucketId;
  bucketLabel: string;
  timeToOpenMs: number | null;
  message: string;
}


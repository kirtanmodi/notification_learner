import { CONFIG, BucketId } from './config';
import { getScore, updateScore, incrementOpenedCount } from './db';

export function computeReward(
  eventType: 'notification_opened' | 'notification_ignored',
  timeToOpenMs: number | null
): number {
  if (eventType === 'notification_ignored') {
    return CONFIG.REWARDS.IGNORED;
  }
  
  if (eventType === 'notification_opened') {
    if (timeToOpenMs !== null && timeToOpenMs <= CONFIG.QUICK_OPEN_THRESHOLD_MS) {
      return CONFIG.REWARDS.QUICK_OPEN;
    }
    return CONFIG.REWARDS.DELAYED_OPEN;
  }
  
  return 0;
}

export function updateBucketScore(bucket: BucketId, reward: number): number {
  const currentScore = getScore(bucket);
  const newScore = currentScore * CONFIG.DECAY + CONFIG.LEARNING_RATE * reward;
  updateScore(bucket, newScore);
  return newScore;
}

export function processEvent(
  bucket: BucketId,
  eventType: 'notification_opened' | 'notification_ignored',
  timeToOpenMs: number | null
): { reward: number; newScore: number } {
  const reward = computeReward(eventType, timeToOpenMs);
  const newScore = updateBucketScore(bucket, reward);
  
  if (eventType === 'notification_opened') {
    incrementOpenedCount(bucket);
  }
  
  return { reward, newScore };
}


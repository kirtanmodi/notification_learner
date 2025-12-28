import { CONFIG, BucketId } from "./config";
import { getScore, updateScore, incrementOpenedCount, updateBucketStats, getDecisionByNotificationId, createRegretEntry } from "./db";

export function computeReward(eventType: "notification_opened" | "notification_ignored", timeToOpenMs: number | null): number {
  if (eventType === "notification_ignored") {
    return CONFIG.REWARDS.IGNORED;
  }

  if (eventType === "notification_opened") {
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

export function computeRegret(actualReward: number): number {
  const bestPossibleReward = CONFIG.REWARDS.QUICK_OPEN;
  return bestPossibleReward - actualReward;
}

export function processEvent(
  bucket: BucketId,
  eventType: "notification_opened" | "notification_ignored",
  timeToOpenMs: number | null,
  notificationId: string
): { reward: number; newScore: number; regret: number } {
  const reward = computeReward(eventType, timeToOpenMs);
  const newScore = updateBucketScore(bucket, reward);

  updateBucketStats(bucket, reward);

  if (eventType === "notification_opened") {
    incrementOpenedCount(bucket);
  }

  const regret = computeRegret(reward);

  const decision = getDecisionByNotificationId(notificationId);
  if (decision) {
    const ucbScores: Record<BucketId, number> = {} as Record<BucketId, number>;
    for (const [key, value] of Object.entries(decision.scores_snapshot)) {
      ucbScores[key as BucketId] = (value as { ucb: number }).ucb === Infinity ? 999 : (value as { ucb: number }).ucb;
    }

    const predictedBest = Math.max(...Object.values(ucbScores));

    createRegretEntry(decision.id, notificationId, bucket, ucbScores, predictedBest, reward, regret);
  }

  return { reward, newScore, regret };
}

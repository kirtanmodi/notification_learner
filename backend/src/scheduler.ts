import { v4 as uuidv4 } from "uuid";
import { CONFIG, BUCKETS, BucketId } from "./config";
import {
  getAllScores,
  createNotification,
  createEvent,
  incrementSentCount,
  createDecision,
  getTotalDecisions,
  Notification,
  Decision,
  BucketScore,
} from "./db";

interface UCBScoreBreakdown {
  ucb: number;
  mean: number;
  bonus: number;
}

interface ScheduleResult {
  notification: Notification;
  decision: Decision;
}

interface BucketSelection {
  bucket: BucketId;
  isExploration: boolean;
  confidence: number;
  ucbScores: Record<BucketId, UCBScoreBreakdown>;
  explanation: string;
}

function computeUCBScore(stats: BucketScore, totalDecisions: number): UCBScoreBreakdown {
  const mean = stats.mean_reward;
  const count = stats.reward_count;

  if (count === 0) {
    return { ucb: Infinity, mean: 0, bonus: Infinity };
  }

  const bonus = CONFIG.UCB_C * Math.sqrt(Math.log(Math.max(totalDecisions, 1)) / count);
  const ucb = mean + bonus;

  return { ucb, mean, bonus };
}

function selectBucket(): BucketSelection {
  const allStats = getAllScores();
  const totalDecisions = getTotalDecisions();
  const bucketIds = BUCKETS.map((b) => b.id);

  const ucbScores: Record<BucketId, UCBScoreBreakdown> = {} as Record<BucketId, UCBScoreBreakdown>;

  for (const stats of allStats) {
    ucbScores[stats.bucket] = computeUCBScore(stats, totalDecisions);
  }

  let maxUCB = -Infinity;
  let bestBucket: BucketId = bucketIds[0];
  let hasUnexplored = false;

  for (const bucketId of bucketIds) {
    const score = ucbScores[bucketId];
    if (score.ucb === Infinity) {
      hasUnexplored = true;
      bestBucket = bucketId;
      break;
    }
    if (score.ucb > maxUCB) {
      maxUCB = score.ucb;
      bestBucket = bucketId;
    }
  }

  const chosenStats = allStats.find((s) => s.bucket === bestBucket);
  const confidence = totalDecisions > 0 && chosenStats ? (chosenStats.reward_count / totalDecisions) * 100 : 0;

  const isExploration = hasUnexplored || ucbScores[bestBucket].bonus > Math.abs(ucbScores[bestBucket].mean);

  const bucketLabel = BUCKETS.find((b) => b.id === bestBucket)!.label;
  const scoreInfo = ucbScores[bestBucket];

  let explanation: string;
  if (hasUnexplored) {
    explanation = `UCB EXPLORATION: Selected ${bucketLabel.toUpperCase()} because it has no data yet (infinite uncertainty). `;
  } else if (isExploration) {
    explanation = `UCB EXPLORATION: Selected ${bucketLabel.toUpperCase()} due to high uncertainty bonus (${scoreInfo.bonus.toFixed(3)}). `;
  } else {
    explanation = `UCB EXPLOITATION: Selected ${bucketLabel.toUpperCase()} with highest UCB score (${scoreInfo.ucb.toFixed(3)}). `;
  }

  explanation += `Mean=${scoreInfo.mean.toFixed(3)}, Bonus=${
    scoreInfo.bonus === Infinity ? "∞" : scoreInfo.bonus.toFixed(3)
  }, Confidence=${confidence.toFixed(1)}%`;

  return {
    bucket: bestBucket,
    isExploration,
    confidence,
    ucbScores,
    explanation,
  };
}

function formatUCBScores(scores: Record<BucketId, UCBScoreBreakdown>): string {
  return BUCKETS.map((b) => {
    const s = scores[b.id];
    return `${b.label}=${s.ucb === Infinity ? "∞" : s.ucb.toFixed(3)}`;
  }).join(", ");
}

export function scheduleNotification(): ScheduleResult {
  const selection = selectBucket();
  const notificationId = uuidv4();

  const notification = createNotification(notificationId, selection.bucket);

  createEvent("notification_sent", selection.bucket, notificationId, null, null);

  incrementSentCount(selection.bucket, selection.isExploration);

  const decision = createDecision(
    notificationId,
    selection.bucket,
    selection.isExploration,
    selection.ucbScores,
    selection.confidence,
    selection.explanation
  );

  return { notification, decision };
}

export function getUCBScoresMap(): Record<BucketId, number> {
  const allStats = getAllScores();
  const totalDecisions = getTotalDecisions();
  const result: Record<BucketId, number> = {} as Record<BucketId, number>;

  for (const stats of allStats) {
    const score = computeUCBScore(stats, totalDecisions);
    result[stats.bucket] = score.ucb === Infinity ? 999 : score.ucb;
  }

  return result;
}

export function getCurrentBucket(): BucketId {
  const hour = new Date().getHours();

  for (const bucket of BUCKETS) {
    if (bucket.id === "night") {
      if (hour >= 21 || hour < 6) return "night";
    } else {
      if (hour >= bucket.start && hour < bucket.end) return bucket.id;
    }
  }

  return "morning";
}

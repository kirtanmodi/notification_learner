import { v4 as uuidv4 } from 'uuid';
import { CONFIG, BUCKETS, BucketId } from './config';
import { 
  getAllScores, 
  createNotification, 
  createEvent, 
  incrementSentCount,
  createDecision,
  Notification,
  Decision
} from './db';

interface ScheduleResult {
  notification: Notification;
  decision: Decision;
}

interface BucketSelection {
  bucket: BucketId;
  isExploration: boolean;
  explanation: string;
  scoresSnapshot: Record<BucketId, number>;
}

function getScoresMap(): Record<BucketId, number> {
  const scores = getAllScores();
  return scores.reduce((acc, s) => {
    acc[s.bucket] = s.score;
    return acc;
  }, {} as Record<BucketId, number>);
}

function selectBucket(epsilon: number = CONFIG.EPSILON): BucketSelection {
  const scoresSnapshot = getScoresMap();
  const bucketIds = BUCKETS.map(b => b.id);
  
  const isExploration = Math.random() < epsilon;
  
  if (isExploration) {
    const randomIndex = Math.floor(Math.random() * bucketIds.length);
    const selectedBucket = bucketIds[randomIndex];
    const bucketLabel = BUCKETS.find(b => b.id === selectedBucket)!.label;
    
    return {
      bucket: selectedBucket,
      isExploration: true,
      explanation: `EXPLORATION: Randomly selected ${bucketLabel.toUpperCase()} (ε=${epsilon}). Scores were: ${formatScores(scoresSnapshot)}`,
      scoresSnapshot
    };
  }
  
  let maxScore = -Infinity;
  let bestBucket: BucketId = bucketIds[0];
  
  for (const bucketId of bucketIds) {
    const score = scoresSnapshot[bucketId];
    if (score > maxScore) {
      maxScore = score;
      bestBucket = bucketId;
    }
  }
  
  const bucketLabel = BUCKETS.find(b => b.id === bestBucket)!.label;
  
  return {
    bucket: bestBucket,
    isExploration: false,
    explanation: `EXPLOITATION: Selected ${bucketLabel.toUpperCase()} because it has the highest score (${maxScore.toFixed(3)}). Scores: ${formatScores(scoresSnapshot)}`,
    scoresSnapshot
  };
}

function formatScores(scores: Record<BucketId, number>): string {
  return BUCKETS.map(b => `${b.label}=${scores[b.id].toFixed(3)}`).join(', ');
}

export function scheduleNotification(): ScheduleResult {
  const selection = selectBucket();
  const notificationId = uuidv4();
  
  const notification = createNotification(notificationId, selection.bucket);
  
  createEvent('notification_sent', selection.bucket, notificationId, null, null);
  
  incrementSentCount(selection.bucket, selection.isExploration);
  
  const decision = createDecision(
    notificationId,
    selection.bucket,
    selection.isExploration,
    selection.scoresSnapshot,
    selection.explanation
  );
  
  return { notification, decision };
}

export function getCurrentBucket(): BucketId {
  const hour = new Date().getHours();
  
  for (const bucket of BUCKETS) {
    if (bucket.id === 'night') {
      if (hour >= 21 || hour < 6) return 'night';
    } else {
      if (hour >= bucket.start && hour < bucket.end) return bucket.id;
    }
  }
  
  return 'morning';
}


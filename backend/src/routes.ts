import { Router, Request, Response } from 'express';
import { 
  getAllScores, 
  getRecentEvents, 
  getLastDecision,
  getNotification,
  getPendingNotification,
  updateNotificationStatus,
  createEvent,
  getTotalDecisions,
  getRegretHistory,
  getRegretStats
} from './db';
import { processEvent } from './learner';
import { scheduleNotification, getUCBScoresMap } from './scheduler';
import { BUCKETS, CONFIG } from './config';

const router = Router();

router.post('/schedule', (_req: Request, res: Response) => {
  const pending = getPendingNotification();
  if (pending) {
    res.status(400).json({ 
      error: 'A notification is already pending. Please respond to it first.',
      notification: pending
    });
    return;
  }
  
  const result = scheduleNotification();
  const bucket = BUCKETS.find(b => b.id === result.notification.bucket);
  
  res.json({
    notification: result.notification,
    decision: {
      id: result.decision.id,
      bucket: result.decision.bucket,
      bucketLabel: bucket?.label,
      isExploration: result.decision.is_exploration,
      confidence: result.decision.confidence,
      explanation: result.decision.explanation,
      ucbScores: result.decision.scores_snapshot
    }
  });
});

router.post('/event', (req: Request, res: Response) => {
  const { notificationId, action } = req.body;
  
  if (!notificationId || !action) {
    res.status(400).json({ error: 'notificationId and action are required' });
    return;
  }
  
  if (!['open', 'ignore'].includes(action)) {
    res.status(400).json({ error: 'action must be "open" or "ignore"' });
    return;
  }
  
  const notification = getNotification(notificationId);
  if (!notification) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }
  
  if (notification.status !== 'pending') {
    res.status(400).json({ error: 'Notification already processed' });
    return;
  }
  
  const now = new Date();
  const sentAt = new Date(notification.sent_at);
  const timeToOpenMs = action === 'open' ? now.getTime() - sentAt.getTime() : null;
  
  const eventType = action === 'open' ? 'notification_opened' : 'notification_ignored';
  const status = action === 'open' ? 'opened' : 'ignored';
  
  updateNotificationStatus(notificationId, status, action === 'open' ? now.toISOString() : undefined);
  
  const { reward, newScore, regret } = processEvent(notification.bucket, eventType, timeToOpenMs, notificationId);
  
  const event = createEvent(eventType, notification.bucket, notificationId, timeToOpenMs, reward);
  
  const bucket = BUCKETS.find(b => b.id === notification.bucket);
  
  res.json({
    event,
    reward,
    newScore,
    regret,
    bucket: notification.bucket,
    bucketLabel: bucket?.label,
    timeToOpenMs,
    message: `${bucket?.label} bucket score updated: ${newScore.toFixed(3)} (reward: ${reward > 0 ? '+' : ''}${reward}, regret: ${regret.toFixed(1)})`
  });
});

router.get('/scores', (_req: Request, res: Response) => {
  const scores = getAllScores();
  const totalDecisions = getTotalDecisions();
  const ucbScoresMap = getUCBScoresMap();
  
  const enrichedScores = scores.map(s => {
    const bucket = BUCKETS.find(b => b.id === s.bucket);
    const openRate = s.total_sent > 0 ? (s.total_opened / s.total_sent * 100).toFixed(1) : '0.0';
    const confidence = totalDecisions > 0 ? (s.reward_count / totalDecisions * 100) : 0;
    
    const bonus = s.reward_count > 0 
      ? CONFIG.UCB_C * Math.sqrt(Math.log(Math.max(totalDecisions, 1)) / s.reward_count)
      : Infinity;
    
    return {
      ...s,
      label: bucket?.label,
      openRate: parseFloat(openRate),
      confidence: parseFloat(confidence.toFixed(1)),
      ucbScore: ucbScoresMap[s.bucket],
      uncertaintyBonus: bonus === Infinity ? null : parseFloat(bonus.toFixed(3)),
      explorationRate: s.total_sent > 0 
        ? parseFloat((s.exploration_count / s.total_sent * 100).toFixed(1)) 
        : 0
    };
  });
  
  const totals = scores.reduce((acc, s) => ({
    totalSent: acc.totalSent + s.total_sent,
    totalOpened: acc.totalOpened + s.total_opened,
    explorationCount: acc.explorationCount + s.exploration_count,
    exploitationCount: acc.exploitationCount + s.exploitation_count,
    totalRewardCount: acc.totalRewardCount + s.reward_count
  }), { totalSent: 0, totalOpened: 0, explorationCount: 0, exploitationCount: 0, totalRewardCount: 0 });
  
  res.json({
    buckets: enrichedScores,
    totals: {
      ...totals,
      totalDecisions,
      overallOpenRate: totals.totalSent > 0 
        ? parseFloat((totals.totalOpened / totals.totalSent * 100).toFixed(1))
        : 0
    },
    config: {
      ucbC: CONFIG.UCB_C,
      learningRate: CONFIG.LEARNING_RATE,
      decay: CONFIG.DECAY
    }
  });
});

router.get('/events', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const events = getRecentEvents(limit);
  
  const enrichedEvents = events.map(e => {
    const bucket = BUCKETS.find(b => b.id === e.bucket);
    return {
      ...e,
      bucketLabel: bucket?.label
    };
  });
  
  res.json({ events: enrichedEvents });
});

router.get('/decision', (_req: Request, res: Response) => {
  const decision = getLastDecision();
  
  if (!decision) {
    res.json({ 
      decision: null, 
      message: 'No decisions made yet. Schedule a notification first.' 
    });
    return;
  }
  
  const bucket = BUCKETS.find(b => b.id === decision.bucket);
  
  res.json({
    decision: {
      ...decision,
      bucketLabel: bucket?.label
    }
  });
});

router.get('/regret', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const history = getRegretHistory(limit);
  const stats = getRegretStats();
  
  const enrichedHistory = history.map(entry => {
    const bucket = BUCKETS.find(b => b.id === entry.chosen_bucket);
    return {
      ...entry,
      bucketLabel: bucket?.label
    };
  });
  
  res.json({
    history: enrichedHistory,
    stats: {
      avgRegret: parseFloat(stats.avgRegret.toFixed(3)),
      totalEntries: stats.totalEntries,
      recentTrend: parseFloat(stats.recentTrend.toFixed(1)),
      trendDirection: stats.recentTrend < -5 ? 'improving' : stats.recentTrend > 5 ? 'degrading' : 'stable'
    },
    bestPossibleReward: CONFIG.REWARDS.QUICK_OPEN
  });
});

router.get('/pending', (_req: Request, res: Response) => {
  const pending = getPendingNotification();
  
  if (!pending) {
    res.json({ notification: null });
    return;
  }
  
  const bucket = BUCKETS.find(b => b.id === pending.bucket);
  res.json({ 
    notification: {
      ...pending,
      bucketLabel: bucket?.label
    }
  });
});

export default router;

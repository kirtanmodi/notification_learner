import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { BUCKETS, CONFIG, BucketId } from './config';

const dbPath = path.join(__dirname, '..', 'data.db');
const db: DatabaseType = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    bucket TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    opened_at TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    notification_id TEXT,
    bucket TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    time_to_open_ms INTEGER,
    reward REAL,
    FOREIGN KEY (notification_id) REFERENCES notifications(id)
  );

  CREATE TABLE IF NOT EXISTS bucket_scores (
    bucket TEXT PRIMARY KEY,
    score REAL NOT NULL DEFAULT 0,
    total_sent INTEGER NOT NULL DEFAULT 0,
    total_opened INTEGER NOT NULL DEFAULT 0,
    exploration_count INTEGER NOT NULL DEFAULT 0,
    exploitation_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_id TEXT NOT NULL,
    bucket TEXT NOT NULL,
    is_exploration INTEGER NOT NULL,
    scores_snapshot TEXT NOT NULL,
    explanation TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (notification_id) REFERENCES notifications(id)
  );
`);

for (const bucket of BUCKETS) {
  const existing = db.prepare('SELECT bucket FROM bucket_scores WHERE bucket = ?').get(bucket.id);
  if (!existing) {
    db.prepare(`
      INSERT INTO bucket_scores (bucket, score, total_sent, total_opened, exploration_count, exploitation_count, updated_at)
      VALUES (?, ?, 0, 0, 0, 0, ?)
    `).run(bucket.id, CONFIG.INITIAL_SCORE, new Date().toISOString());
  }
}

export interface Notification {
  id: string;
  bucket: BucketId;
  sent_at: string;
  opened_at: string | null;
  status: 'pending' | 'opened' | 'ignored';
}

export interface Event {
  id: number;
  type: 'notification_sent' | 'notification_opened' | 'notification_ignored';
  notification_id: string | null;
  bucket: BucketId;
  timestamp: string;
  time_to_open_ms: number | null;
  reward: number | null;
}

export interface BucketScore {
  bucket: BucketId;
  score: number;
  total_sent: number;
  total_opened: number;
  exploration_count: number;
  exploitation_count: number;
  updated_at: string;
}

export interface Decision {
  id: number;
  notification_id: string;
  bucket: BucketId;
  is_exploration: boolean;
  scores_snapshot: Record<BucketId, number>;
  explanation: string;
  created_at: string;
}

export function createNotification(id: string, bucket: BucketId): Notification {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO notifications (id, bucket, sent_at, status)
    VALUES (?, ?, ?, 'pending')
  `).run(id, bucket, now);
  return { id, bucket, sent_at: now, opened_at: null, status: 'pending' };
}

export function getNotification(id: string): Notification | undefined {
  return db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as Notification | undefined;
}

export function getPendingNotification(): Notification | undefined {
  return db.prepare("SELECT * FROM notifications WHERE status = 'pending' ORDER BY sent_at DESC LIMIT 1").get() as Notification | undefined;
}

export function updateNotificationStatus(id: string, status: 'opened' | 'ignored', openedAt?: string): void {
  if (status === 'opened' && openedAt) {
    db.prepare('UPDATE notifications SET status = ?, opened_at = ? WHERE id = ?').run(status, openedAt, id);
  } else {
    db.prepare('UPDATE notifications SET status = ? WHERE id = ?').run(status, id);
  }
}

export function createEvent(
  type: Event['type'],
  bucket: BucketId,
  notificationId: string | null,
  timeToOpenMs: number | null,
  reward: number | null
): Event {
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO events (type, notification_id, bucket, timestamp, time_to_open_ms, reward)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(type, notificationId, bucket, now, timeToOpenMs, reward);
  return {
    id: result.lastInsertRowid as number,
    type,
    notification_id: notificationId,
    bucket,
    timestamp: now,
    time_to_open_ms: timeToOpenMs,
    reward
  };
}

export function getRecentEvents(limit: number = 50): Event[] {
  return db.prepare('SELECT * FROM events ORDER BY timestamp DESC LIMIT ?').all(limit) as Event[];
}

export function getAllScores(): BucketScore[] {
  return db.prepare('SELECT * FROM bucket_scores ORDER BY bucket').all() as BucketScore[];
}

export function getScore(bucket: BucketId): number {
  const row = db.prepare('SELECT score FROM bucket_scores WHERE bucket = ?').get(bucket) as { score: number } | undefined;
  return row?.score ?? CONFIG.INITIAL_SCORE;
}

export function updateScore(bucket: BucketId, newScore: number): void {
  db.prepare('UPDATE bucket_scores SET score = ?, updated_at = ? WHERE bucket = ?')
    .run(newScore, new Date().toISOString(), bucket);
}

export function incrementSentCount(bucket: BucketId, isExploration: boolean): void {
  if (isExploration) {
    db.prepare('UPDATE bucket_scores SET total_sent = total_sent + 1, exploration_count = exploration_count + 1, updated_at = ? WHERE bucket = ?')
      .run(new Date().toISOString(), bucket);
  } else {
    db.prepare('UPDATE bucket_scores SET total_sent = total_sent + 1, exploitation_count = exploitation_count + 1, updated_at = ? WHERE bucket = ?')
      .run(new Date().toISOString(), bucket);
  }
}

export function incrementOpenedCount(bucket: BucketId): void {
  db.prepare('UPDATE bucket_scores SET total_opened = total_opened + 1, updated_at = ? WHERE bucket = ?')
    .run(new Date().toISOString(), bucket);
}

export function createDecision(
  notificationId: string,
  bucket: BucketId,
  isExploration: boolean,
  scoresSnapshot: Record<BucketId, number>,
  explanation: string
): Decision {
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO decisions (notification_id, bucket, is_exploration, scores_snapshot, explanation, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(notificationId, bucket, isExploration ? 1 : 0, JSON.stringify(scoresSnapshot), explanation, now);
  return {
    id: result.lastInsertRowid as number,
    notification_id: notificationId,
    bucket,
    is_exploration: isExploration,
    scores_snapshot: scoresSnapshot,
    explanation,
    created_at: now
  };
}

export function getLastDecision(): Decision | undefined {
  const row = db.prepare('SELECT * FROM decisions ORDER BY created_at DESC LIMIT 1').get() as {
    id: number;
    notification_id: string;
    bucket: BucketId;
    is_exploration: number;
    scores_snapshot: string;
    explanation: string;
    created_at: string;
  } | undefined;
  
  if (!row) return undefined;
  
  return {
    ...row,
    is_exploration: row.is_exploration === 1,
    scores_snapshot: JSON.parse(row.scores_snapshot)
  };
}

export default db;


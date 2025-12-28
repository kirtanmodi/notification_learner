export const CONFIG = {
  UCB_C: 1.5,
  LEARNING_RATE: 0.1,
  DECAY: 0.95,
  INITIAL_SCORE: 0,
  QUICK_OPEN_THRESHOLD_MS: 5 * 60 * 1000,
  REWARDS: {
    QUICK_OPEN: 2,
    DELAYED_OPEN: 1,
    IGNORED: -1,
  },
};

export const BUCKETS = [
  { id: "morning", label: "Morning", start: 6, end: 11 },
  { id: "afternoon", label: "Afternoon", start: 11, end: 16 },
  { id: "evening", label: "Evening", start: 16, end: 21 },
  { id: "night", label: "Night", start: 21, end: 6 },
] as const;

export type BucketId = (typeof BUCKETS)[number]["id"];

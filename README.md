# Smart Notification Scheduler

An online learning system that discovers optimal notification timing using **UCB (Upper Confidence Bound)** — a principled exploration algorithm that balances exploitation with uncertainty-driven exploration.

## Quick Start

```bash
# Terminal 1: Start backend
cd backend
npm install
npm run dev

# Terminal 2: Start frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and click **"Start Demo"** for a guided tour.

---

## How It Works

### Learning Loop

```
1. UCB score computed for each bucket
   ↓
2. Highest UCB bucket selected
   ↓
3. Notification sent, confidence logged
   ↓
4. User responds (open or ignore)
   ↓
5. Reward computed, regret calculated
   ↓
6. Mean reward & count updated
   ↓
7. Future UCB scores reflect new data
```

### Time Buckets

| Bucket    | Hours   |
|-----------|---------|
| Morning   | 6–11    |
| Afternoon | 11–16   |
| Evening   | 16–21   |
| Night     | 21–6    |

---

## The Math

### UCB Formula

```
UCB Score = μ + c × √(ln(N) / n)
```

| Symbol | Meaning | Location |
|--------|---------|----------|
| **μ** | Mean reward for this bucket | `stats.mean_reward` |
| **c** | Exploration coefficient (1.5) | `CONFIG.UCB_C` |
| **N** | Total decisions made | `getTotalDecisions()` |
| **n** | Times this bucket got feedback | `stats.reward_count` |

**Code location:** `backend/src/scheduler.ts` lines 34-46

```typescript
function computeUCBScore(stats, totalDecisions) {
  const mean = stats.mean_reward;
  const count = stats.reward_count;

  if (count === 0) {
    return { ucb: Infinity, mean: 0, bonus: Infinity };
  }

  const bonus = CONFIG.UCB_C * Math.sqrt(Math.log(totalDecisions) / count);
  const ucb = mean + bonus;

  return { ucb, mean, bonus };
}
```

### Why UCB Works

```
UCB = Exploitation (μ) + Exploration (β)
      └── "what worked"   └── "what's uncertain"
```

- **High mean, low count** → moderate UCB (good but uncertain)
- **High mean, high count** → high UCB (proven winner)
- **Low mean, low count** → moderate UCB (still worth trying)
- **Zero count** → infinite UCB (must explore)

### Uncertainty Bonus Decay

| n (times chosen) | β (bonus) |
|------------------|-----------|
| 1 | 3.22 |
| 5 | 1.44 |
| 10 | 1.02 |
| 50 | 0.46 |

As you collect more data, uncertainty shrinks → system converges on best bucket.

---

## Reward System

### Reward Values

| User Action           | Reward | Regret |
|-----------------------|--------|--------|
| Opened within 5 min   | +2     | 0 |
| Opened later          | +1     | 1 |
| Ignored               | -1     | 3 |

**Code location:** `backend/src/learner.ts`

```typescript
function computeReward(eventType, timeToOpenMs) {
  if (eventType === 'notification_ignored') return -1;
  if (timeToOpenMs <= 5 * 60 * 1000) return +2;  // Quick open
  return +1;  // Delayed open
}
```

### Mean Reward Update

```typescript
total_reward = old_total + new_reward
reward_count = old_count + 1
mean_reward = total_reward / reward_count
```

---

## Confidence & Regret

### Confidence

```
Confidence = (n / N) × 100%
```

Shows how much of your data comes from this bucket. Higher = more certain about the mean.

### Regret

```
Regret = Best Possible Reward - Actual Reward
       = 2 - actual_reward
```

Tracks decision quality over time:
- **Avg regret decreasing** → system is learning
- **Avg regret stable at 0** → optimal performance
- **Avg regret increasing** → user behavior changed

---

## API Reference

| Endpoint        | Method | Description                          |
|-----------------|--------|--------------------------------------|
| `/api/schedule` | POST   | Schedule next notification           |
| `/api/event`    | POST   | Log user action (open/ignore)        |
| `/api/scores`   | GET    | Get bucket stats + UCB breakdown     |
| `/api/events`   | GET    | Get recent events                    |
| `/api/decision` | GET    | Get last decision with explanation   |
| `/api/regret`   | GET    | Get regret history and stats         |
| `/api/pending`  | GET    | Get currently pending notification   |

---

## Architecture

```
frontend/
├── src/
│   ├── components/
│   │   ├── NotificationPanel.tsx   # Schedule & respond to notifications
│   │   ├── DebugPanel.tsx          # UCB scores, bucket stats
│   │   ├── RegretPanel.tsx         # Decision quality tracking
│   │   └── EventLog.tsx            # Event history
│   ├── hooks/
│   │   └── useTour.ts              # Interactive demo tour
│   ├── api.ts                      # API client
│   └── types.ts                    # TypeScript interfaces

backend/
├── src/
│   ├── config.ts      # UCB_C, rewards, bucket definitions
│   ├── db.ts          # SQLite schema, CRUD operations
│   ├── learner.ts     # Reward computation, regret tracking
│   ├── scheduler.ts   # UCB calculation, bucket selection
│   ├── routes.ts      # Express API endpoints
│   └── index.ts       # Server entry point
└── data.db            # SQLite database
```

---

## Configuration

Edit `backend/src/config.ts` to tune:

```typescript
CONFIG = {
  UCB_C: 1.5,                  // Exploration coefficient (higher = more exploration)
  LEARNING_RATE: 0.1,          // Score update speed
  DECAY: 0.95,                 // Score decay factor
  QUICK_OPEN_THRESHOLD_MS: 300000,  // 5 minutes
  REWARDS: {
    QUICK_OPEN: 2,
    DELAYED_OPEN: 1,
    IGNORED: -1
  }
}
```

### Tuning UCB_C

| Value | Behavior |
|-------|----------|
| 0.5 | Aggressive exploitation, minimal exploration |
| 1.5 | Balanced (default) |
| 3.0 | Heavy exploration, slower convergence |

---

## Key Concepts

| Concept | What It Means |
|---------|---------------|
| **UCB** | Score = mean + uncertainty bonus |
| **Exploration** | Trying uncertain options to learn |
| **Exploitation** | Using known-good options |
| **Regret** | Gap between optimal and actual outcome |
| **Confidence** | Data volume for a bucket |
| **Mean Reward** | Average outcome for a bucket |

---

## Further Reading

- [UCB1 Algorithm](https://en.wikipedia.org/wiki/Thompson_sampling#Upper_confidence_bounds)
- [Multi-Armed Bandits](https://en.wikipedia.org/wiki/Multi-armed_bandit)
- [Regret in Online Learning](https://en.wikipedia.org/wiki/Regret_(decision_theory))

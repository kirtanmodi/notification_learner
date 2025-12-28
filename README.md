# Smart Notification Scheduler

An online learning system that discovers optimal notification timing using ε-greedy exploration.

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

Then open http://localhost:5173

## How It Works

### Learning Loop

```
1. Scheduler selects time bucket (ε-greedy)
   ↓
2. Notification sent to user
   ↓
3. User responds (open or ignore)
   ↓
4. Reward computed from response
   ↓
5. Bucket score updated incrementally
   ↓
6. Future schedules favor higher-scoring buckets
```

### Time Buckets

| Bucket    | Hours   |
|-----------|---------|
| Morning   | 6–11    |
| Afternoon | 11–16   |
| Evening   | 16–21   |
| Night     | 21–6    |

### Reward Logic

| User Action           | Reward |
|-----------------------|--------|
| Opened within 5 min   | +2     |
| Opened later          | +1     |
| Ignored               | -1     |

### Exploration Strategy (ε-greedy)

- With probability ε (20%): Random bucket selection (exploration)
- Otherwise (80%): Highest-scoring bucket (exploitation)

This ensures the system:
- Never stops exploring entirely
- Primarily exploits learned preferences
- Can recover if preferences change

### Score Update Rule

```
score_new = score_old × decay + learning_rate × reward
```

Where:
- `decay = 0.95` (gradual forgetting of old data)
- `learning_rate = 0.1` (how fast new rewards affect score)

### Why Decisions Change Over Time

1. **Initial state**: All buckets have equal scores (0)
2. **Early phase**: High exploration, random decisions
3. **Learning phase**: Patterns emerge as buckets accumulate rewards
4. **Steady state**: Dominant bucket gets most traffic, but exploration continues
5. **Adaptation**: If user behavior changes, scores gradually adjust via decay

## API Reference

| Endpoint        | Method | Description                          |
|-----------------|--------|--------------------------------------|
| `/api/schedule` | POST   | Schedule next notification           |
| `/api/event`    | POST   | Log user action (open/ignore)        |
| `/api/scores`   | GET    | Get all bucket scores and stats      |
| `/api/events`   | GET    | Get recent events                    |
| `/api/decision` | GET    | Get last scheduling decision details |
| `/api/pending`  | GET    | Get currently pending notification   |

## Architecture

```
frontend/          React + Vite + Tailwind
backend/
├── src/
│   ├── config.ts      # Constants and bucket definitions
│   ├── db.ts          # SQLite schema and queries
│   ├── learner.ts     # Reward computation, score updates
│   ├── scheduler.ts   # ε-greedy bucket selection
│   ├── routes.ts      # Express API endpoints
│   └── index.ts       # Server entry point
└── data.db            # SQLite database (created on first run)
```

## Configuration

Edit `backend/src/config.ts` to tune:

```typescript
CONFIG = {
  EPSILON: 0.2,              // Exploration probability
  LEARNING_RATE: 0.1,        // Update speed
  DECAY: 0.95,               // Score decay factor
  QUICK_OPEN_THRESHOLD_MS: 300000,  // 5 minutes
  REWARDS: {
    QUICK_OPEN: 2,
    DELAYED_OPEN: 1,
    IGNORED: -1
  }
}
```


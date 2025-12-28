import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function startTour() {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayColor: "rgba(0, 0, 0, 0.75)",
    stagePadding: 8,
    popoverClass: "tour-popover",
    steps: [
      {
        element: "[data-tour='header']",
        popover: {
          title: "🎯 Smart Notification Scheduler",
          description:
            "This app learns the BEST time to send you notifications using UCB (Upper Confidence Bound) — a principled exploration algorithm used in real ML systems.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[data-tour='notification-control']",
        popover: {
          title: "📬 Notification Control",
          description:
            "Click 'Schedule Notification' to simulate sending a notification. The system picks a time bucket (Morning/Afternoon/Evening/Night) using UCB scoring.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "[data-tour='schedule-btn']",
        popover: {
          title: "▶️ Start Here",
          description:
            "Click this button to schedule a notification. The system will pick the bucket with the highest UCB score (mean reward + uncertainty bonus).",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[data-tour='ucb-scores']",
        popover: {
          title: "📊 UCB Scores",
          description:
            "Each bucket has a UCB score = μ (mean reward) + β (uncertainty bonus). New buckets get ∞ score to encourage exploration. As data accumulates, uncertainty shrinks.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "[data-tour='bucket-stats']",
        popover: {
          title: "📈 Bucket Statistics",
          description:
            "Open rate shows how often you open notifications for each bucket. Confidence shows how much data we have (higher = more certain about our estimates).",
          side: "left",
          align: "start",
        },
      },
      {
        element: "[data-tour='exploration-exploitation']",
        popover: {
          title: "🎲 Exploration vs 🎯 Exploitation",
          description:
            "Exploration = trying uncertain buckets to learn more. Exploitation = using the best-known bucket. UCB balances both automatically — no random ε needed!",
          side: "left",
          align: "start",
        },
      },
      {
        element: "[data-tour='decision-quality']",
        popover: {
          title: "📊 Decision Quality (Regret)",
          description:
            "Regret = best possible reward (2) minus actual reward. Lower is better. The trend shows if the system is improving over time.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "[data-tour='regret-chart']",
        popover: {
          title: "📉 Regret Over Time",
          description:
            "Green bars = 0 regret (optimal decisions). Yellow = small regret. Pink = missed opportunities. Watch this improve as the system learns!",
          side: "right",
          align: "center",
        },
      },
      {
        element: "[data-tour='event-log']",
        popover: {
          title: "📜 Event Log",
          description:
            "Every notification sent, opened, or ignored is logged here. Rewards: +2 for quick open (<5min), +1 for delayed open, -1 for ignore.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "[data-tour='last-decision']",
        popover: {
          title: "🔍 Decision Explanation",
          description:
            "Every decision is explainable! See exactly why the system chose a particular bucket, with UCB scores at decision time.",
          side: "left",
          align: "start",
        },
      },
      {
        popover: {
          title: "🚀 Try It Yourself!",
          description:
            "1. Schedule a notification\n2. Open or Ignore it\n3. Watch the UCB scores update\n4. See regret decrease as the system learns\n\nThe goal: minimize regret by finding the best notification time!",
        },
      },
    ],
  });

  driverObj.drive();
}


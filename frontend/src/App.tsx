import { useState } from 'react';
import { NotificationPanel } from './components/NotificationPanel';
import { DebugPanel } from './components/DebugPanel';
import { EventLog } from './components/EventLog';
import { RegretPanel } from './components/RegretPanel';
import { startTour } from './hooks/useTour';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAction = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <header className="mb-8 text-center" data-tour="header">
        <div className="flex items-center justify-center gap-4 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-lime bg-clip-text text-transparent">
            Smart Notification Scheduler
          </h1>
          <button
            onClick={startTour}
            className="px-4 py-2 bg-neon-magenta/20 hover:bg-neon-magenta/30 text-neon-magenta border border-neon-magenta/50 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <span>🎓</span>
            Start Demo
          </button>
        </div>
        <p className="text-soft-white/60 text-sm md:text-base">
          UCB-based online learning • Confidence-aware decisions • Regret tracking
        </p>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <NotificationPanel onAction={handleAction} />
          <RegretPanel refreshTrigger={refreshTrigger} />
          <EventLog refreshTrigger={refreshTrigger} />
        </div>
        
        <div className="lg:col-span-2">
          <DebugPanel refreshTrigger={refreshTrigger} />
        </div>
      </div>

      <footer className="mt-12 text-center text-soft-white/30 text-xs">
        <p>UCB: c = 1.5 • Learning Rate = 0.1 • Decay = 0.95</p>
        <p className="mt-1">Quick open (&lt;5min) = +2 reward • Delayed open = +1 • Ignore = -1</p>
      </footer>
    </div>
  );
}

export default App;

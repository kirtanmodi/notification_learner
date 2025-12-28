import { useState } from 'react';
import { NotificationPanel } from './components/NotificationPanel';
import { DebugPanel } from './components/DebugPanel';
import { EventLog } from './components/EventLog';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAction = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-lime bg-clip-text text-transparent">
          Smart Notification Scheduler
        </h1>
        <p className="text-soft-white/60 mt-2 text-sm md:text-base">
          Online learning with ε-greedy exploration • Watch the system learn your preferences
        </p>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <NotificationPanel onAction={handleAction} />
          <EventLog refreshTrigger={refreshTrigger} />
        </div>
        
        <div className="lg:col-span-2">
          <DebugPanel refreshTrigger={refreshTrigger} />
        </div>
      </div>

      <footer className="mt-12 text-center text-soft-white/30 text-xs">
        <p>ε = 0.2 (20% exploration) • Learning Rate = 0.1 • Decay = 0.95</p>
        <p className="mt-1">Quick open (&lt;5min) = +2 reward • Delayed open = +1 • Ignore = -1</p>
      </footer>
    </div>
  );
}

export default App;

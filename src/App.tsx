import { Dashboard } from './components/ui/Dashboard';
import { Background } from './components/ui/Background';
import { TestDashboard } from './components/ui/TestDashboard';
import { ExperimentMap } from './components/ui/ExperimentMap';

const path = window.location.pathname.replace(/\/$/, '');

export function App() {
  if (path === '/experiment/map') {
    return <ExperimentMap />;
  }

  return (
    <div className="relative min-h-screen bg-void-black overflow-y-auto">
      <Background />
      <TestDashboard />
      <Dashboard />
    </div>
  );
}
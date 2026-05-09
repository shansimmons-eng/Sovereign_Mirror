import { Dashboard } from './components/ui/Dashboard';
import { Background } from './components/ui/Background';
import { TestDashboard } from './components/ui/TestDashboard';

export function App() {
  return (
    <div className="relative min-h-screen bg-dawn-obsidian overflow-hidden">
      <Background />
      <TestDashboard />
      <Dashboard />
    </div>
  );
}
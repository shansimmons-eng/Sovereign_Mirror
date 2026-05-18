import { Dashboard } from './components/ui/Dashboard';
import { Background } from './components/ui/Background';

export function App() {
  return (
    <div className="relative min-h-screen h-screen bg-void-black overflow-hidden">
      <Background />
      <Dashboard />
    </div>
  );
}
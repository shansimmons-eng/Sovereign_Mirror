import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ModuleRouter } from './router/ModuleRouter';
import './index.css';

// Expose API base for training session hooks before any module mounts
window.__kylosApiBase = window.kylosTraining?.apiBase ?? '';

const pillarId = window.kylosTraining?.pillarId ?? '1';
const container = document.getElementById('kylos-training-root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <ModuleRouter pillarId={pillarId} />
    </StrictMode>
  );
}

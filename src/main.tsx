import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { layoutReport } from './lib/diagnostics';
// Self-hosted variable font (Cyrillic + Latin subsets) — no external requests, works offline.
import '@fontsource-variable/manrope';
import './styles.css';

// Замер вёрстки доступен и из консоли: на телефоне его удобнее звать так, чем
// выделять текст в настройках. Ничего не рисует и ничего не отправляет.
(window as unknown as { deeptrackerLayout?: () => string }).deeptrackerLayout = layoutReport;

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Offline shell. Only in production builds over http(s) — file:// cannot register a worker.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch(() => {
      /* offline mode simply stays unavailable */
    });
  });
}

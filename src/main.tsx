import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Serwist Service Worker 등록
async function registerSW() {
  if ('serviceWorker' in navigator) {
    const { getSerwist } = await import('virtual:serwist');
    const serwist = await getSerwist();
    serwist?.register();
  }
}
registerSW();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Limpar caches antigos e Service Workers com proteção contra falhas em iframes/sandboxes
if (typeof window !== "undefined") {
  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().catch(() => {});
          });
        })
        .catch(() => {});
    }
  } catch {
    // Silently ignore serviceWorker sandbox restrictions
  }

  try {
    if ("caches" in window) {
      caches.keys()
        .then((names) => {
          names.forEach((name) => {
            caches.delete(name).catch(() => {});
          });
        })
        .catch(() => {});
    }
  } catch {
    // Silently ignore cache sandbox restrictions
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

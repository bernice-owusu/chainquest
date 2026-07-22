import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/Toast.tsx';
import './index.css';

// Suppress benign Vite HMR WebSocket errors in the sandboxed preview environment
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (
    reason &&
    (reason.message?.includes('WebSocket') ||
      reason.message?.includes('websocket') ||
      String(reason).includes('WebSocket') ||
      String(reason).includes('websocket'))
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  if (
    event.message?.includes('WebSocket') ||
    event.message?.includes('websocket')
  ) {
    event.preventDefault();
  }
});

// Register Service Worker for offline capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('ServiceWorker registered successfully:', reg.scope);
    }).catch((err) => {
      console.log('ServiceWorker registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);



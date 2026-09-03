import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Prevent Vite dev server stacktrace formatter crash on WebAssembly/blob frames
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (!event.filename || event.filename.includes('blob:') || event.filename.includes('wasm')) {
      event.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('unhandledrejection', (event) => {
    event.stopImmediatePropagation();
  }, true);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

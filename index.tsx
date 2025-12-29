import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Critical: Could not find root element to mount the ERP suite.");
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("PrismERP: Module system successfully mounted.");
  } catch (err) {
    console.error("PrismERP: Failed to initialize application tree:", err);
    rootElement.innerHTML = `
      <div style="height: 100vh; display: flex; flex-direction: column; items-center; justify-content: center; background: #0f172a; color: white; font-family: sans-serif; text-align: center; padding: 20px;">
        <h1 style="color: #ef4444;">System Boot Error</h1>
        <p style="color: #94a3b8; max-width: 500px; margin: 20px auto;">The ERP suite encountered a fatal error during initialization. This is usually due to a module resolution failure or a browser incompatibility.</p>
        <pre style="background: #1e293b; padding: 15px; border-radius: 8px; font-size: 12px; color: #f8fafc; text-align: left; overflow: auto; max-width: 90%;">${err instanceof Error ? err.stack || err.message : 'Unknown Error'}</pre>
        <button onclick="window.location.reload()" style="margin-top: 30px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Retry Bootstrap</button>
      </div>
    `;
  }
}
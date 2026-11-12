import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

window.onerror = function(message, source, lineno, colno, error) {
  const stack = error && error.stack ? error.stack : new Error().stack;
  console.error('[CRITICAL RENDERER ERROR]:', message, '\nSource:', source, '\nLine:', lineno, '\nCol:', colno, '\nStack:', stack);
};

window.onunhandledrejection = function(event) {
  const reason = event.reason;
  const stack = reason && reason.stack ? reason.stack : 'No stack';
  console.error('[CRITICAL RENDERER REJECTION]:', reason, '\nStack:', stack);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)


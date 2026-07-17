import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'

import * as tf from '@tensorflow/tfjs';

// Initialize WebGL backend explicitly for performance before mounting
const initApp = async () => {
  try {
    await tf.setBackend('webgl');
    await tf.ready();
    console.log('TF.js WebGL backend initialized successfully.');
  } catch (err) {
    console.warn('WebGL initialization failed, falling back to CPU', err);
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
};

initApp();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) =>
      console.error('SW registration failed:', err)
    );
  });
}

import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize theme before React renders to avoid FOUC
(() => {
  try {
    const storedTheme = localStorage.getItem('app-theme') || 'auto';
    const storedAccentColor = localStorage.getItem('app-accent-color') || '#3B82F6';
    
    // Apply accent color
    document.documentElement.style.setProperty('--accent-color', storedAccentColor);
    
    // Apply theme
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = storedTheme === 'dark' || (storedTheme === 'auto' && systemPrefersDark);
    const root = document.documentElement;
    if (shouldUseDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  } catch (_) {
    // no-op if storage is unavailable
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

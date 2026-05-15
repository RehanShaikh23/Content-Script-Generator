import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './landing-base.css';
import './landing-sections.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

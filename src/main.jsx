// App entry: load styles, set the brand color, and start React.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { LanguageProvider } from './i18n';
import { config } from './config';

// Make the brand color from config.js available to Tailwind (bg-brand, text-brand…).
document.documentElement.style.setProperty('--brand', config.brandColor);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);

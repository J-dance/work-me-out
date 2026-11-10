import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Ask the browser not to auto-clear our storage (saved workouts + offline caches) when space runs low.
// Chrome decides silently (installed apps are usually granted); Safari may ignore it. Harmless either way.
void navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

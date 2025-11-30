import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App'
import Notifications from './components/Notifications'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Notifications />
  </StrictMode>,
)

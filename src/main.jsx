import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/anton/400.css'
import '@fontsource-variable/inter'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './styles/tokens.css'
import './styles/global.css'
import './styles/immersion.css'
import './styles/briefing.css'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { GateProvider } from './components/gate/GateProvider'
import { MessageProvider } from './components/immersion/MessageProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <GateProvider>
          <MessageProvider>
            <App />
          </MessageProvider>
        </GateProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)

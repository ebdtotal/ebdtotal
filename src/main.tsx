import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { FalhaTela } from './components/FalhaTela.tsx'
import { deveEnquadrarIphone, IphoneShell, IphoneViewport } from './components/IphoneShell.tsx'
import App from './App.tsx'
import { ehAppNativo, iniciarAppNativo } from './lib/native.ts'
import { StoreProvider } from './lib/store.tsx'
import './index.css'

void iniciarAppNativo()

const enquadrar = deveEnquadrarIphone()
const Router = ehAppNativo() ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {enquadrar ? (
      <IphoneShell />
    ) : (
      <IphoneViewport>
        <FalhaTela>
          <StoreProvider>
            <Router>
              <App />
            </Router>
          </StoreProvider>
        </FalhaTela>
      </IphoneViewport>
    )}
  </StrictMode>,
)

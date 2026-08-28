import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { deveEnquadrarIphone, IphoneShell, IphoneViewport } from './components/IphoneShell.tsx'
import App from './App.tsx'
import { iniciarAppNativo } from './lib/native.ts'
import { StoreProvider } from './lib/store.tsx'
import './index.css'

void iniciarAppNativo()

const enquadrar = deveEnquadrarIphone()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {enquadrar ? (
      <IphoneShell />
    ) : (
      <IphoneViewport>
        <StoreProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </StoreProvider>
      </IphoneViewport>
    )}
  </StrictMode>,
)

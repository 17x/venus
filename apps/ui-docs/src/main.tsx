import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {Toaster, TooltipProvider} from '@venus/ui'
import {App} from './App.tsx'
import './index.css'

const root = document.getElementById('root')
if (!root) {
  throw new Error('UI docs root element is missing')
}

createRoot(root).render(
  <StrictMode>
    <TooltipProvider>
      <App/>
      <Toaster position={'bottom-right'}/>
    </TooltipProvider>
  </StrictMode>,
)

import './components/comp.css'
import './i18n/config.ts'
import AppProvider from './contexts/appContext/AppProvider.tsx'
import UIProvider from './contexts/UIContext/UIProvider.tsx'
import LiteUIProvider from '@lite-u/ui/LiteUIProvider'

function App() {
  return <LiteUIProvider>
    <UIProvider>
      <AppProvider/>
    </UIProvider>
  </LiteUIProvider>
}

export default App

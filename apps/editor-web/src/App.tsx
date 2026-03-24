import './components/comp.css'
import './i18n/config.ts'
// import LiteUIProvider from '@lite-u/ui/LiteUIProvider'
import {Col, LiteUIProvider, Row} from '@lite-u/ui'
import LanguageSwitcher from './components/language/languageSwitcher.tsx'
import AppBody from './appBody.tsx'
import MenuBar from './components/header/menu/Menu.tsx'

function App() {
  return <LiteUIProvider>
    <Col fw fh className={'select-none'}>
      {/*header*/}
      <Row jc>
        <MenuBar/>
        <LanguageSwitcher/>
      </Row>
      <AppBody/>
    </Col>
  </LiteUIProvider>
}

export default App

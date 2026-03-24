import {useTranslation} from 'react-i18next'
import {useState} from 'react'
import Select from '@lite-u/ui/select'
import SelectItem from '@lite-u/ui/selectItem'
import {Con, Row} from '@lite-u/ui'

type LanguageCode = 'en' | 'cn' | 'jp'

const LanguageSwitcher: React.FC = () => {
  const [language, setLanguage] = useState<LanguageCode>('en')
  const languageRecord: Record<LanguageCode, string> = {
    'en': 'English',
    'cn': '中文',
    'jp': '日本語',
  }

  const {i18n} = useTranslation()

  return <Row center je mr={30} className="text-sm select-none">
    <Con rela w={100}>
      <Select placeholderResolver={(value) => {
        // console.log(value)
        return '🌐 ' + languageRecord[value as LanguageCode]
      }} style={{border: 'none'}} selectValue={language} onSelectChange={(langCode) => {
        i18n.changeLanguage(langCode as LanguageCode)
        setLanguage(langCode as LanguageCode)
      }}>
        {
          (Object.keys(languageRecord) as LanguageCode[]).map((langCode, index) => {
            return <SelectItem key={index} value={langCode}>{languageRecord[langCode]}</SelectItem>
          })
        }
      </Select>
    </Con>
  </Row>
}

export default LanguageSwitcher
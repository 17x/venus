import {FC, InputHTMLAttributes} from 'react'

export const ProtectedInput: FC<InputHTMLAttributes<HTMLInputElement>> = (props) => {

  return <input {...props}
                onKeyDown={e => {
                  e.stopPropagation()
                }}
                onPaste={e => {
                  e.stopPropagation()
                }}
                onKeyUp={e => {
                  console.log(9)
                  e.stopPropagation()
                }}
  />
}
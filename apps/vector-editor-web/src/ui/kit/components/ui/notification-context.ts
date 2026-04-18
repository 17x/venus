import {createContext, useContext, type ReactNode} from 'react'

export type NotificationType = 'info' | 'suc' | 'warn' | 'error'

export interface NotificationItemProps {
  id: string
  comp: ReactNode
  type: NotificationType
  anim: boolean
  timer: number
}

export interface NotificationContextType {
  notifications: NotificationItemProps[]
  add: (comp: ReactNode, type?: NotificationType, delay?: number | false) => string
  remove: (id: string) => void
}

export const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  add: () => '',
  remove: () => undefined,
})

export function useNotification() {
  return useContext(NotificationContext)
}

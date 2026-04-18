import {useCallback, useMemo, useState, type ReactNode} from 'react'
import {NotificationContext, type NotificationItemProps, type NotificationType} from './notification-context.ts'

export function NotificationProvider({children}: {children: ReactNode}) {
  const [notifications, setNotifications] = useState<NotificationItemProps[]>([])

  const remove = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id))
  }, [])

  const add = useCallback((comp: ReactNode, type: NotificationType = 'info', delay: number | false = 2400) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setNotifications((current) => [...current, {id, comp, type, anim: true, timer: typeof delay === 'number' ? delay : 0}])
    if (typeof delay === 'number') {
      window.setTimeout(() => remove(id), delay)
    }
    return id
  }, [remove])

  const value = useMemo(() => ({notifications, add, remove}), [add, notifications, remove])

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function LiteUIProvider({children}: {children: ReactNode}) {
  return <NotificationProvider>{children}</NotificationProvider>
}

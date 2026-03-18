'use client'

import { useCallback, useRef } from 'react'

export function useNotifications() {
  const permissionRef = useRef<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return false
    if (permissionRef.current === 'granted') return true

    const result = await Notification.requestPermission()
    permissionRef.current = result
    return result === 'granted'
  }, [])

  const notify = useCallback((title: string, options?: NotificationOptions) => {
    if (typeof Notification === 'undefined') return
    if (permissionRef.current !== 'granted') return
    if (document.visibilityState === 'visible') return

    new Notification(title, options)
  }, [])

  return { requestPermission, notify }
}

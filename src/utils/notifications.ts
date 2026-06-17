const MESSAGE_NOTIFICATIONS_KEY = 'verdant_message_notifications'

export function areMessageNotificationsEnabled(): boolean {
  return localStorage.getItem(MESSAGE_NOTIFICATIONS_KEY) === 'true'
}

export function setMessageNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(MESSAGE_NOTIFICATIONS_KEY, enabled ? 'true' : 'false')
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }

  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'

  return Notification.requestPermission()
}

async function getActiveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  if (!navigator.serviceWorker.controller) return null
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ?? null
}

export async function showMessageNotification(title: string, body: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  if (!areMessageNotificationsEnabled()) return

  const options: NotificationOptions = {
    body,
    icon: '/notification-icon.svg',
    badge: '/notification-icon.svg',
  }

  const registration = await getActiveServiceWorkerRegistration()
  if (registration) {
    await registration.showNotification(title, options)
    return
  }

  try {
    new Notification(title, options)
  } catch {
    // Mobile browsers often block Notification() from page context.
  }
}

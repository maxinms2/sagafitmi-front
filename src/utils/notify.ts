export type NotificationType = 'success' | 'info' | 'warning' | 'danger'

export function notify(type: NotificationType, message: string, title?: string, duration = 4000) {
  try {
    window.dispatchEvent(new CustomEvent('app-notification', { detail: { type, message, title, duration } }))
  } catch (e) {
    // fallback: si no es posible despachar el evento, usar console
    // Esto evita romper código en entornos extraños
    // eslint-disable-next-line no-console
    console.warn('notify fallback:', type, message, e)
  }
}

export const notifyInfo = (message: string, title?: string, duration?: number) => notify('info', message, title, duration)
export const notifySuccess = (message: string, title?: string, duration?: number) => notify('success', message, title, duration)
export const notifyWarning = (message: string, title?: string, duration?: number) => notify('warning', message, title, duration)
export const notifyError = (message: string, title?: string, duration?: number) => notify('danger', message, title, duration)

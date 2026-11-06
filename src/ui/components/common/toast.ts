export type AppToastKind = 'error' | 'success'

export type AppToastDetail = {
    kind: AppToastKind
    message: string
}

export const APP_TOAST_EVENT = 'app-toast'
const TOAST_TIMEOUT_MS = 3000
const TOAST_ELEMENT_ID = 'app-error-toast'

export function showErrorToast(message: string): void {
    showToast(message, 'error')
}

export function showSuccessToast(message: string): void {
    showToast(message, 'success')
}

function showToast(message: string, kind: AppToastKind): void {
    const existingToast = document.getElementById(TOAST_ELEMENT_ID)
    existingToast?.remove()

    const toast = document.createElement('div')
    toast.id = TOAST_ELEMENT_ID
    toast.setAttribute('role', 'alert')
    toast.className = kind === 'success'
        ? 'app-notification app-notification-success fixed bottom-4 right-4 z-50 max-w-sm rounded border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg'
        : 'app-notification app-notification-danger fixed bottom-4 right-4 z-50 max-w-sm rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 shadow-lg'
    toast.textContent = message
    document.body.appendChild(toast)

    window.setTimeout(() => {
        if (toast.isConnected) {
            toast.remove()
        }
    }, TOAST_TIMEOUT_MS)
}

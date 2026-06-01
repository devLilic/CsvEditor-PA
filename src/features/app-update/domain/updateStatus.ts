import type { UpdateStatus } from '../../../shared/ipc-types'

export function isFinalUpdateStatus(status: UpdateStatus): boolean {
    return status.type === 'downloaded'
        || status.type === 'error'
        || status.type === 'not-available'
}

export function isBusyUpdateStatus(status: UpdateStatus): boolean {
    return status.type === 'checking'
        || status.type === 'downloading'
}

export function getUpdateStatusMessage(status: UpdateStatus): string {
    switch (status.type) {
        case 'idle':
            return 'Gata'
        case 'checking':
            return 'Se verifica actualizarile...'
        case 'available':
            return 'Actualizare disponibila'
        case 'not-available':
            return 'Ai ultima versiune'
        case 'downloading':
            return 'Se descarca actualizarea...'
        case 'downloaded':
            return 'Actualizarea este descarcata'
        case 'error':
            return 'Eroare la actualizare'
    }
}

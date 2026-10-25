import type { IpcResponse } from '@/shared/ipc-types'
import { IPC_CHANNELS } from '@/shared/ipc-channels'

type ReserveTitleBackupResponse = IpcResponse<typeof IPC_CHANNELS.TITLE_BACKUP_RESERVE>

function getApi() {
    return (window as Window & { electronAPI?: { reserveTitleBackup?: (request: { forceNewProject?: boolean }, projectId?: string) => Promise<ReserveTitleBackupResponse> } }).electronAPI
}

export const titleBackupReservationService = {
    async reserveActiveTitleBackup(forceNewProject = false, projectId?: string): Promise<ReserveTitleBackupResponse> {
        const api = getApi()
        if (!api?.reserveTitleBackup) {
            return { ok: false, error: 'electronAPI not available' }
        }

        try {
            const input = { forceNewProject }
            const response = projectId
                ? await api.reserveTitleBackup(input, projectId)
                : await api.reserveTitleBackup(input)
            return response ?? { ok: false, error: 'NO_RESPONSE' }
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : 'TITLE_BACKUP_RESERVE_FAILED',
            }
        }
    },
}

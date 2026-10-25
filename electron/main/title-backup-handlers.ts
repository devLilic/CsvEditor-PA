import { scopedIpcHandle } from './show-project-scope'
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import {
    getAppConfig,
    getCsvFileSettings,
    setAppConfig,
} from '../store'
import {
    listTitleBackupFiles,
    readTitleBackup,
    reserveTitleBackupName,
    writeTitleBackupWithRetention,
} from './title-backup-retention'

function getBackupFolderPath(): string {
    return getCsvFileSettings().backupFolderPath.trim()
}

export function registerTitleBackupHandlers() {
    scopedIpcHandle(IPC_CHANNELS.TITLE_BACKUP_RESERVE, async (_event, request: unknown) => {
        const forceNewProject = !!(request as { forceNewProject?: unknown } | null)?.forceNewProject

        return reserveTitleBackupName({
            backupFolderPath: getBackupFolderPath(),
            date: new Date(),
            forceNewProject,
            store: {
                getConfig: getAppConfig,
                setConfig: setAppConfig,
            },
        })
    })

    scopedIpcHandle(IPC_CHANNELS.TITLE_BACKUP_LIST, async () => {
        try {
            const files = await listTitleBackupFiles({
                backupFolderPath: getBackupFolderPath(),
            })

            return { ok: true, files }
        } catch (error) {
            return { ok: false, files: [], error: (error as Error).message }
        }
    })

    scopedIpcHandle(IPC_CHANNELS.TITLE_BACKUP_READ, async (_event, request: unknown) => {
        return readTitleBackup({
            backupFolderPath: getBackupFolderPath(),
            filename: String((request as { filename?: unknown } | null)?.filename ?? ''),
        })
    })

    scopedIpcHandle(IPC_CHANNELS.TITLE_BACKUP_WRITE, async (_event, request: unknown) => {
        const payload = request as { filename?: unknown; content?: unknown } | null

        if (typeof payload?.filename !== 'string' || typeof payload.content !== 'string') {
            return { ok: false, error: 'Invalid title backup write request' }
        }

        return writeTitleBackupWithRetention({
            backupFolderPath: getBackupFolderPath(),
            filename: payload.filename,
            content: payload.content,
        })
    })
}

import type { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import type { EntityExportError } from './entity-export-service'

export function notifyEntityExportFailure(mainWindow: BrowserWindow, error: EntityExportError): void {
    mainWindow.webContents.send(IPC_CHANNELS.ENTITY_EXPORT_ERROR, {
        kind: error.kind,
        filePath: error.filePath,
        message: error.error.message,
    })
}

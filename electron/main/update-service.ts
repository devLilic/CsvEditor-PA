import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import type { ProgressInfo, UpdateInfo } from 'electron-updater'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import type {
    UpdateCheckResult as AppUpdateCheckResult,
    UpdateDownloadResult,
    UpdateStatus,
} from '../../src/shared/ipc-types'

const { autoUpdater } = createRequire(import.meta.url)('electron-updater')

let updateWindow: BrowserWindow | null = null
let areUpdaterListenersRegistered = false
let areIpcHandlersRegistered = false
let availableUpdateVersion: string | null = null
let isUpdateDownloadInProgress = false
let downloadedUpdateVersion: string | null = null

function sendUpdateStatus(status: UpdateStatus): void {
    if (!updateWindow || updateWindow.isDestroyed()) {
        return
    }

    updateWindow.webContents.send(IPC_CHANNELS.UPDATE_STATUS, status)
}

function getCurrentVersion(): string {
    return app.getVersion()
}

function getReleaseNotes(updateInfo: UpdateInfo): string | undefined {
    if (typeof updateInfo.releaseNotes === 'string') {
        return updateInfo.releaseNotes
    }

    return undefined
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === 'string') {
        return error
    }

    return 'UNKNOWN_UPDATE_ERROR'
}

function registerAutoUpdaterListenersOnce(): void {
    if (areUpdaterListenersRegistered) {
        return
    }

    autoUpdater.on('checking-for-update', () => {
        sendUpdateStatus({
            type: 'checking',
            currentVersion: getCurrentVersion(),
        })
    })

    autoUpdater.on('update-available', (updateInfo: UpdateInfo) => {
        availableUpdateVersion = updateInfo.version
        downloadedUpdateVersion = null

        sendUpdateStatus({
            type: 'available',
            currentVersion: getCurrentVersion(),
            newVersion: updateInfo.version,
            releaseNotes: getReleaseNotes(updateInfo),
        })
    })

    autoUpdater.on('update-not-available', () => {
        availableUpdateVersion = null
        downloadedUpdateVersion = null

        sendUpdateStatus({
            type: 'not-available',
            currentVersion: getCurrentVersion(),
        })
    })

    autoUpdater.on('download-progress', (progressInfo: ProgressInfo) => {
        sendUpdateStatus({
            type: 'downloading',
            percent: progressInfo.percent,
            transferred: progressInfo.transferred,
            total: progressInfo.total,
        })
    })

    autoUpdater.on('update-downloaded', (updateInfo: UpdateInfo) => {
        isUpdateDownloadInProgress = false
        downloadedUpdateVersion = updateInfo.version

        sendUpdateStatus({
            type: 'downloaded',
            newVersion: updateInfo.version,
        })
    })

    autoUpdater.on('error', (error: Error) => {
        isUpdateDownloadInProgress = false
        downloadedUpdateVersion = null

        sendUpdateStatus({
            type: 'error',
            message: error.message,
        })
    })

    areUpdaterListenersRegistered = true
}

function registerUpdateIpcHandlersOnce(): void {
    if (areIpcHandlersRegistered) {
        return
    }

    ipcMain.handle(IPC_CHANNELS.UPDATE_GET_CURRENT_VERSION, () => getCurrentVersion())

    ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, async (): Promise<AppUpdateCheckResult> => {
        const currentVersion = getCurrentVersion()

        sendUpdateStatus({
            type: 'checking',
            currentVersion,
        })

        if (!app.isPackaged) {
            const error = 'UPDATE_ONLY_AVAILABLE_IN_PACKAGED_APP'

            sendUpdateStatus({
                type: 'error',
                message: error,
            })

            return {
                ok: false,
                error,
            }
        }

        try {
            const result = await autoUpdater.checkForUpdates()
            const updateInfo = result?.updateInfo

            if (updateInfo?.version && updateInfo.version !== currentVersion) {
                availableUpdateVersion = updateInfo.version
                downloadedUpdateVersion = null

                sendUpdateStatus({
                    type: 'available',
                    currentVersion,
                    newVersion: updateInfo.version,
                    releaseNotes: getReleaseNotes(updateInfo),
                })

                return {
                    ok: true,
                    status: 'available',
                    currentVersion,
                    newVersion: updateInfo.version,
                    releaseNotes: getReleaseNotes(updateInfo),
                }
            }

            availableUpdateVersion = null
            downloadedUpdateVersion = null

            sendUpdateStatus({
                type: 'not-available',
                currentVersion,
            })

            return {
                ok: true,
                status: 'not-available',
                currentVersion,
            }
        } catch (error) {
            const message = getErrorMessage(error)

            sendUpdateStatus({
                type: 'error',
                message,
            })

            return {
                ok: false,
                error: message,
            }
        }
    })

    ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, (): UpdateDownloadResult => {
        if (!downloadedUpdateVersion) {
            return {
                ok: false,
                error: 'UPDATE_NOT_DOWNLOADED',
            }
        }

        try {
            autoUpdater.quitAndInstall(false, true)

            return {
                ok: true,
            }
        } catch (error) {
            const message = getErrorMessage(error)

            sendUpdateStatus({
                type: 'error',
                message,
            })

            return {
                ok: false,
                error: message,
            }
        }
    })

    ipcMain.handle(IPC_CHANNELS.UPDATE_DOWNLOAD, async (): Promise<UpdateDownloadResult> => {
        if (!app.isPackaged) {
            const error = 'UPDATE_ONLY_AVAILABLE_IN_PACKAGED_APP'

            sendUpdateStatus({
                type: 'error',
                message: error,
            })

            return {
                ok: false,
                error,
            }
        }

        if (!availableUpdateVersion) {
            const error = 'UPDATE_NOT_AVAILABLE'

            sendUpdateStatus({
                type: 'error',
                message: error,
            })

            return {
                ok: false,
                error,
            }
        }

        if (isUpdateDownloadInProgress) {
            return {
                ok: false,
                error: 'UPDATE_DOWNLOAD_ALREADY_IN_PROGRESS',
            }
        }

        try {
            isUpdateDownloadInProgress = true

            await autoUpdater.downloadUpdate()

            return {
                ok: true,
            }
        } catch (error) {
            isUpdateDownloadInProgress = false

            const message = getErrorMessage(error)

            sendUpdateStatus({
                type: 'error',
                message,
            })

            return {
                ok: false,
                error: message,
            }
        }
    })

    areIpcHandlersRegistered = true
}

export function registerUpdateHandlers(win: BrowserWindow): void {
    updateWindow = win

    autoUpdater.autoDownload = false
    autoUpdater.disableWebInstaller = false
    autoUpdater.allowDowngrade = false

    registerAutoUpdaterListenersOnce()
    registerUpdateIpcHandlersOnce()
}

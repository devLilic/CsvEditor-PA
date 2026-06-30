// electron/main/settings-handlers.ts
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import type { AppConfig } from '../../src/shared/ipc-types'
import { isDefaultProjectSettings } from '../../src/features/csv-editor/domain/defaultProjectSettings'
import { normalizePhoneImageSettings } from '../../src/features/csv-editor/domain/phoneImageSettings'
import { normalizeCsvFileSettings } from '../../src/features/csv-editor/domain/csvFileSettings'
import {
    getQuickTitles,
    setQuickTitles,
    getAppConfig,
    setAppConfig,
    getDefaultProjectSettings,
    setDefaultProjectSettings,
    getPhoneImageSettings,
    setPhoneImageSettings,
    getCsvFileSettings,
    setCsvFileSettings,
} from '../store'
import { notifyEntityExportFailure } from './entity-export-notification'
import {
    readQuickTitlesCsv,
    normalizeQuickTitlesForCsv,
    writeQuickTitlesCsv,
    type QuickTitlesCsvError,
} from './quick-titles-csv-service'
import { resolveQuickTitlesCsvPath } from './quick-titles-handlers'

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

function isPlainObject(value: unknown): value is AppConfig {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

function notifyQuickTitlesFailure(mainWindow: BrowserWindow, error: QuickTitlesCsvError): void {
    notifyEntityExportFailure(mainWindow, error)
}

export function registerSettingsHandlers(mainWindow: BrowserWindow) {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_QUICK_TITLES, async () => {
        try {
            const filePath = await resolveQuickTitlesCsvPath()
            const result = await readQuickTitlesCsv({
                filePath,
                onError: (error) => notifyQuickTitlesFailure(mainWindow, error),
            })

            if (result.ok) {
                setQuickTitles(result.quickTitles)
                return result.quickTitles
            }

            const legacyQuickTitles = getQuickTitles()
            return legacyQuickTitles
        } catch (error) {
            console.error('[settings:get-quickTitles] failed:', error)
            return [] as string[]
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_QUICK_TITLES, async (_event, list: unknown) => {
        try {
            if (!isStringArray(list)) {
                console.warn('[settings:set-quickTitles] invalid payload, expected string[]')
                return getQuickTitles()
            }

            const quickTitles = normalizeQuickTitlesForCsv(list)
            const filePath = await resolveQuickTitlesCsvPath()
            const result = await writeQuickTitlesCsv({
                filePath,
                quickTitles,
                onError: (error) => notifyQuickTitlesFailure(mainWindow, error),
            })

            if (result.ok) {
                setQuickTitles(quickTitles)
                return quickTitles
            }

            return getQuickTitles()
        } catch (error) {
            console.error('[settings:set-quickTitles] failed:', error)
            return getQuickTitles()
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_CONFIG, () => {
        try {
            return getAppConfig()
        } catch (error) {
            console.error('[settings:get-config] failed:', error)
            return {} as AppConfig
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_CONFIG, (_event, cfg: unknown) => {
        try {
            if (!isPlainObject(cfg)) {
                console.warn('[settings:set-config] invalid payload, expected object')
                return getAppConfig()
            }
            return setAppConfig(cfg)
        } catch (error) {
            console.error('[settings:set-config] failed:', error)
            return getAppConfig()
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_DEFAULT_PROJECT, () => {
        try {
            return getDefaultProjectSettings()
        } catch (error) {
            console.error('[settings:get-default-project] failed:', error)
            return getDefaultProjectSettings()
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_DEFAULT_PROJECT, (_event, settings: unknown) => {
        try {
            if (!isDefaultProjectSettings(settings)) {
                console.warn('[settings:set-default-project] invalid payload, expected DefaultProjectSettings')
                return getDefaultProjectSettings()
            }

            return setDefaultProjectSettings(settings)
        } catch (error) {
            console.error('[settings:set-default-project] failed:', error)
            return getDefaultProjectSettings()
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_PHONE_IMAGE, () => {
        try {
            return getPhoneImageSettings()
        } catch (error) {
            console.error('[settings:get-phone-image] failed:', error)
            return getPhoneImageSettings()
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_PHONE_IMAGE, (_event, settings: unknown) => {
        try {
            return setPhoneImageSettings(normalizePhoneImageSettings(settings))
        } catch (error) {
            console.error('[settings:set-phone-image] failed:', error)
            return getPhoneImageSettings()
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SELECT_WORK_PATH, async () => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
            })

            if (result.canceled) {
                return null
            }

            return result.filePaths[0] ?? null
        } catch (error) {
            console.error('[settings:select-work-path] failed:', error)
            return null
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_CSV_FILE, () => {
        try {
            return getCsvFileSettings()
        } catch (error) {
            console.error('[settings:get-csv-file] failed:', error)
            return getCsvFileSettings()
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_CSV_FILE, (_event, settings: unknown) => {
        try {
            return setCsvFileSettings(normalizeCsvFileSettings(settings))
        } catch (error) {
            console.error('[settings:set-csv-file] failed:', error)
            return getCsvFileSettings()
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SELECT_WORKING_CSV, async () => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [{ name: 'CSV', extensions: ['csv'] }],
            })

            if (result.canceled) {
                return null
            }

            return result.filePaths[0] ?? null
        } catch (error) {
            console.error('[settings:select-working-csv] failed:', error)
            return null
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SELECT_BACKUP_FOLDER, async () => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
            })

            if (result.canceled) {
                return null
            }

            return result.filePaths[0] ?? null
        } catch (error) {
            console.error('[settings:select-backup-folder] failed:', error)
            return null
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SELECT_SAVED_PROJECTS_FOLDER, async () => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
            })

            if (result.canceled) {
                return null
            }

            return result.filePaths[0] ?? null
        } catch (error) {
            console.error('[settings:select-saved-projects-folder] failed:', error)
            return null
        }
    })

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SELECT_EXPORT_CSV_FOLDER, async () => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
            })

            if (result.canceled) {
                return null
            }

            return result.filePaths[0] ?? null
        } catch (error) {
            console.error('[settings:select-export-csv-folder] failed:', error)
            return null
        }
    })
}

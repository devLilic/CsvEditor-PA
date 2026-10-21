// electron/main/csv-handlers.ts
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import type { CsvFileDescriptor, CsvWriteRequest } from '../../src/shared/ipc-types'
import { getAppConfig, getCsvFilePath, getCsvFileSettings, setAppConfig, setCsvFilePath } from '../store'
import { writeCsvBackup } from './csv-backup'
import { resolveEntityExportPaths } from '../../src/features/entity-export/domain/exportPathResolver'
import { normalizeLowerThirdTypes } from '../../src/features/lower-thirds/domain/lowerThirdTypesValidation'
import { restoreLowerThirdAssignments, migrateHotTitlesToUrgent } from '../../src/features/lower-thirds/domain/lowerThirdAssignments'
import { LOWER_THIRD_TYPES_CONFIG_KEY } from '../../src/features/lower-thirds/domain/lowerThirdTypesConfig'
import { notifyEntityExportFailure } from './entity-export-notification'
import { parseCsv } from '../../src/features/csv-editor/utils/csvParser'
import {
    mapPlateauItemsToTitleBackupItems,
} from '../../src/features/title-backup/services/writeActiveTitleBackup'
import { serializeTitleBackup } from '../../src/features/title-backup/domain/titleBackupCsv'
import { getActiveTitleBackupFile } from '../../src/features/title-backup/domain/activeTitleBackupFile'
import { reserveTitleBackupName, writeTitleBackupWithRetention } from './title-backup-retention'
import {
    exportEntityCsvFilesFromEntities,
    type EntityExportResult,
} from './entity-export-service'

const fsp = fs.promises

function isString(value: unknown): value is string {
    return typeof value === 'string'
}

async function readCsvFile(filePath: string): Promise<CsvFileDescriptor> {
    const content = await fsp.readFile(filePath, 'utf-8')
    return { path: filePath, content }
}

async function readConfiguredWorkingCsv() {
    const workingCsvPath = getCsvFileSettings().workingCsvPath.trim()

    if (!workingCsvPath) {
        return { ok: false, error: 'No working CSV configured' }
    }

    const stat = await fsp.stat(workingCsvPath).catch(() => null)
    if (!stat?.isFile()) {
        return { ok: false, error: 'Working CSV file does not exist' }
    }

    const content = await fsp.readFile(workingCsvPath, 'utf-8')
    const exportPaths = resolveEntityExportPaths({
        workingCsvPath,
        exportFolderPath: getCsvFileSettings().exportCsvFolderPath,
    })
    const [titles, persons] = await Promise.all([
        fsp.readFile(exportPaths.titlesPath, 'utf-8').catch(() => undefined),
        fsp.readFile(exportPaths.personsPath, 'utf-8').catch(() => undefined),
    ])
    return {
        ok: true,
        path: workingCsvPath,
        filename: path.basename(workingCsvPath),
        content,
        previousExports: { titles, persons },
    }
}

async function ensureBackupDir(): Promise<string> {
    const baseDir = path.join(app.getPath('documents'), app.getName(), 'backups')
    await fsp.mkdir(baseDir, { recursive: true })
    return baseDir
}

function getConfiguredCsvPath(): string | null {
    const settingsPath = getCsvFileSettings().workingCsvPath.trim()
    return settingsPath || getCsvFilePath()
}

function getWorkingCsvPath(): string | null {
    const settingsPath = getCsvFileSettings().workingCsvPath.trim()
    return settingsPath || null
}

async function exportEntityCsvsAfterWorkingCsvWrite(
    mainWindow: BrowserWindow,
    content: string,
    workingCsvPath: string,
    metadata?: Pick<CsvWriteRequest, 'entities' | 'lowerThirdTypes'>
): Promise<EntityExportResult> {
    try {
        const settings = getCsvFileSettings()
        const exportPaths = resolveEntityExportPaths({
            workingCsvPath,
            exportFolderPath: settings.exportCsvFolderPath,
        })
        const typeConfig = getAppConfig()[LOWER_THIRD_TYPES_CONFIG_KEY]
        const lowerThirdTypes = metadata?.lowerThirdTypes ?? normalizeLowerThirdTypes(typeConfig)
        const entities = metadata?.entities
            ? migrateHotTitlesToUrgent(metadata.entities)
            : restoreLowerThirdAssignments({
                entities: migrateHotTitlesToUrgent(parseCsv(content)),
                titlesExport: await fsp.readFile(exportPaths.titlesPath, 'utf-8').catch(() => undefined),
                personsExport: await fsp.readFile(exportPaths.personsPath, 'utf-8').catch(() => undefined),
                types: lowerThirdTypes,
                onWarning: (message) => console.warn('[lower-thirds]', message),
            })
        return await exportEntityCsvFilesFromEntities({
            paths: exportPaths,
            entities,
            lowerThirdTypes,
            onError: (error) => notifyEntityExportFailure(mainWindow, error),
            afterTitlesExport: async () => {
                let activeTitleBackupFile = getActiveTitleBackupFile(getAppConfig())
                if (!activeTitleBackupFile) {
                    const reservation = await reserveTitleBackupName({
                        backupFolderPath: settings.backupFolderPath,
                        date: new Date(),
                        store: {
                            getConfig: getAppConfig,
                            setConfig: setAppConfig,
                        },
                    })

                    if (!reservation.ok) {
                        notifyEntityExportFailure(mainWindow, {
                            kind: 'titleBackup',
                            filePath: settings.backupFolderPath,
                            error: new Error(reservation.error),
                        })
                        return
                    }

                    activeTitleBackupFile = reservation.filename
                }

                const backupContent = serializeTitleBackup(
                    mapPlateauItemsToTitleBackupItems(parseCsv(content))
                )
                const backupResult = await writeTitleBackupWithRetention({
                    backupFolderPath: settings.backupFolderPath,
                    filename: activeTitleBackupFile,
                    content: backupContent,
                })

                if (!backupResult.ok) {
                    notifyEntityExportFailure(mainWindow, {
                        kind: 'titleBackup',
                        filePath: path.join(settings.backupFolderPath, activeTitleBackupFile),
                        error: new Error(backupResult.error ?? 'TITLE_BACKUP_WRITE_FAILED'),
                    })
                }
            },
        })
    } catch (error) {
        console.error('[entity-export] failed after csv:write:', error)
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

export function registerCsvHandlers(mainWindow: BrowserWindow) {
    // 🧩 1️⃣ Load last used CSV automatically
    ipcMain.handle(IPC_CHANNELS.CSV_GET_LAST, async () => {
        try {
            const storedPath = getConfiguredCsvPath()
            if (!storedPath || !fs.existsSync(storedPath)) {
                return null
            }
            return await readCsvFile(storedPath)
        } catch (error) {
            console.error('[csv:getLast] failed:', error)
            return null
        }
    })

    // 🧩 2️⃣ Open new CSV via dialog
    ipcMain.handle(IPC_CHANNELS.CSV_GET_WORKING, async () => {
        try {
            return await readConfiguredWorkingCsv()
        } catch (error) {
            console.error('[csv:get-working] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.CSV_OPEN_DIALOG, async () => {
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile'],
                filters: [{ name: 'CSV', extensions: ['csv'] }],
            })

            if (canceled || filePaths.length === 0) {
                return null
            }

            const selectedPath = filePaths[0]
            const file = await readCsvFile(selectedPath)

            setCsvFilePath(selectedPath)

            return file
        } catch (error) {
            console.error('[csv:openDialog] failed:', error)
            return null
        }
    })

    // 📝 Write CSV back to disk
    ipcMain.handle(IPC_CHANNELS.CSV_WRITE, async (_event, request: unknown) => {
        try {
            const payload: CsvWriteRequest = isString(request)
                ? { content: request }
                : request as CsvWriteRequest
            if (!isString(payload?.content)) {
                return { ok: false, error: 'Invalid content type, expected string' }
            }

            const csvPath = getWorkingCsvPath()
            if (!csvPath) {
                return { ok: false, error: 'No working CSV configured' }
            }

            await fsp.writeFile(csvPath, payload.content, 'utf-8')
            const exportResult = await exportEntityCsvsAfterWorkingCsvWrite(mainWindow, payload.content, csvPath, payload)
            if (!exportResult.ok) {
                return {
                    ok: false,
                    error: `ENTITY_EXPORT_FAILED: ${exportResult.error ?? 'UNKNOWN_ERROR'}`,
                }
            }
            return { ok: true }
        } catch (error) {
            console.error('[csv:write] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })

    // 💾 Backup CSV to a new file with timestamp
    ipcMain.handle(IPC_CHANNELS.CSV_BKP, async (_event, content: unknown) => {
        try {
            if (!isString(content)) {
                return { ok: false, error: 'Invalid content type, expected string' }
            }

            const backupDir = await ensureBackupDir()
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const backupPath = path.join(backupDir, `backup-${timestamp}.csv`)

            await fsp.writeFile(backupPath, content, 'utf-8')

            return { ok: true, backupPath }
        } catch (error) {
            console.error('[csv:bkp] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.CSV_CREATE_BACKUP, async (_event, request: unknown) => {
        try {
            const settings = getCsvFileSettings()
            return await writeCsvBackup({
                content: (request as { content?: unknown } | null)?.content,
                workingCsvPath: settings.workingCsvPath,
                backupFolderPath: settings.backupFolderPath,
                now: new Date(),
            })
        } catch (error) {
            console.error('[csv:create-backup] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })
}

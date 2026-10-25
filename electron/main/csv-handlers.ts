// electron/main/csv-handlers.ts
import { BrowserWindow, dialog, ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import type { CsvFileDescriptor, CsvWriteRequest } from '../../src/shared/ipc-types'
import { getAppConfig, getCsvFilePath, getCsvFileSettings, setAppConfig, setCsvFilePath, setCsvFileSettings } from '../store'
import { resolveEntityExportPaths } from '../../src/features/entity-export/domain/exportPathResolver'
import { normalizeLowerThirdTypes } from '../../src/features/lower-thirds/domain/lowerThirdTypesValidation'
import { restoreLowerThirdAssignments, migrateHotTitlesToUrgent } from '../../src/features/lower-thirds/domain/lowerThirdAssignments'
import { LOWER_THIRD_TYPES_CONFIG_KEY } from '../../src/features/lower-thirds/domain/lowerThirdTypesConfig'
import { ENTITY_TEMPLATE_NAMES_CONFIG_KEY, normalizeEntityTemplateNames } from '../../src/features/lower-thirds/domain/entityTemplateNames'
import { notifyEntityExportFailure } from './entity-export-notification'
import { parseCsv } from '../../src/features/csv-editor/utils/csvParser'
import { serializeCsv } from '../../src/features/csv-editor/utils/csvSerializer'
import type { EntitiesState } from '../../src/features/csv-editor/domain/entities'
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
    const settings = getCsvFileSettings()
    const projectFolderPath = settings.projectFolderPath.trim()
    const workingCsvPath = settings.workingCsvPath.trim()
    const statePath = projectFolderPath ? path.join(projectFolderPath, 'Saved', 'current-project.json') : ''
    let entities: EntitiesState | undefined
    let content = ''
    let loadedFromLegacyCsv = false

    if (statePath) {
        const json = await fsp.readFile(statePath, 'utf-8').catch(() => '')
        if (json) {
            const saved = JSON.parse(json) as { entities?: unknown }
            if (saved.entities && typeof saved.entities === 'object' && Array.isArray((saved.entities as EntitiesState).sections)) {
                entities = saved.entities as EntitiesState
            }
        }
    }

    if (!entities && workingCsvPath) {
        const stat = await fsp.stat(workingCsvPath).catch(() => null)
        if (stat?.isFile()) {
            content = await fsp.readFile(workingCsvPath, 'utf-8')
            entities = parseCsv(content)
            loadedFromLegacyCsv = true
        }
    }

    if (!entities) return { ok: false, error: 'No saved project state found' }
    if (!content) content = serializeCsv(entities)
    if (loadedFromLegacyCsv && statePath) {
        await fsp.mkdir(path.dirname(statePath), { recursive: true })
        await fsp.writeFile(statePath, JSON.stringify({ version: 1, entities }, null, 2), 'utf-8')
        // Retire the legacy file pointer only after the new project snapshot is
        // safely written, so a failed migration can be retried next launch.
        setCsvFileSettings({ ...settings, workingCsvPath: '' })
    }
    const exportPaths = resolveEntityExportPaths({
        projectFolderPath,
        workingCsvPath,
        exportFolderPath: settings.exportCsvFolderPath,
        exportPrefix: settings.exportPrefix,
    })
    const [titles, persons] = await Promise.all([
        fsp.readFile(exportPaths.titlesPath, 'utf-8').catch(() => undefined),
        fsp.readFile(exportPaths.personsPath, 'utf-8').catch(() => undefined),
    ])
    return {
        ok: true,
        path: statePath || workingCsvPath,
        filename: path.basename(statePath || workingCsvPath),
        content,
        entities,
        previousExports: { titles, persons },
    }
}

async function ensureBackupDir(): Promise<string> {
    const projectFolderPath = getCsvFileSettings().projectFolderPath.trim()
    if (!projectFolderPath) throw new Error('No project folder configured')
    const baseDir = path.join(projectFolderPath, 'Backup')
    await fsp.mkdir(baseDir, { recursive: true })
    return baseDir
}

function getConfiguredCsvPath(): string | null {
    const settingsPath = getCsvFileSettings().workingCsvPath.trim()
    return settingsPath || getCsvFilePath()
}

async function exportEntityCsvsAfterWorkingCsvWrite(
    mainWindow: BrowserWindow,
    baseEntities: EntitiesState,
    metadata?: Pick<CsvWriteRequest, 'entities' | 'lowerThirdTypes'>
): Promise<EntityExportResult> {
    try {
        const settings = getCsvFileSettings()
        const exportPaths = resolveEntityExportPaths({
            projectFolderPath: settings.projectFolderPath,
            workingCsvPath: settings.workingCsvPath,
            exportFolderPath: settings.exportCsvFolderPath,
            exportPrefix: settings.exportPrefix,
        })
        const typeConfig = getAppConfig()[LOWER_THIRD_TYPES_CONFIG_KEY]
        const entityTemplateNames = normalizeEntityTemplateNames(getAppConfig()[ENTITY_TEMPLATE_NAMES_CONFIG_KEY])
        const lowerThirdTypes = metadata?.lowerThirdTypes ?? normalizeLowerThirdTypes(typeConfig)
        const exportEntities = metadata?.entities
            ? migrateHotTitlesToUrgent(metadata.entities)
            : restoreLowerThirdAssignments({
                entities: migrateHotTitlesToUrgent(baseEntities),
                titlesExport: await fsp.readFile(exportPaths.titlesPath, 'utf-8').catch(() => undefined),
                personsExport: await fsp.readFile(exportPaths.personsPath, 'utf-8').catch(() => undefined),
                types: lowerThirdTypes,
                exportPrefix: settings.exportPrefix,
                onWarning: (message) => console.warn('[lower-thirds]', message),
            })
        return await exportEntityCsvFilesFromEntities({
            paths: exportPaths,
            entities: exportEntities,
            lowerThirdTypes,
            exportPrefix: settings.exportPrefix,
            entityTemplateNames,
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
                    mapPlateauItemsToTitleBackupItems(exportEntities)
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
        console.error('[entity-export] failed after project-state save:', error)
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

            const settings = getCsvFileSettings()
            const projectFolderPath = settings.projectFolderPath.trim()
            if (!projectFolderPath) {
                return { ok: false, error: 'No project folder configured' }
            }

            const entities = payload.entities ?? parseCsv(payload.content)
            const savedStatePath = path.join(projectFolderPath, 'Saved', 'current-project.json')
            await fsp.mkdir(path.dirname(savedStatePath), { recursive: true })
            await fsp.writeFile(savedStatePath, JSON.stringify({ version: 1, entities }, null, 2), 'utf-8')
            const exportResult = await exportEntityCsvsAfterWorkingCsvWrite(mainWindow, entities, payload)
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
            const backupPath = path.join(backupDir, `project-${timestamp}.json`)

            await fsp.writeFile(backupPath, content, 'utf-8')

            return { ok: true, backupPath }
        } catch (error) {
            console.error('[csv:bkp] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.CSV_CREATE_BACKUP, async (_event, request: unknown) => {
        try {
            const content = (request as { content?: unknown } | null)?.content
            if (!isString(content)) return { ok: false, error: 'Invalid content type, expected string' }
            const backupDir = await ensureBackupDir()
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const filename = `project-${timestamp}.json`
            const backupPath = path.join(backupDir, filename)
            await fsp.writeFile(backupPath, content, 'utf-8')
            return { ok: true, backupPath, filename }
        } catch (error) {
            console.error('[csv:create-backup] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })
}

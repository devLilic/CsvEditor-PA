// electron/main/csv-handlers.ts
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import type { CsvFileDescriptor } from '../../src/shared/ipc-types'
import { getCsvFilePath, getCsvFileSettings, setCsvFilePath } from '../store'
import { writeCsvBackup } from './csv-backup'
import { resolveEntityExportPaths } from '../../src/features/entity-export/domain/exportPathResolver'
import { notifyEntityExportFailure } from './entity-export-notification'
import { exportEntityCsvFilesFromFullCsvContent } from './entity-export-service'

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
    return {
        ok: true,
        path: workingCsvPath,
        filename: path.basename(workingCsvPath),
        content,
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
    workingCsvPath: string
): Promise<void> {
    try {
        const settings = getCsvFileSettings()
        const exportPaths = resolveEntityExportPaths({
            workingCsvPath,
            exportFolderPath: settings.exportCsvFolderPath,
        })
        const result = await exportEntityCsvFilesFromFullCsvContent({
            paths: exportPaths,
            content,
            onError: (error) => notifyEntityExportFailure(mainWindow, error),
        })

        if (!result.ok) {
            console.error('[entity-export] failed after csv:write:', result.error)
        }
    } catch (error) {
        console.error('[entity-export] failed after csv:write:', error)
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
    ipcMain.handle(IPC_CHANNELS.CSV_WRITE, async (_event, content: unknown) => {
        try {
            if (!isString(content)) {
                return { ok: false, error: 'Invalid content type, expected string' }
            }

            const csvPath = getWorkingCsvPath()
            if (!csvPath) {
                return { ok: false, error: 'No working CSV configured' }
            }

            await fsp.writeFile(csvPath, content, 'utf-8')
            await exportEntityCsvsAfterWorkingCsvWrite(mainWindow, content, csvPath)
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

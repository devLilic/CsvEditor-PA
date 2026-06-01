import { BrowserWindow, ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { createSavedProjectFilename } from '../../src/features/csv-editor/domain/savedProjectFile'
import { parseCsv } from '../../src/features/csv-editor/utils/csvParser'
import { resolveEntityExportPaths } from '../../src/features/entity-export/domain/exportPathResolver'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import type {
    CsvProjectDeleteRequest,
    CsvProjectDeleteResponse,
    CsvProjectFileInfo,
    CsvProjectLoadIntoWorkingRequest,
    CsvProjectLoadIntoWorkingResponse,
    CsvProjectListResponse,
    CsvProjectSaveAsRequest,
    CsvProjectSaveAsResponse,
} from '../../src/shared/ipc-types'
import { getCsvFileSettings } from '../store'
import { writeCsvBackup } from './csv-backup'
import { notifyEntityExportFailure } from './entity-export-notification'
import { exportEntityCsvFilesFromEntities } from './entity-export-service'

const fsp = fs.promises

function samePath(a: string, b: string): boolean {
    return path.resolve(a) === path.resolve(b)
}

function isSafeCsvFilename(filename: string): boolean {
    return filename === path.basename(filename) && filename.toLowerCase().endsWith('.csv')
}

async function listSavedCsvProjects(): Promise<CsvProjectListResponse> {
    const settings = getCsvFileSettings()
    const savedProjectsFolderPath = settings.savedProjectsFolderPath.trim()

    if (!savedProjectsFolderPath) {
        return {
            ok: false,
            files: [],
            error: 'No saved projects folder configured',
        }
    }

    const folderStat = await fsp.stat(savedProjectsFolderPath).catch(() => null)
    if (!folderStat?.isDirectory()) {
        return {
            ok: false,
            files: [],
            error: 'Saved projects folder does not exist',
        }
    }

    const filenames = await fsp.readdir(savedProjectsFolderPath)
    const files: CsvProjectFileInfo[] = []
    const workingCsvPath = settings.workingCsvPath.trim()

    for (const filename of filenames) {
        if (!filename.toLowerCase().endsWith('.csv')) {
            continue
        }

        const fullPath = path.join(savedProjectsFolderPath, filename)
        if (workingCsvPath && samePath(fullPath, workingCsvPath)) {
            continue
        }

        const fileStat = await fsp.stat(fullPath).catch(() => null)
        if (!fileStat?.isFile()) {
            continue
        }

        files.push({
            filename,
            fullPath,
            mtimeMs: fileStat.mtimeMs,
        })
    }

    return {
        ok: true,
        files: files.sort((a, b) => b.mtimeMs - a.mtimeMs),
    }
}

async function getSavedProjectsFolderPath(): Promise<
    | { ok: true; folderPath: string }
    | { ok: false; error: string }
> {
    const settings = getCsvFileSettings()
    const savedProjectsFolderPath = settings.savedProjectsFolderPath.trim()

    if (!savedProjectsFolderPath) {
        return { ok: false, error: 'No saved projects folder configured' }
    }

    const folderStat = await fsp.stat(savedProjectsFolderPath).catch(() => null)
    if (!folderStat?.isDirectory()) {
        return { ok: false, error: 'Saved projects folder does not exist' }
    }

    return { ok: true, folderPath: savedProjectsFolderPath }
}

async function saveCsvProjectAs(request: unknown): Promise<CsvProjectSaveAsResponse> {
    const payload = request as Partial<CsvProjectSaveAsRequest> | null
    if (typeof payload?.filename !== 'string') {
        return { ok: false, error: 'Invalid filename type, expected string' }
    }

    if (typeof payload.content !== 'string') {
        return { ok: false, error: 'Invalid content type, expected string' }
    }

    const folder = await getSavedProjectsFolderPath()
    if (!folder.ok) {
        return { ok: false, error: folder.error }
    }

    const filename = createSavedProjectFilename(payload.filename)
    const fullPath = path.join(folder.folderPath, filename)
    const existingStat = await fsp.stat(fullPath).catch(() => null)
    if (existingStat?.isFile()) {
        return {
            ok: false,
            filename,
            fullPath,
            error: 'FILE_EXISTS',
        }
    }

    await fsp.writeFile(fullPath, payload.content, 'utf-8')

    return {
        ok: true,
        filename,
        fullPath,
    }
}

async function exportEntityCsvsAfterProjectLoad(input: {
    mainWindow: BrowserWindow
    content: string
    workingCsvPath: string
    exportCsvFolderPath: string
}): Promise<void> {
    try {
        const entities = parseCsv(input.content)
        const exportPaths = resolveEntityExportPaths({
            workingCsvPath: input.workingCsvPath,
            exportFolderPath: input.exportCsvFolderPath,
        })
        const result = await exportEntityCsvFilesFromEntities({
            paths: exportPaths,
            entities,
            onError: (error) => notifyEntityExportFailure(input.mainWindow, error),
        })

        if (!result.ok) {
            console.error('[entity-export] failed after csv-project:load-into-working:', result.error)
        }
    } catch (error) {
        console.error('[entity-export] failed after csv-project:load-into-working:', error)
    }
}

async function loadCsvProjectIntoWorking(
    mainWindow: BrowserWindow,
    request: unknown
): Promise<CsvProjectLoadIntoWorkingResponse> {
    const payload = request as Partial<CsvProjectLoadIntoWorkingRequest> | null
    if (typeof payload?.filename !== 'string') {
        return { ok: false, error: 'Invalid filename type, expected string' }
    }

    const settings = getCsvFileSettings()
    const workingCsvPath = settings.workingCsvPath.trim()
    if (!workingCsvPath) {
        return { ok: false, error: 'No working CSV configured' }
    }

    const folder = await getSavedProjectsFolderPath()
    if (!folder.ok) {
        return { ok: false, error: folder.error }
    }

    const filename = createSavedProjectFilename(payload.filename)
    const savedProjectPath = path.join(folder.folderPath, filename)
    const savedProjectStat = await fsp.stat(savedProjectPath).catch(() => null)
    if (!savedProjectStat?.isFile()) {
        return { ok: false, error: 'Saved project file does not exist' }
    }

    const workingStat = await fsp.stat(workingCsvPath).catch(() => null)
    if (!workingStat?.isFile()) {
        return { ok: false, error: 'Working CSV file does not exist' }
    }

    const savedProjectContent = await fsp.readFile(savedProjectPath, 'utf-8')
    const workingCsvContent = await fsp.readFile(workingCsvPath, 'utf-8')
    const backupResult = await writeCsvBackup({
        content: workingCsvContent,
        workingCsvPath,
        backupFolderPath: settings.backupFolderPath,
        now: new Date(),
    })

    if (!backupResult.ok) {
        return { ok: false, error: 'BACKUP_FAILED' }
    }

    await fsp.writeFile(workingCsvPath, savedProjectContent, 'utf-8')
    await exportEntityCsvsAfterProjectLoad({
        mainWindow,
        content: savedProjectContent,
        workingCsvPath,
        exportCsvFolderPath: settings.exportCsvFolderPath,
    })

    return {
        ok: true,
        content: savedProjectContent,
    }
}

async function deleteCsvProject(request: unknown): Promise<CsvProjectDeleteResponse> {
    const payload = request as Partial<CsvProjectDeleteRequest> | null
    if (typeof payload?.filename !== 'string') {
        return { ok: false, error: 'Invalid filename type, expected string' }
    }

    if (!isSafeCsvFilename(payload.filename)) {
        return { ok: false, error: 'Invalid CSV filename' }
    }

    const settings = getCsvFileSettings()
    const folder = await getSavedProjectsFolderPath()
    if (!folder.ok) {
        return { ok: false, error: folder.error }
    }

    const fullPath = path.join(folder.folderPath, payload.filename)
    const workingCsvPath = settings.workingCsvPath.trim()
    if (workingCsvPath && samePath(fullPath, workingCsvPath)) {
        return { ok: false, error: 'Cannot delete working CSV' }
    }

    const fileStat = await fsp.stat(fullPath).catch(() => null)
    if (!fileStat?.isFile()) {
        return { ok: false, error: 'Saved project file does not exist' }
    }

    await fsp.unlink(fullPath)

    return { ok: true }
}

export function registerCsvProjectHandlers(mainWindow: BrowserWindow) {
    ipcMain.handle(IPC_CHANNELS.CSV_PROJECT_LIST, async () => {
        try {
            return await listSavedCsvProjects()
        } catch (error) {
            console.error('[csv-project:list] failed:', error)
            return {
                ok: false,
                files: [],
                error: (error as Error).message,
            }
        }
    })

    ipcMain.handle(IPC_CHANNELS.CSV_PROJECT_SAVE_AS, async (_event, request: unknown) => {
        try {
            return await saveCsvProjectAs(request)
        } catch (error) {
            console.error('[csv-project:save-as] failed:', error)
            return {
                ok: false,
                error: (error as Error).message,
            }
        }
    })

    ipcMain.handle(IPC_CHANNELS.CSV_PROJECT_LOAD_INTO_WORKING, async (_event, request: unknown) => {
        try {
            return await loadCsvProjectIntoWorking(mainWindow, request)
        } catch (error) {
            console.error('[csv-project:load-into-working] failed:', error)
            return {
                ok: false,
                error: (error as Error).message,
            }
        }
    })

    ipcMain.handle(IPC_CHANNELS.CSV_PROJECT_DELETE, async (_event, request: unknown) => {
        try {
            return await deleteCsvProject(request)
        } catch (error) {
            console.error('[csv-project:delete] failed:', error)
            return {
                ok: false,
                error: (error as Error).message,
            }
        }
    })
}

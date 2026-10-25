import { scopedIpcHandle } from './show-project-scope'
import { getScopedShowProject, getScopedShowProjectId } from './show-project-scope'
import { parseShowEdition, serializeShowEdition } from '../../src/features/show-projects/domain/showEdition'
import { BrowserWindow, ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { writeFile as writeFileAtomically } from 'atomically'
import { createSavedProjectJsonFilename, isSavedProjectFilename } from '../../src/features/csv-editor/domain/savedProjectFile'
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
import { getAppConfig } from '../store'
import { normalizeLowerThirdTypes } from '../../src/features/lower-thirds/domain/lowerThirdTypesValidation'
import { restoreLowerThirdAssignments, migrateHotTitlesToUrgent } from '../../src/features/lower-thirds/domain/lowerThirdAssignments'
import { LOWER_THIRD_TYPES_CONFIG_KEY } from '../../src/features/lower-thirds/domain/lowerThirdTypesConfig'
import { ENTITY_TEMPLATE_NAMES_CONFIG_KEY, normalizeEntityTemplateNames } from '../../src/features/lower-thirds/domain/entityTemplateNames'
import { notifyEntityExportFailure } from './entity-export-notification'
import {
    exportEntityCsvFilesFromEntities,
    type EntityExportResult,
} from './entity-export-service'

const fsp = fs.promises

function samePath(a: string, b: string): boolean {
    return path.resolve(a) === path.resolve(b)
}

function isSafeCsvFilename(filename: string): boolean {
    return isSavedProjectFilename(filename) && filename === path.basename(filename)
        && filename.toLowerCase() !== 'current-project.json'
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
        if (filename.toLowerCase() === 'current-project.json') continue
        if (!/\.(csv|json)$/i.test(filename)) {
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

    const filename = createSavedProjectJsonFilename(payload.filename)
    if (!isSafeCsvFilename(filename)) return { ok: false, error: 'RESERVED_EDITION_FILENAME' }
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

    const edition = parseShowEdition(payload.content, getScopedShowProjectId())
    await fsp.writeFile(fullPath, serializeShowEdition(edition, getScopedShowProjectId()), 'utf-8')

    return {
        ok: true,
        filename,
        fullPath,
    }
}

async function exportEntityCsvsAfterProjectLoad(input: {
    mainWindow: BrowserWindow
    entities: ReturnType<typeof parseCsv>
    projectFolderPath: string
    workingCsvPath?: string
    exportCsvFolderPath: string
    exportPrefix: string
    restoreLegacyAssignments?: boolean
}): Promise<EntityExportResult> {
    try {
        const entities = input.entities
        const exportPaths = resolveEntityExportPaths({
            workingCsvPath: input.workingCsvPath,
            projectFolderPath: input.projectFolderPath,
            exportFolderPath: input.exportCsvFolderPath,
            exportPrefix: input.exportPrefix,
        })
        const [titlesExport, personsExport] = await Promise.all([
            fsp.readFile(exportPaths.titlesPath, 'utf-8').catch(() => undefined),
            fsp.readFile(exportPaths.personsPath, 'utf-8').catch(() => undefined),
        ])
        const types = normalizeLowerThirdTypes(getAppConfig()[LOWER_THIRD_TYPES_CONFIG_KEY])
        const entityTemplateNames = normalizeEntityTemplateNames(getAppConfig()[ENTITY_TEMPLATE_NAMES_CONFIG_KEY])
        const restoredEntities = input.restoreLegacyAssignments ? restoreLowerThirdAssignments({
            entities: migrateHotTitlesToUrgent(entities),
            titlesExport,
            personsExport,
            types,
            exportPrefix: input.exportPrefix,
            onWarning: (message) => console.warn('[lower-thirds]', message),
        }) : migrateHotTitlesToUrgent(entities)
        await fsp.mkdir(path.join(input.projectFolderPath, 'Saved'), { recursive: true })
        await writeFileAtomically(path.join(input.projectFolderPath, 'Saved', 'current-project.json'), serializeShowEdition(restoredEntities, getScopedShowProjectId()), 'utf-8')
        return await exportEntityCsvFilesFromEntities({
            paths: exportPaths,
            entities: restoredEntities,
            lowerThirdTypes: types,
            exportPrefix: input.exportPrefix,
            entityTemplateNames,
            showProject: getScopedShowProject(),
            onError: (error) => notifyEntityExportFailure(input.mainWindow, error),
        })
    } catch (error) {
        console.error('[entity-export] failed after csv-project:load-into-working:', error)
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        }
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
    if (!isSafeCsvFilename(payload.filename)) return { ok: false, error: 'INVALID_EDITION_FILENAME' }

    const settings = getCsvFileSettings()
    const projectFolderPath = settings.projectFolderPath.trim()
    if (!projectFolderPath) {
        return { ok: false, error: 'No project folder configured' }
    }

    const folder = await getSavedProjectsFolderPath()
    if (!folder.ok) {
        return { ok: false, error: folder.error }
    }

    const filename = payload.filename
    const savedProjectPath = path.join(folder.folderPath, filename)
    const savedProjectStat = await fsp.stat(savedProjectPath).catch(() => null)
    if (!savedProjectStat?.isFile()) {
        return { ok: false, error: 'Saved project file does not exist' }
    }

    const savedProjectContent = await fsp.readFile(savedProjectPath, 'utf-8')
    const projectEntities = parseShowEdition(savedProjectContent, getScopedShowProjectId())
    const currentStatePath = path.join(projectFolderPath, 'Saved', 'current-project.json')
    const currentState = await fsp.readFile(currentStatePath, 'utf-8').catch(() => '')
    if (currentState) {
        const backupFolderPath = path.join(projectFolderPath, 'Backup')
        await fsp.mkdir(backupFolderPath, { recursive: true })
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        await fsp.writeFile(path.join(backupFolderPath, `project-${timestamp}.json`), currentState, 'utf-8')
    }
    const exportResult = await exportEntityCsvsAfterProjectLoad({
        mainWindow,
        entities: projectEntities,
        projectFolderPath,
        workingCsvPath: settings.workingCsvPath,
        exportCsvFolderPath: settings.exportCsvFolderPath,
        exportPrefix: settings.exportPrefix,
        restoreLegacyAssignments: !savedProjectContent.trim().startsWith('{'),
    })
    if (!exportResult.ok) {
        return {
            ok: false,
            error: `ENTITY_EXPORT_FAILED: ${exportResult.error ?? 'UNKNOWN_ERROR'}`,
        }
    }

    return {
        ok: true,
        content: await fsp.readFile(currentStatePath, 'utf-8'),
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
    scopedIpcHandle(IPC_CHANNELS.CSV_PROJECT_LIST, async () => {
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

    scopedIpcHandle(IPC_CHANNELS.CSV_PROJECT_SAVE_AS, async (_event, request: unknown) => {
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

    scopedIpcHandle(IPC_CHANNELS.CSV_PROJECT_LOAD_INTO_WORKING, async (_event, request: unknown) => {
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

    scopedIpcHandle(IPC_CHANNELS.CSV_PROJECT_DELETE, async (_event, request: unknown) => {
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

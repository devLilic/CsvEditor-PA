import { dialog, ipcMain } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { writeFile as writeFileAtomically } from 'atomically'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import type { ShowProjectsExportRequest, ShowProjectsSaveRequest, ShowProjectWorkspaceRequest } from '../../src/shared/ipc-types'
import {
    createShowProjectFile, isShowProject, isShowProjectsState, migrateShowProjectFile,
    normalizeShowProjectName, type ShowProjectsState,
} from '../../src/features/show-projects/domain/showProject'
import { normalizeLowerThirdTypes } from '../../src/features/lower-thirds/domain/lowerThirdTypesValidation'
import { normalizeEntityTemplateNames } from '../../src/features/lower-thirds/domain/entityTemplateNames'
import { normalizeDefaultProjectSettings } from '../../src/features/csv-editor/domain/defaultProjectSettings'
import { getLegacyShowSettingsSnapshot, getRawCsvFileSettings } from '../store'
import { initializeShowProjectRepository, saveShowProjectsState } from './show-project-repository'
import { ensureProjectWorkspaceFolders } from './project-workspace'
import { parseShowEdition, serializeShowEdition } from '../../src/features/show-projects/domain/showEdition'
import { parseCsv } from '../../src/features/csv-editor/utils/csvParser'
import { migrateHotTitlesToUrgent, restoreLowerThirdAssignments } from '../../src/features/lower-thirds/domain/lowerThirdAssignments'
import { resolveEntityExportPaths } from '../../src/features/entity-export/domain/exportPathResolver'

const fsp = fs.promises
async function writeMigratedEdition(filePath: string, content: string) {
    await writeFileAtomically(filePath, content, 'utf-8')
}
function getProjectFilename(name: string) {
    const safeName = normalizeShowProjectName(name).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'show-project'
    return safeName + '.talesproject.json'
}
async function state() {
    return await initializeShowProjectRepository(getLegacyShowSettingsSnapshot())
}
async function readProjects() {
    const current = await state()
    return { ok: true as const, state: current }
}
async function saveProjects(request: unknown) {
    const value = (request as Partial<ShowProjectsSaveRequest> | null)?.state
    if (!isShowProjectsState(value)) return { ok: false as const, error: 'INVALID_SHOW_PROJECTS_STATE' }
    const current = await state()
    let next = value
    if (!current) {
        const legacy = getLegacyShowSettingsSnapshot()
        const active = value.projects.find((project) => project.id === value.activeProjectId)
        if (active) {
            next = {
                ...value,
                projects: value.projects.map((project) => project.id === active.id ? {
                    ...project,
                    lowerThirdTypes: normalizeLowerThirdTypes(legacy.lowerThirdTypes),
                    entityTemplateNames: normalizeEntityTemplateNames(legacy.entityTemplateNames),
                    exportPrefix: typeof legacy.exportPrefix === 'string' ? legacy.exportPrefix : '',
                    defaultProjectSettings: normalizeDefaultProjectSettings(legacy.defaultProjectSettings),
                    phoneImage: {
                        width: typeof legacy.phoneImage?.width === 'number' && Number.isFinite(legacy.phoneImage.width) && legacy.phoneImage.width > 0 ? legacy.phoneImage.width : project.phoneImage.width,
                        height: typeof legacy.phoneImage?.height === 'number' && Number.isFinite(legacy.phoneImage.height) && legacy.phoneImage.height > 0 ? legacy.phoneImage.height : project.phoneImage.height,
                    },
                } : project),
                ...(typeof legacy.projectFolderPath === 'string' && legacy.projectFolderPath.trim()
                    ? { legacyWorkspaceMigration: { projectFolderPath: legacy.projectFolderPath.trim() } }
                    : {}),
            }
        }
    }
    return await saveShowProjectsState(next) ? { ok: true as const, state: next } : { ok: false as const, error: 'INVALID_SHOW_PROJECTS_STATE' }
}
async function importProject() {
    const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Tales show project', extensions: ['json'] }] })
    if (result.canceled || !result.filePaths[0]) return { ok: true as const, project: null }
    try {
        const imported = migrateShowProjectFile(JSON.parse(await fsp.readFile(result.filePaths[0], 'utf-8')))
        return imported ? { ok: true as const, project: imported } : { ok: false as const, error: 'INVALID_SHOW_PROJECT_FILE' }
    } catch (error) {
        if (error instanceof SyntaxError) return { ok: false as const, error: 'INVALID_SHOW_PROJECT_FILE' }
        throw error
    }
}
async function exportProject(request: unknown) {
    const project = (request as Partial<ShowProjectsExportRequest> | null)?.project
    if (!isShowProject(project)) return { ok: false as const, error: 'INVALID_SHOW_PROJECT' }
    const result = await dialog.showSaveDialog({ defaultPath: getProjectFilename(project.name), filters: [{ name: 'Tales show project', extensions: ['json'] }] })
    if (result.canceled || !result.filePath) return { ok: true as const, canceled: true }
    await fsp.writeFile(result.filePath, JSON.stringify(createShowProjectFile(project), null, 2) + '\n', 'utf-8')
    return { ok: true as const, path: result.filePath }
}
async function activateProject(request: unknown) {
    const projectId = (request as Partial<ShowProjectWorkspaceRequest> | null)?.projectId
    const current = await state()
    if (!current || typeof projectId !== 'string') return { ok: false as const, error: 'SHOW_PROJECT_NOT_FOUND', state: current }
    const project = current.projects.find((candidate) => candidate.id === projectId)
    const root = current.workspaces[projectId]
    if (!project) return { ok: false as const, error: 'SHOW_PROJECT_NOT_FOUND', state: current }
    if (!root) return { ok: false as const, error: 'SHOW_PROJECT_WORKSPACE_REQUIRED', state: current }
    const stat = await fsp.stat(root).catch(() => null)
    if (!stat?.isDirectory()) return { ok: false as const, error: 'SHOW_PROJECT_WORKSPACE_INVALID', state: current }
    const savedPath = path.join(root, 'Saved', 'current-project.json')
    const saved = await fsp.readFile(savedPath, 'utf-8').catch((error: NodeJS.ErrnoException) => error.code === 'ENOENT' ? null : Promise.reject(error))
    if (saved !== null) {
        try {
            if (!saved.trim()) throw new Error('INVALID_EDITION_FILE')
            parseShowEdition(saved, projectId)
        } catch (error) {
            return { ok: false as const, error: (error as Error).message || 'SHOW_PROJECT_CURRENT_FILE_INVALID', state: current }
        }
    }
    const folders = await ensureProjectWorkspaceFolders(root)
    const next = { ...current, activeProjectId: projectId }
    if (!await saveShowProjectsState(next)) return { ok: false as const, error: 'INVALID_SHOW_PROJECTS_STATE', state: current }
    return { ok: true as const, state: next, folders }
}
async function assignLegacyWorkspace(request: unknown) {
    const projectId = (request as Partial<ShowProjectWorkspaceRequest> | null)?.projectId
    const current = await state()
    const root = current?.legacyWorkspaceMigration?.projectFolderPath
    if (!current || typeof projectId !== 'string' || !current.projects.some((project) => project.id === projectId)) {
        return { ok: false as const, error: 'SHOW_PROJECT_NOT_FOUND', state: current }
    }
    if (!root) return { ok: false as const, error: 'NO_LEGACY_WORKSPACE', state: current }
    if (Object.entries(current.workspaces).some(([id, assignedRoot]) => id !== projectId
        && path.resolve(assignedRoot).toLocaleLowerCase() === path.resolve(root).toLocaleLowerCase())) {
        return { ok: false as const, error: 'SHOW_PROJECT_WORKSPACE_ALREADY_ASSIGNED', state: current }
    }
    const stat = await fsp.stat(root).catch(() => null)
    if (!stat?.isDirectory()) return { ok: false as const, error: 'SHOW_PROJECT_WORKSPACE_INVALID', state: current }
    const project = current.projects.find((candidate) => candidate.id === projectId)!
    await ensureProjectWorkspaceFolders(root)
    const currentStatePath = path.join(root, 'Saved', 'current-project.json')
    let saved = await fsp.readFile(currentStatePath, 'utf-8').catch((error: NodeJS.ErrnoException) => error.code === 'ENOENT' ? null : Promise.reject(error))
    if (saved !== null) {
        let entities
        try {
            if (!saved.trim()) throw new Error('INVALID_EDITION_FILE')
            entities = parseShowEdition(saved, projectId)
        } catch (error) {
            return { ok: false as const, error: (error as Error).message || 'SHOW_PROJECT_CURRENT_FILE_INVALID', state: current }
        }
        // Stamp legacy v1 snapshots with the selected show ID before binding the folder.
        saved = serializeShowEdition(entities, projectId)
        await writeMigratedEdition(currentStatePath, saved)
    } else {
        const legacyCsvPath = getRawCsvFileSettings().workingCsvPath.trim()
        if (legacyCsvPath) {
            const legacyStat = await fsp.stat(legacyCsvPath).catch(() => null)
            if (!legacyStat?.isFile()) return { ok: false as const, error: 'LEGACY_WORKING_CSV_NOT_FOUND', state: current }
            const legacyCsv = await fsp.readFile(legacyCsvPath, 'utf-8')
            const exports = resolveEntityExportPaths({ projectFolderPath: root, exportPrefix: project.exportPrefix })
            const [titlesExport, personsExport] = await Promise.all([
                fsp.readFile(exports.titlesPath, 'utf-8').catch(() => undefined),
                fsp.readFile(exports.personsPath, 'utf-8').catch(() => undefined),
            ])
            const entities = migrateHotTitlesToUrgent(restoreLowerThirdAssignments({
                entities: parseCsv(legacyCsv), titlesExport, personsExport,
                types: project.lowerThirdTypes, exportPrefix: project.exportPrefix,
            }))
            await writeMigratedEdition(currentStatePath, serializeShowEdition(entities, projectId))
        }
    }
    const next: ShowProjectsState = {
        ...current,
        workspaces: { ...current.workspaces, [projectId]: root },
        legacyWorkspaceMigration: undefined,
    }
    if (!await saveShowProjectsState(next)) return { ok: false as const, error: 'INVALID_SHOW_PROJECTS_STATE', state: current }
    return { ok: true as const, state: next }
}
async function saveProject(request: unknown) {
    const payload = request as { project?: unknown; workspacePath?: unknown } | null
    const project = payload?.project
    const current = await state()
    if (!current) return { ok: false as const, error: 'SHOW_PROJECTS_NOT_LOADED' }
    if (!isShowProject(project)) return { ok: false as const, error: 'INVALID_SHOW_PROJECT' }
    const existing = current.projects.find((candidate) => candidate.id === project.id)
    if (current.projects.some((candidate) => candidate.id !== project.id && candidate.name.toLocaleLowerCase() === project.name.toLocaleLowerCase())) {
        return { ok: false as const, error: 'PROJECT_NAME_ALREADY_EXISTS' }
    }
    let workspace = current.workspaces[project.id]
    if (typeof payload?.workspacePath === 'string' && payload.workspacePath.trim()) {
        workspace = payload.workspacePath.trim()
        const stat = await fsp.stat(workspace).catch(() => null)
        if (!stat?.isDirectory()) return { ok: false as const, error: 'SHOW_PROJECT_WORKSPACE_INVALID' }
        for (const [otherId, otherRoot] of Object.entries(current.workspaces)) {
            if (otherId !== project.id && path.resolve(otherRoot).toLocaleLowerCase() === path.resolve(workspace).toLocaleLowerCase()) {
                return { ok: false as const, error: 'SHOW_PROJECT_WORKSPACE_ALREADY_ASSIGNED' }
            }
        }
        const saved = await fsp.readFile(path.join(workspace, 'Saved', 'current-project.json'), 'utf-8').catch((error: NodeJS.ErrnoException) => error.code === 'ENOENT' ? null : Promise.reject(error))
        if (saved !== null) {
            try {
                if (!saved.trim()) throw new Error('INVALID_EDITION_FILE')
                parseShowEdition(saved, project.id)
            } catch (error) {
                return { ok: false as const, error: (error as Error).message || 'SHOW_PROJECT_CURRENT_FILE_INVALID' }
            }
        }
        await ensureProjectWorkspaceFolders(workspace)
    }
    const next = {
        ...current,
        projects: existing
            ? current.projects.map((candidate) => candidate.id === project.id ? project : candidate)
            : [...current.projects, project],
        workspaces: workspace ? { ...current.workspaces, [project.id]: workspace } : current.workspaces,
    }
    if (!await saveShowProjectsState(next)) return { ok: false as const, error: 'INVALID_SHOW_PROJECTS_STATE' }
    return { ok: true as const, state: next }
}
async function deleteProject(request: unknown) {
    const projectId = (request as { projectId?: unknown } | null)?.projectId
    const current = await state()
    if (!current || typeof projectId !== 'string' || !current.projects.some((project) => project.id === projectId)) return { ok: false as const, error: 'SHOW_PROJECT_NOT_FOUND', state: current }
    if (current.projects.length <= 1) return { ok: false as const, error: 'CANNOT_DELETE_LAST_PROJECT', state: current }
    const projects = current.projects.filter((project) => project.id !== projectId)
    const workspaces = { ...current.workspaces }
    delete workspaces[projectId]
    const activeProjectId = current.activeProjectId === projectId ? projects[0].id : current.activeProjectId
    const next = { ...current, activeProjectId, projects, workspaces }
    if (!await saveShowProjectsState(next)) return { ok: false as const, error: 'INVALID_SHOW_PROJECTS_STATE' }
    return { ok: true as const, state: next }
}

export function registerShowProjectHandlers() {
    ipcMain.handle(IPC_CHANNELS.SHOW_PROJECTS_GET, async () => {
        try { return await readProjects() } catch (error) {
            console.error('[show-projects:get] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })
    ipcMain.handle(IPC_CHANNELS.SHOW_PROJECTS_SAVE, async (_event, request: unknown) => {
        try { return await saveProjects(request) } catch (error) {
            console.error('[show-projects:save] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })
    ipcMain.handle(IPC_CHANNELS.SHOW_PROJECTS_IMPORT, async () => {
        try { return await importProject() } catch (error) {
            console.error('[show-projects:import] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })
    ipcMain.handle(IPC_CHANNELS.SHOW_PROJECTS_EXPORT, async (_event, request: unknown) => {
        try { return await exportProject(request) } catch (error) {
            console.error('[show-projects:export] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })
    ipcMain.handle(IPC_CHANNELS.SHOW_PROJECTS_ACTIVATE, async (_event, request: unknown) => {
        try { return await activateProject(request) } catch (error) {
            console.error('[show-projects:activate] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })
    ipcMain.handle(IPC_CHANNELS.SHOW_PROJECTS_ASSIGN_LEGACY_WORKSPACE, async (_event, request: unknown) => {
        try { return await assignLegacyWorkspace(request) } catch (error) {
            console.error('[show-projects:assign-legacy-workspace] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })
    ipcMain.handle(IPC_CHANNELS.SHOW_PROJECTS_SAVE_PROJECT, async (_event, request: unknown) => {
        try { return await saveProject(request) } catch (error) {
            console.error('[show-projects:save-project] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })
    ipcMain.handle(IPC_CHANNELS.SHOW_PROJECTS_DELETE_PROJECT, async (_event, request: unknown) => {
        try { return await deleteProject(request) } catch (error) {
            console.error('[show-projects:delete-project] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })
}

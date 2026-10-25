import Store from 'electron-store'
import type { AppConfig } from '../src/shared/ipc-types'
import type { DefaultProjectSettings } from '../src/features/csv-editor/domain/defaultProjectSettings'
import { FALLBACK_DEFAULT_PROJECT_SETTINGS, normalizeDefaultProjectSettings } from '../src/features/csv-editor/domain/defaultProjectSettings'
import type { PhoneImageSettings } from '../src/features/csv-editor/domain/phoneImageSettings'
import { FALLBACK_PHONE_IMAGE_SETTINGS, normalizePhoneImageSettings } from '../src/features/csv-editor/domain/phoneImageSettings'
import type { CsvFileSettings } from '../src/features/csv-editor/domain/csvFileSettings'
import { FALLBACK_CSV_FILE_SETTINGS, normalizeCsvFileSettings } from '../src/features/csv-editor/domain/csvFileSettings'
import { DEFAULT_LOWER_THIRD_TYPES } from '../src/features/lower-thirds/domain/lowerThirdTypes'
import { DEFAULT_ENTITY_TEMPLATE_NAMES } from '../src/features/lower-thirds/domain/entityTemplateNames'
import { getActiveShowProject, type LegacyShowSettingsSnapshot } from '../src/features/show-projects/domain/showProject'
import { getShowProjectsStateSync, saveShowProjectsStateSync } from './main/show-project-repository'
import { getScopedShowProject, getScopedShowProjectId, getScopedWorkspaceRoot, getScopedWorkspaceFolders } from './main/show-project-scope'
import * as path from 'node:path'

export interface AppStoreSchema {
    quickTitles: string[]
    csvFilePath: string | null
    appConfig: AppConfig
    defaultProjectSettings: DefaultProjectSettings
    phoneImageSettings: PhoneImageSettings
    csvFileSettings: CsvFileSettings
}
const store = new Store<AppStoreSchema>({ defaults: {
    quickTitles: [], csvFilePath: null, appConfig: {},
    defaultProjectSettings: FALLBACK_DEFAULT_PROJECT_SETTINGS,
    phoneImageSettings: FALLBACK_PHONE_IMAGE_SETTINGS,
    csvFileSettings: FALLBACK_CSV_FILE_SETTINGS,
} })
const storage = store as unknown as {
    get<K extends keyof AppStoreSchema>(key: K): AppStoreSchema[K]
    set<K extends keyof AppStoreSchema>(key: K, value: AppStoreSchema[K]): void
}

function activeProject() {
    const scoped = getScopedShowProject()
    if (scoped) return scoped
    const state = getShowProjectsStateSync()
    return state ? getActiveShowProject(state) : undefined
}
function updateActiveProject(projectId: string | undefined, update: (project: NonNullable<ReturnType<typeof activeProject>>) => NonNullable<ReturnType<typeof activeProject>>) {
    const state = getShowProjectsStateSync()
    if (!state) return false
    const id = projectId ?? state.activeProjectId
    const project = state.projects.find((candidate) => candidate.id === id)
    if (!project) return false
    return saveShowProjectsStateSync({ ...state, projects: state.projects.map((candidate) => candidate.id === id ? update(project) : candidate) })
}
function stateWorkspace(id?: string) {
    const scoped = getScopedWorkspaceRoot()
    if (scoped !== undefined) return scoped
    const state = getShowProjectsStateSync()
    return id && state ? state.workspaces[id] ?? '' : state ? state.workspaces[state.activeProjectId] ?? '' : ''
}

export function getCsvFilePath(): string | null {
    // V2 working content is JSON at Saved/current-project.json, not a legacy CSV pointer.
    if (getScopedShowProjectId() || activeProject()) return null
    const value = storage.get('csvFilePath')
    return typeof value === 'string' && value.length > 0 ? value : null
}
export function setCsvFilePath(value: string | null): void { storage.set('csvFilePath', value) }
export function getQuickTitles(): string[] {
    const value = storage.get('quickTitles')
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}
export function setQuickTitles(list: string[]): void { storage.set('quickTitles', list) }

export function getRawAppConfig(): AppConfig {
    const value = storage.get('appConfig')
    return value && typeof value === 'object' ? value as AppConfig : {}
}
export function getAppConfig(): AppConfig {
    const value = getRawAppConfig()
    const project = activeProject()
    const runtime = value.showRuntime && typeof value.showRuntime === 'object'
        ? value.showRuntime as Record<string, { activeTitleBackupFile?: unknown }>
        : {}
    return project ? {
        ...value,
        lowerThirdTypes: project.lowerThirdTypes,
        entityTemplateNames: project.entityTemplateNames,
        activeTitleBackupFile: runtime[project.id]?.activeTitleBackupFile ?? null,
    } : value
}
export function setAppConfig(cfg: AppConfig): AppConfig {
    const safe = cfg && typeof cfg === 'object' ? cfg : {}
    const project = activeProject()
    if (!project) {
        storage.set('appConfig', safe)
        return getAppConfig()
    }
    const current = getRawAppConfig()
    const runtime = current.showRuntime && typeof current.showRuntime === 'object'
        ? current.showRuntime as Record<string, Record<string, unknown>>
        : {}
    const { lowerThirdTypes: _types, entityTemplateNames: _names, showRuntime: _runtime, activeTitleBackupFile, ...globalConfig } = safe
    storage.set('appConfig', {
        ...current,
        ...globalConfig,
        showRuntime: Object.prototype.hasOwnProperty.call(safe, 'activeTitleBackupFile')
            ? { ...runtime, [project.id]: { ...runtime[project.id], activeTitleBackupFile } }
            : runtime,
    })
    return getAppConfig()
}
export function getRawDefaultProjectSettings(): DefaultProjectSettings { return normalizeDefaultProjectSettings(storage.get('defaultProjectSettings')) }
export function getDefaultProjectSettings(): DefaultProjectSettings { return activeProject()?.defaultProjectSettings ?? getRawDefaultProjectSettings() }
export function setDefaultProjectSettings(settings: unknown): DefaultProjectSettings {
    const safe = normalizeDefaultProjectSettings(settings)
    if (activeProject()) updateActiveProject(getScopedShowProjectId(), (current) => ({ ...current, defaultProjectSettings: safe }))
    else storage.set('defaultProjectSettings', safe)
    return getDefaultProjectSettings()
}
export function getRawPhoneImageSettings(): PhoneImageSettings { return normalizePhoneImageSettings(storage.get('phoneImageSettings')) }
export function getPhoneImageSettings(): PhoneImageSettings {
    const project = activeProject()
    if (!project) return getRawPhoneImageSettings()
    const root = stateWorkspace(getScopedShowProjectId())
    const phoneFolderPath = getScopedWorkspaceFolders()?.phoneFolderPath ?? (root ? path.join(root, 'Telefon') : '')
    return { workPath: phoneFolderPath, ...project.phoneImage }
}
export function setPhoneImageSettings(settings: unknown): PhoneImageSettings {
    const safe = normalizePhoneImageSettings(settings)
    if (activeProject()) updateActiveProject(getScopedShowProjectId(), (current) => ({ ...current, phoneImage: { width: safe.width, height: safe.height } }))
    else storage.set('phoneImageSettings', safe)
    return getPhoneImageSettings()
}
export function getRawCsvFileSettings(): CsvFileSettings { return normalizeCsvFileSettings(storage.get('csvFileSettings')) }
export function getCsvFileSettings(): CsvFileSettings {
    const project = activeProject()
    if (!project) return getRawCsvFileSettings()
    const root = stateWorkspace(getScopedShowProjectId())
    const separator = root.includes('\\') ? '\\' : '/'
    const child = (folder: string) => root ? root.replace(/[\\/]+$/, '') + separator + folder : ''
    return {
        ...FALLBACK_CSV_FILE_SETTINGS, projectFolderPath: root, exportPrefix: project.exportPrefix,
        workingCsvPath: '', backupFolderPath: child('Backup'),
        savedProjectsFolderPath: child('Saved'), exportCsvFolderPath: child('Export'),
    }
}
export function setCsvFileSettings(settings: CsvFileSettings): CsvFileSettings {
    const safe = normalizeCsvFileSettings(settings)
    const state = getShowProjectsStateSync()
    const project = activeProject()
    if (project && state) {
        const id = getScopedShowProjectId() ?? state.activeProjectId
        saveShowProjectsStateSync({
            ...state,
            projects: state.projects.map((candidate) => candidate.id === id ? { ...candidate, exportPrefix: safe.exportPrefix } : candidate),
            workspaces: safe.projectFolderPath
                ? { ...state.workspaces, [id]: safe.projectFolderPath }
                : Object.fromEntries(Object.entries(state.workspaces).filter(([workspaceId]) => workspaceId !== id)),
        })
    } else storage.set('csvFileSettings', safe)
    return getCsvFileSettings()
}
export function getLegacyShowSettingsSnapshot(): LegacyShowSettingsSnapshot {
    const config = getRawAppConfig()
    const phone = getRawPhoneImageSettings()
    const csv = getRawCsvFileSettings()
    return {
        lowerThirdTypes: config.lowerThirdTypes ?? DEFAULT_LOWER_THIRD_TYPES,
        entityTemplateNames: config.entityTemplateNames ?? DEFAULT_ENTITY_TEMPLATE_NAMES,
        exportPrefix: csv.exportPrefix,
        defaultProjectSettings: getRawDefaultProjectSettings(),
        phoneImage: { width: phone.width, height: phone.height },
        projectFolderPath: csv.projectFolderPath,
    }
}
export default store

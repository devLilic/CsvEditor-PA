import type { TemplateDocument } from '../../template-editor/domain/templateDocument'
import { isTemplateDocument } from '../../template-editor/domain/templateDocument'
import type { DefaultProjectSettings } from '../../csv-editor/domain/defaultProjectSettings'
import { FALLBACK_DEFAULT_PROJECT_SETTINGS, isDefaultProjectSettings } from '../../csv-editor/domain/defaultProjectSettings'
import type { EntityTemplateNames } from '../../lower-thirds/domain/entityTemplateNames'
import { DEFAULT_ENTITY_TEMPLATE_NAMES, normalizeEntityTemplateNames } from '../../lower-thirds/domain/entityTemplateNames'
import type { LowerThirdTypeDefinition } from '../../lower-thirds/domain/lowerThirdTypes'
import { DEFAULT_LOWER_THIRD_TYPES } from '../../lower-thirds/domain/lowerThirdTypes'
import { validateLowerThirdTypes, normalizeLowerThirdTypes } from '../../lower-thirds/domain/lowerThirdTypesValidation'
import type { PersonDisplayMode } from '../../template-editor/domain/personTemplateCompatibility'

export const SHOW_PROJECTS_VERSION = 2
export const SHOW_PROJECT_FILE_FORMAT = 'tales-show-project'
export const SHOW_PROJECT_FILE_VERSION = 2

export type QuickTitleMode = 'supratitle-title' | 'title-prefix'

export type ShowProject = {
    id: string
    name: string
    /** Controls whether this show's editor exposes the add-BETA section action. */
    betaSectionButtonEnabled?: boolean
    personDisplayMode?: PersonDisplayMode
    /** Controls how Quick Titles are entered for this show's title graphics. */
    quickTitleMode?: QuickTitleMode
    lowerThirdTypesEnabled: boolean
    document: TemplateDocument
    defaultDocument: TemplateDocument
    lowerThirdTypes: LowerThirdTypeDefinition[]
    entityTemplateNames: EntityTemplateNames
    exportPrefix: string
    defaultProjectSettings: DefaultProjectSettings
    phoneImage: { width: number; height: number }
}

export type ShowProjectsState = {
    version: 2
    activeProjectId: string
    projects: ShowProject[]
    /** Local workspace bindings; deliberately omitted from portable project files. */
    workspaces: Record<string, string>
    legacyWorkspaceMigration?: { projectFolderPath: string }
}

export type ShowProjectFile = {
    format: typeof SHOW_PROJECT_FILE_FORMAT
    version: 2
    project: ShowProject
}

export type LegacyShowProject = {
    id: string
    name: string
    lowerThirdTypesEnabled?: boolean
    document: TemplateDocument
    defaultDocument: TemplateDocument
}

export type LegacyShowProjectsState = {
    version: 1
    activeProjectId: string
    projects: LegacyShowProject[]
}

export type LegacyShowProjectFile = {
    format: typeof SHOW_PROJECT_FILE_FORMAT
    version: 1
    project: LegacyShowProject
}

export type LegacyShowSettingsSnapshot = {
    lowerThirdTypes?: unknown
    entityTemplateNames?: unknown
    exportPrefix?: unknown
    defaultProjectSettings?: unknown
    phoneImage?: { width?: unknown; height?: unknown }
    projectFolderPath?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

export function normalizeShowProjectName(value: string): string {
    return value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80)
}

export function createShowProjectId(name: string, existingIds: string[]): string {
    const base = normalizeShowProjectName(name)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'show'
    const existing = new Set(existingIds)
    if (!existing.has(base)) return base
    let suffix = 2
    while (existing.has(`${base}-${suffix}`)) suffix += 1
    return `${base}-${suffix}`
}

function standardConfig(snapshot: LegacyShowSettingsSnapshot = {}) {
    const phoneImage = snapshot.phoneImage ?? {}
    const width = typeof phoneImage.width === 'number' && Number.isFinite(phoneImage.width) && phoneImage.width > 0 ? phoneImage.width : 420
    const height = typeof phoneImage.height === 'number' && Number.isFinite(phoneImage.height) && phoneImage.height > 0 ? phoneImage.height : 540
    return {
        betaSectionButtonEnabled: true,
        personDisplayMode: 'single-line' as const,
        quickTitleMode: 'supratitle-title' as const,
        lowerThirdTypesEnabled: true,
        lowerThirdTypes: normalizeLowerThirdTypes(snapshot.lowerThirdTypes),
        entityTemplateNames: normalizeEntityTemplateNames(snapshot.entityTemplateNames),
        exportPrefix: typeof snapshot.exportPrefix === 'string'
            ? [...snapshot.exportPrefix].filter((character) => character.charCodeAt(0) !== 92 && !'/:*?"<>|'.includes(character) && character.charCodeAt(0) >= 32).join('').trim()
            : '',
        defaultProjectSettings: isDefaultProjectSettings(snapshot.defaultProjectSettings)
            ? clone(snapshot.defaultProjectSettings)
            : clone(FALLBACK_DEFAULT_PROJECT_SETTINGS),
        phoneImage: { width, height },
    }
}

/** Create the standard flat show config around renderer-supplied bundled templates. */
export function createStandardShowProject(id: string, name: string, document: TemplateDocument): ShowProject {
    const normalizedName = normalizeShowProjectName(name)
    const projectDocument = clone(document)
    projectDocument.show = id
    return {
        id,
        name: normalizedName || 'Tales',
        ...standardConfig(),
        document: projectDocument,
        defaultDocument: clone(projectDocument),
    }
}

/** Clone a show's configuration and templates. Workspace bindings/content are registry-local and not cloned. */
export function cloneShowProject(project: ShowProject, id: string, name: string): ShowProject {
    const copy = clone(project)
    copy.id = id
    copy.name = normalizeShowProjectName(name) || project.name
    copy.document.show = id
    copy.defaultDocument.show = id
    return copy
}

export function isShowProject(value: unknown): value is ShowProject {
    if (!isRecord(value)) return false
    return typeof value.id === 'string' && value.id.length > 0
        && typeof value.name === 'string' && normalizeShowProjectName(value.name).length > 0
        && (value.betaSectionButtonEnabled === undefined || typeof value.betaSectionButtonEnabled === 'boolean')
        && (value.personDisplayMode === undefined || value.personDisplayMode === 'single-line' || value.personDisplayMode === 'two-lines')
        && (value.quickTitleMode === undefined || value.quickTitleMode === 'supratitle-title' || value.quickTitleMode === 'title-prefix')
        && typeof value.lowerThirdTypesEnabled === 'boolean'
        && isTemplateDocument(value.document) && isTemplateDocument(value.defaultDocument)
        && validateLowerThirdTypes(value.lowerThirdTypes)
        && (value.lowerThirdTypes as LowerThirdTypeDefinition[]).some((type) => type.id === 'ordinary')
        && isRecord(value.entityTemplateNames)
        && ['locations', 'phones', 'waitTitles', 'waitLocations'].every((key) => typeof (value.entityTemplateNames as Record<string, unknown>)[key] === 'string' && ((value.entityTemplateNames as Record<string, string>)[key]).trim().length > 0)
        && typeof value.exportPrefix === 'string'
        && isDefaultProjectSettings(value.defaultProjectSettings)
        && isRecord(value.phoneImage)
        && typeof value.phoneImage.width === 'number' && Number.isFinite(value.phoneImage.width) && value.phoneImage.width > 0
        && typeof value.phoneImage.height === 'number' && Number.isFinite(value.phoneImage.height) && value.phoneImage.height > 0
}

export function isShowProjectsState(value: unknown): value is ShowProjectsState {
    if (!isRecord(value) || value.version !== SHOW_PROJECTS_VERSION) return false
    if (typeof value.activeProjectId !== 'string' || !Array.isArray(value.projects) || value.projects.length === 0 || !isRecord(value.workspaces)) return false
    if (!value.projects.every(isShowProject)) return false
    const projects = value.projects as ShowProject[]
    const ids = projects.map((project) => project.id)
    const names = projects.map((project) => normalizeShowProjectName(project.name).toLocaleLowerCase())
    const bindings = value.workspaces as Record<string, unknown>
    if (Object.entries(bindings).some(([id, root]) => !ids.includes(id) || typeof root !== 'string' || root.trim().length === 0)) return false
    if (value.legacyWorkspaceMigration !== undefined) {
        if (!isRecord(value.legacyWorkspaceMigration) || typeof value.legacyWorkspaceMigration.projectFolderPath !== 'string' || !value.legacyWorkspaceMigration.projectFolderPath.trim()) return false
    }
    return new Set(ids).size === ids.length && new Set(names).size === names.length && ids.includes(value.activeProjectId)
}

function migrateProject(value: LegacyShowProject, snapshot: LegacyShowSettingsSnapshot): ShowProject {
    return {
        ...standardConfig(snapshot),
        ...clone(value),
        lowerThirdTypesEnabled: value.lowerThirdTypesEnabled !== false,
    }
}

/** Migrate v1 registry using one snapshot of the legacy global settings. */
export function migrateShowProjectsState(value: unknown, legacySettingsSnapshot: LegacyShowSettingsSnapshot = {}): ShowProjectsState | null {
    if (isShowProjectsState(value)) return clone(value)
    if (!isRecord(value) || value.version !== 1 || typeof value.activeProjectId !== 'string' || !Array.isArray(value.projects) || !value.projects.length) return null
    const legacyProjects = value.projects as unknown[]
    if (!legacyProjects.every((project) => isRecord(project) && typeof project.id === 'string' && typeof project.name === 'string' && isTemplateDocument(project.document) && isTemplateDocument(project.defaultDocument))) return null
    const projects = legacyProjects.map((project) => migrateProject(project as unknown as LegacyShowProject, legacySettingsSnapshot))
    const ids = projects.map((project) => project.id)
    if (!ids.includes(value.activeProjectId) || new Set(ids).size !== ids.length) return null
    const workspaceRoot = typeof legacySettingsSnapshot.projectFolderPath === 'string' ? legacySettingsSnapshot.projectFolderPath.trim() : ''
    return {
        version: 2,
        activeProjectId: value.activeProjectId,
        projects,
        workspaces: {},
        ...(workspaceRoot ? { legacyWorkspaceMigration: { projectFolderPath: workspaceRoot } } : {}),
    }
}

export function migrateShowProjectFile(value: unknown): ShowProject | null {
    if (!isRecord(value) || value.format !== SHOW_PROJECT_FILE_FORMAT) return null
    if (value.version === 2 && isShowProject(value.project)) return clone(value.project)
    if (value.version === 1 && isRecord(value.project)) {
        const project = value.project
        if (typeof project.id !== 'string' || typeof project.name !== 'string' || !isTemplateDocument(project.document) || !isTemplateDocument(project.defaultDocument)) return null
        return migrateProject(project as unknown as LegacyShowProject, {})
    }
    return null
}

export function isShowProjectFile(value: unknown): value is ShowProjectFile {
    return isRecord(value) && value.format === SHOW_PROJECT_FILE_FORMAT && value.version === 2 && isShowProject(value.project)
}

export function getActiveShowProject(state: ShowProjectsState): ShowProject {
    return state.projects.find((project) => project.id === state.activeProjectId) ?? state.projects[0]
}

export function createShowProjectFile(project: ShowProject): ShowProjectFile {
    return { format: SHOW_PROJECT_FILE_FORMAT, version: SHOW_PROJECT_FILE_VERSION, project: clone(project) }
}

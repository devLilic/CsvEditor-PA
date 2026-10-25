import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import type { ReactNode } from 'react'
import type { BroadcastTemplate } from '@/shared/preview/templateContract'
import { broadcastTemplates } from '@/templates/broadcast'
import bundledDefaultTemplateDocument from '@/templates/broadcast/defaultTemplates.pa.json'
import paBg from '@/assets/bg/PA_bg.png'
import paPhoneBg from '@/assets/bg/PA_phone_bg.png'
import phoneCallsBackground from '@/assets/bg/phoneCalls_background.png'
import {
    createTemplateDocumentFromTemplates,
    type TemplateDocument,
    type TemplateDocumentTemplates,
} from '@/features/template-editor/domain/templateDocument'
import { resolveTemplateDocument } from '@/features/template-editor/domain/templateResolver'
import { enforceFixedTemplateFields } from '@/features/template-editor/domain/fixedTemplateFields'
import {
    applyPersonDisplayMode,
    type PersonDisplayMode,
} from '@/features/template-editor/domain/personTemplateCompatibility'
import type { LowerThirdEntityKind } from '@/features/lower-thirds/domain/lowerThirdTypes'
import { templateEditorStorageService } from '@/features/template-editor/services/templateEditorStorageService'
import { csvService } from '@/features/csv-editor/services/csvService'
import { showProjectStorageService } from '@/features/show-projects/services/showProjectStorageService'
import {
    createShowProjectId,
    createStandardShowProject,
    getActiveShowProject,
    normalizeShowProjectName,
    type ShowProject,
    type ShowProjectsState,
} from '@/features/show-projects/domain/showProject'

export type EditableTemplateEntityType = keyof TemplateDocumentTemplates

type SaveTemplatesResult = {
    ok: boolean
    error?: string
    warning?: string
}

export type WorkingCopyFlushResult = {
    ok: boolean
    error?: string
    snapshot?: { content: string; entities: import('@/features/csv-editor/domain/entities').EntitiesState }
}

type WorkingCopyFlusher = (projectId: string) => Promise<WorkingCopyFlushResult>
type AdminNavigationGuard = (route: string) => Promise<boolean>

const DEV_DEFAULT_SAVE_WARNING =
    'Template-urile au fost salvate local, dar defaultTemplates.pa.json nu a putut fi actualizat.'
export type TemplateDocumentContextValue = {
    document: TemplateDocument
    defaultDocument: TemplateDocument
    projects: ShowProject[]
    activeProjectId: string
    activeProject: ShowProject | null
    workspaces: Record<string, string>
    legacyWorkspaceMigration: { projectFolderPath: string } | null
    lowerThirdTypesEnabled: boolean
    projectError: string | null
    activateProject(projectId: string): Promise<{ ok: boolean; error?: string }>
    saveProject(project: ShowProject, workspacePath: string): Promise<{ ok: boolean; error?: string }>
    exportProject(project: ShowProject): Promise<{ ok: boolean; error?: string; canceled?: boolean }>
    assignLegacyWorkspace(projectId: string): Promise<{ ok: boolean; state?: ShowProjectsState; error?: string }>
    reloadProjects(): Promise<{ ok: boolean; error?: string }>
    registerWorkingCopyFlusher(flusher: WorkingCopyFlusher): () => void
    flushWorkingCopy(): Promise<WorkingCopyFlushResult>
    registerAdminNavigationGuard(guard: AdminNavigationGuard): () => void
    guardAdminNavigation(route: string): Promise<boolean>
    selectProject(projectId: string): Promise<{ ok: boolean; error?: string }>
    createProject(name: string): Promise<{ ok: boolean; error?: string }>
    renameProject(projectId: string, name: string): Promise<{ ok: boolean; error?: string }>
    deleteProject(projectId: string): Promise<{ ok: boolean; error?: string }>
    setProjectLowerThirdTypesEnabled(projectId: string, enabled: boolean): Promise<{ ok: boolean; error?: string }>
    importProject(): Promise<{ ok: boolean; project?: ShowProject; error?: string; canceled?: boolean }>
    exportActiveProject(): Promise<{ ok: boolean; error?: string; canceled?: boolean }>
    isLoaded: boolean
    isDirty: boolean
    updateTemplate(entityType: EditableTemplateEntityType, template: BroadcastTemplate): void
    updateLowerThirdVariant(kind: LowerThirdEntityKind, typeId: string, template: BroadcastTemplate): void
    setTemplateEntityEnabled(entityType: EditableTemplateEntityType, enabled: boolean): void
    resetTemplateToDefault(entityType: EditableTemplateEntityType): void
    resetLowerThirdVariantToDefault(kind: LowerThirdEntityKind, typeId: string): void
    discardUnsavedChanges(): void
    saveTemplates(): Promise<SaveTemplatesResult>
    markClean(): void
}

const TemplateDocumentContext = createContext<TemplateDocumentContextValue | null>(null)

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

export function hydrateRuntimeAssets(document: TemplateDocument, personDisplayMode: PersonDisplayMode = 'single-line'): TemplateDocument {
    const nextDocument = applyPersonDisplayMode(enforceFixedTemplateFields(clone(document)), personDisplayMode)
    const backgroundMap: Record<string, string> = {
        'src/assets/bg/PA_bg.png': paBg,
        'src/assets/bg/PA_phone_bg.png': paPhoneBg,
        'src/assets/bg/phoneCalls_background.png': phoneCallsBackground,
    }

    const allTemplates = [
        ...Object.values(nextDocument.templates),
        ...Object.values(nextDocument.lowerThirdVariants).flatMap((variants) => Object.values(variants)),
    ]
    for (const template of allTemplates) {
        const background = template.canvas.background
        if (background.type === 'image') {
            background.value = backgroundMap[background.value] ?? background.value
        }
    }

    return nextDocument
}

export function dehydrateRuntimeAssets(document: TemplateDocument): TemplateDocument {
    const nextDocument = enforceFixedTemplateFields(clone(document))
    const backgroundMap: Record<string, string> = {
        [paBg]: 'src/assets/bg/PA_bg.png',
        [paPhoneBg]: 'src/assets/bg/PA_phone_bg.png',
        [phoneCallsBackground]: 'src/assets/bg/phoneCalls_background.png',
    }

    const allTemplates = [
        ...Object.values(nextDocument.templates),
        ...Object.values(nextDocument.lowerThirdVariants).flatMap((variants) => Object.values(variants)),
    ]
    for (const template of allTemplates) {
        const background = template.canvas.background
        if (background.type === 'image') {
            background.value = backgroundMap[background.value] ?? background.value
        }
    }

    return nextDocument
}

function setDocumentShow(document: TemplateDocument, showId: string): TemplateDocument {
    const nextDocument = clone(document)
    nextDocument.show = showId
    return nextDocument
}

function dehydrateProject(project: ShowProject): ShowProject {
    return {
        ...project,
        document: dehydrateRuntimeAssets(project.document),
        defaultDocument: dehydrateRuntimeAssets(project.defaultDocument),
    }
}

export function prepareProjectForRuntime(project: ShowProject): ShowProject {
    const personDisplayMode = project.personDisplayMode ?? 'single-line'
    return {
        ...project,
        document: hydrateRuntimeAssets(project.document, personDisplayMode),
        defaultDocument: hydrateRuntimeAssets(project.defaultDocument, personDisplayMode),
    }
}

function createHardcodedDocument() {
    return createTemplateDocumentFromTemplates(broadcastTemplates)
}

function createDefaultDocument(
    hardcodedDocument: TemplateDocument,
    bundledDefaultDocument: unknown = bundledDefaultTemplateDocument,
) {
    return hydrateRuntimeAssets(resolveTemplateDocument({
        bundledDefaultDocument,
        hardcodedDocument,
    }))
}

type TemplateDocumentProviderProps = {
    children: ReactNode
    bundledDefaultDocument?: unknown
}

export function TemplateDocumentProvider({
    children,
    bundledDefaultDocument = bundledDefaultTemplateDocument,
}: TemplateDocumentProviderProps) {
    const hardcodedDocument = useMemo(() => createHardcodedDocument(), [])
    const initialDefaultDocument = useMemo(
        () => createDefaultDocument(hardcodedDocument, bundledDefaultDocument),
        [bundledDefaultDocument, hardcodedDocument],
    )
    const [defaultDocument, setDefaultDocument] = useState<TemplateDocument>(initialDefaultDocument)
    const [document, setDocument] = useState<TemplateDocument>(initialDefaultDocument)
    const [cleanDocument, setCleanDocument] = useState<TemplateDocument>(initialDefaultDocument)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const [projectsState, setProjectsState] = useState<ShowProjectsState | null>(null)
    const [projectError, setProjectError] = useState<string | null>(null)
    const flusherRef = useRef<WorkingCopyFlusher | null>(null)
    const adminNavigationGuardRef = useRef<AdminNavigationGuard | null>(null)

    useEffect(() => {
        let isMounted = true

        async function loadTemplateDocument() {
            const nextDefaultDocument = createDefaultDocument(hardcodedDocument, bundledDefaultDocument)
            const storedProjects = await showProjectStorageService.get()
            let nextProjectsState = storedProjects.ok ? storedProjects.state : null
            let initialProjectError = storedProjects.ok ? null : storedProjects.error ?? 'SHOW_PROJECTS_LOAD_FAILED'

            if (!nextProjectsState && storedProjects.ok) {
                const legacyResponse = await templateEditorStorageService.getUserTemplateDocument()
                const legacyDocument = legacyResponse.ok ? legacyResponse.document : null
                const nextDocument = hydrateRuntimeAssets(resolveTemplateDocument({
                    userDocument: legacyDocument,
                    bundledDefaultDocument: nextDefaultDocument,
                    hardcodedDocument,
                }))
                const initialProjectId = 'csv-editor-pa'
                const initialProject: ShowProject = {
                    ...createStandardShowProject(initialProjectId, 'Tales', setDocumentShow(nextDocument, initialProjectId)),
                    defaultDocument: dehydrateRuntimeAssets(setDocumentShow(nextDefaultDocument, initialProjectId)),
                    document: dehydrateRuntimeAssets(setDocumentShow(nextDocument, initialProjectId)),
                }
                nextProjectsState = {
                    version: 2,
                    activeProjectId: initialProjectId,
                    projects: [initialProject],
                    workspaces: {},
                }
                const saveResult = await showProjectStorageService.save(nextProjectsState)
                if (!saveResult.ok) initialProjectError = saveResult.error ?? 'SHOW_PROJECTS_SAVE_FAILED'
                else if (saveResult.state) nextProjectsState = saveResult.state
            }

            if (!nextProjectsState) {
                const initialProjectId = 'csv-editor-pa'
                const initialProject: ShowProject = {
                    ...createStandardShowProject(initialProjectId, 'Tales', setDocumentShow(nextDefaultDocument, initialProjectId)),
                    document: dehydrateRuntimeAssets(setDocumentShow(nextDefaultDocument, initialProjectId)),
                    defaultDocument: dehydrateRuntimeAssets(setDocumentShow(nextDefaultDocument, initialProjectId)),
                }
                nextProjectsState = { version: 2, activeProjectId: initialProjectId, projects: [initialProject], workspaces: {} }
            }

            const activeProject = prepareProjectForRuntime(getActiveShowProject(nextProjectsState))
            const nextDocument = activeProject.document
            await (window as any)?.electronAPI?.setShowProjectScope?.(activeProject.id)

            if (!isMounted) return

            setDefaultDocument(activeProject.defaultDocument)
            setDocument(nextDocument)
            setCleanDocument(nextDocument)
            setIsDirty(false)
            setProjectsState(nextProjectsState)
            setProjectError(initialProjectError)
            setIsLoaded(true)
        }

        void loadTemplateDocument()

        return () => {
            isMounted = false
        }
    }, [bundledDefaultDocument, hardcodedDocument])

    const updateTemplate = useCallback((
        entityType: EditableTemplateEntityType,
        template: BroadcastTemplate,
    ) => {
        setDocument((currentDocument) => ({
            ...currentDocument,
            templates: {
                ...currentDocument.templates,
                [entityType]: clone(template),
            },
            ...(entityType === 'titles' || entityType === 'persons'
                ? {
                    lowerThirdVariants: {
                        ...currentDocument.lowerThirdVariants,
                        [entityType]: {
                            ...currentDocument.lowerThirdVariants[entityType],
                            ordinary: clone(template),
                        },
                    },
                }
                : {}),
        }))
        setIsDirty(true)
    }, [])

    const updateLowerThirdVariant = useCallback((
        kind: LowerThirdEntityKind,
        typeId: string,
        template: BroadcastTemplate,
    ) => {
        setDocument((currentDocument) => ({
            ...currentDocument,
            lowerThirdVariants: {
                ...currentDocument.lowerThirdVariants,
                [kind]: {
                    ...currentDocument.lowerThirdVariants[kind],
                    [typeId]: (() => {
                        const nextTemplate = clone(template)
                        if (!currentDocument.lowerThirdVariants[kind][typeId]
                            && typeId !== 'ordinary'
                            && !nextTemplate.id.endsWith(`-${typeId}`)) {
                            nextTemplate.id = `${nextTemplate.id}-${typeId}`
                        }
                        return nextTemplate
                    })(),
                },
            },
            ...(typeId === 'ordinary'
                ? { templates: { ...currentDocument.templates, [kind]: clone(template) } }
                : {}),
        }))
        setIsDirty(true)
    }, [])

    const setTemplateEntityEnabled = useCallback((
        entityType: EditableTemplateEntityType,
        enabled: boolean,
    ) => {
        setDocument((currentDocument) => {
            const disabled = new Set(currentDocument.disabledEntityTypes ?? [])
            if (enabled) disabled.delete(entityType)
            else disabled.add(entityType)
            const disabledEntityTypes = [...disabled]
            return {
                ...currentDocument,
                disabledEntityTypes: disabledEntityTypes.length > 0
                    ? disabledEntityTypes
                    : undefined,
            }
        })
        setIsDirty(true)
    }, [])

    const resetTemplateToDefault = useCallback((entityType: EditableTemplateEntityType) => {
        setDocument((currentDocument) => ({
            ...currentDocument,
            templates: {
                ...currentDocument.templates,
                [entityType]: clone(defaultDocument.templates[entityType]),
            },
            ...(entityType === 'titles' || entityType === 'persons'
                ? {
                    lowerThirdVariants: {
                        ...currentDocument.lowerThirdVariants,
                        [entityType]: {
                            ...currentDocument.lowerThirdVariants[entityType],
                            ordinary: clone(defaultDocument.lowerThirdVariants[entityType].ordinary),
                        },
                    },
                }
                : {}),
        }))
        setIsDirty(true)
    }, [defaultDocument])

    const resetLowerThirdVariantToDefault = useCallback((kind: LowerThirdEntityKind, typeId: string) => {
        setDocument((currentDocument) => ({
            ...currentDocument,
            lowerThirdVariants: {
                ...currentDocument.lowerThirdVariants,
                [kind]: {
                    ...currentDocument.lowerThirdVariants[kind],
                    [typeId]: (() => {
                        const defaultVariant = defaultDocument.lowerThirdVariants[kind][typeId]
                            ?? defaultDocument.lowerThirdVariants[kind].ordinary
                        const nextTemplate = clone(defaultVariant)
                        if (!defaultDocument.lowerThirdVariants[kind][typeId]
                            && !nextTemplate.id.endsWith(`-${typeId}`)) {
                            nextTemplate.id = `${nextTemplate.id}-${typeId}`
                        }
                        return nextTemplate
                    })(),
                },
            },
            ...(typeId === 'ordinary'
                ? { templates: { ...currentDocument.templates, [kind]: clone(defaultDocument.lowerThirdVariants[kind][typeId]) } }
                : {}),
        }))
        setIsDirty(true)
    }, [defaultDocument])

    const markClean = useCallback(() => {
        setCleanDocument(clone(document))
        setIsDirty(false)
    }, [document])

    const discardUnsavedChanges = useCallback(() => {
        setDocument(clone(cleanDocument))
        setIsDirty(false)
    }, [cleanDocument])

    const persistProjectsState = useCallback(async (nextState: ShowProjectsState) => {
        const result = await showProjectStorageService.save({
            ...nextState,
            projects: nextState.projects.map(dehydrateProject),
        })
        if (!result.ok) {
            setProjectError(result.error ?? 'SHOW_PROJECTS_SAVE_FAILED')
            return false
        }
        const savedState = result.state ?? nextState
        setProjectsState(savedState)
        if (savedState.activeProjectId !== nextState.activeProjectId) {
            await (window as any)?.electronAPI?.setShowProjectScope?.(savedState.activeProjectId)
        }
        setProjectError(null)
        return true
    }, [])

    const registerWorkingCopyFlusher = useCallback((flusher: WorkingCopyFlusher) => {
        flusherRef.current = flusher
        return () => {
            if (flusherRef.current === flusher) flusherRef.current = null
        }
    }, [])

    const flushWorkingCopy = useCallback(async (): Promise<WorkingCopyFlushResult> => {
        if (!projectsState) return { ok: false, error: 'SHOW_PROJECTS_NOT_LOADED' }
        if (!flusherRef.current) return { ok: true }
        return flusherRef.current(projectsState.activeProjectId)
    }, [projectsState])

    const registerAdminNavigationGuard = useCallback((guard: AdminNavigationGuard) => {
        adminNavigationGuardRef.current = guard
        return () => {
            if (adminNavigationGuardRef.current === guard) adminNavigationGuardRef.current = null
        }
    }, [])

    const guardAdminNavigation = useCallback(async (route: string) => {
        if (!adminNavigationGuardRef.current) return true
        return adminNavigationGuardRef.current(route)
    }, [])

    const activateProject = useCallback(async (projectId: string) => {
        if (!projectsState || !projectsState.projects.some((project) => project.id === projectId)) {
            return { ok: false, error: 'PROJECT_NOT_FOUND' }
        }
        if (projectId === projectsState.activeProjectId) return { ok: true }

        const flushed = await flushWorkingCopy()
        if (!flushed.ok) return { ok: false, error: flushed.error ?? 'WORKSPACE_SAVE_FAILED' }

        const result = await showProjectStorageService.activate({ projectId })
        if (!result.ok || !result.state) return { ok: false, error: result.error ?? 'SHOW_PROJECT_ACTIVATE_FAILED' }

        const nextState = result.state
        const activeProject = prepareProjectForRuntime(getActiveShowProject(nextState))
        const api = (window as any)?.electronAPI
        await api?.setShowProjectScope?.(projectId)
        setProjectsState(nextState)
        setDocument(activeProject.document)
        setCleanDocument(clone(activeProject.document))
        setDefaultDocument(activeProject.defaultDocument)
        setIsDirty(false)
        setProjectError(null)
        return { ok: true }
    }, [flushWorkingCopy, projectsState])

    const saveProject = useCallback(async (project: ShowProject, workspacePath: string) => {
        if (!projectsState) return { ok: false, error: 'SHOW_PROJECTS_NOT_LOADED' }
        const isActive = project.id === projectsState.activeProjectId
        const oldWorkspace = projectsState.workspaces[project.id] ?? ''
        const nextWorkspace = workspacePath.trim()
        const workspaceChanged = isActive && oldWorkspace !== nextWorkspace
        const flushed = isActive && oldWorkspace ? await flushWorkingCopy() : { ok: true as const }
        if (!flushed.ok) return { ok: false, error: flushed.error ?? 'WORKSPACE_SAVE_FAILED' }

        const result = await showProjectStorageService.saveProject(dehydrateProject(project), workspacePath)
        if (!result.ok || !result.state) return { ok: false, error: result.error ?? 'SHOW_PROJECT_SAVE_FAILED' }

        if (isActive) await (window as any)?.electronAPI?.setShowProjectScope?.(project.id)
        setProjectsState(result.state)
        setProjectError(null)
        if (isActive) {
            const runtimeProject = prepareProjectForRuntime(project)
            setDocument(runtimeProject.document)
            setCleanDocument(clone(runtimeProject.document))
            setDefaultDocument(runtimeProject.defaultDocument)
            setIsDirty(false)
            const lowerThirdTypes = (project as any).lowerThirdTypes
            if (!workspaceChanged && flushed.snapshot && Array.isArray(lowerThirdTypes)) {
                const write = await csvService.write(
                    flushed.snapshot.content,
                    flushed.snapshot.entities,
                    lowerThirdTypes,
                    project.id,
                )
                if (!write.ok) return { ok: false, error: write.error ?? 'SHOW_EXPORT_REFRESH_FAILED' }
            }
        }
        return { ok: true }
    }, [flushWorkingCopy, projectsState])

    const exportProject = useCallback(async (project: ShowProject) => {
        const result = await showProjectStorageService.export(dehydrateProject(project))
        if (!result.ok) setProjectError(result.error ?? 'PROJECT_EXPORT_FAILED')
        return result
    }, [])

    const assignLegacyWorkspace = useCallback(async (projectId: string) => {
        const result = await showProjectStorageService.assignLegacyWorkspace({ projectId })
        if (!result.ok || !result.state) return { ok: false, error: result.error ?? 'LEGACY_WORKSPACE_ASSIGN_FAILED' }
        if (result.state.activeProjectId === projectId) {
            await (window as any)?.electronAPI?.setShowProjectScope?.(projectId)
        }
        setProjectsState(result.state)
        return { ok: true, state: result.state }
    }, [])

    const reloadProjects = useCallback(async () => {
        const result = await showProjectStorageService.get()
        if (!result.ok || !result.state) {
            setProjectError(result.error ?? 'SHOW_PROJECTS_LOAD_FAILED')
            return { ok: false, error: result.error ?? 'SHOW_PROJECTS_LOAD_FAILED' }
        }
        const activeProject = prepareProjectForRuntime(getActiveShowProject(result.state))
        await (window as any)?.electronAPI?.setShowProjectScope?.(result.state.activeProjectId)
        setProjectsState(result.state)
        setDocument(activeProject.document)
        setCleanDocument(clone(activeProject.document))
        setDefaultDocument(activeProject.defaultDocument)
        setIsDirty(false)
        setProjectError(null)
        return { ok: true }
    }, [])

    const selectProject = useCallback((projectId: string) => activateProject(projectId), [activateProject])

    const createProject = useCallback(async (rawName: string) => {
        if (!projectsState) return { ok: false, error: 'SHOW_PROJECTS_NOT_LOADED' }
        if (isDirty) return { ok: false, error: 'UNSAVED_TEMPLATE_CHANGES' }
        const name = normalizeShowProjectName(rawName)
        if (!name) return { ok: false, error: 'PROJECT_NAME_REQUIRED' }
        if (projectsState.projects.some((project) => project.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
            return { ok: false, error: 'PROJECT_NAME_ALREADY_EXISTS' }
        }

        const id = createShowProjectId(name, projectsState.projects.map((project) => project.id))
        const project = createStandardShowProject(id, name, setDocumentShow(document, id))
        const nextState = {
            version: 2 as const,
            activeProjectId: id,
            projects: [...projectsState.projects, { ...project, document: dehydrateRuntimeAssets(project.document), defaultDocument: dehydrateRuntimeAssets(project.defaultDocument) }],
            workspaces: projectsState.workspaces,
        }
        if (!await persistProjectsState(nextState)) return { ok: false, error: projectError ?? 'SHOW_PROJECTS_SAVE_FAILED' }
        await (window as any)?.electronAPI?.setShowProjectScope?.(id)
        const runtimeProject = prepareProjectForRuntime(project)
        setDocument(runtimeProject.document)
        setCleanDocument(clone(runtimeProject.document))
        setDefaultDocument(runtimeProject.defaultDocument)
        setIsDirty(false)
        return { ok: true }
    }, [document, isDirty, persistProjectsState, projectError, projectsState])

    const renameProject = useCallback(async (projectId: string, rawName: string) => {
        if (!projectsState) return { ok: false, error: 'SHOW_PROJECTS_NOT_LOADED' }
        const name = normalizeShowProjectName(rawName)
        if (!name) return { ok: false, error: 'PROJECT_NAME_REQUIRED' }
        if (projectsState.projects.some((project) => project.id !== projectId && project.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
            return { ok: false, error: 'PROJECT_NAME_ALREADY_EXISTS' }
        }
        if (!projectsState.projects.some((project) => project.id === projectId)) return { ok: false, error: 'PROJECT_NOT_FOUND' }

        const nextState = {
            ...projectsState,
            projects: projectsState.projects.map((project) => project.id === projectId ? { ...project, name } : project),
        }
        return await persistProjectsState(nextState)
            ? { ok: true }
            : { ok: false, error: projectError ?? 'SHOW_PROJECTS_SAVE_FAILED' }
    }, [persistProjectsState, projectError, projectsState])

    const deleteProject = useCallback(async (projectId: string) => {
        if (!projectsState) return { ok: false, error: 'SHOW_PROJECTS_NOT_LOADED' }
        if (projectsState.projects.length <= 1) return { ok: false, error: 'CANNOT_DELETE_LAST_PROJECT' }
        if (isDirty && projectsState.activeProjectId === projectId) return { ok: false, error: 'UNSAVED_TEMPLATE_CHANGES' }
        if (!projectsState.projects.some((project) => project.id === projectId)) return { ok: false, error: 'PROJECT_NOT_FOUND' }
        if (projectsState.activeProjectId === projectId) {
            const flushed = await flushWorkingCopy()
            if (!flushed.ok) return { ok: false, error: flushed.error ?? 'WORKSPACE_SAVE_FAILED' }
        }

        const removed = await showProjectStorageService.deleteProject(projectId)
        if (!removed.ok || !removed.state) {
            setProjectError(removed.error ?? 'SHOW_PROJECT_DELETE_FAILED')
            return { ok: false, error: removed.error ?? 'SHOW_PROJECT_DELETE_FAILED' }
        }
        if (removed.state.activeProjectId !== projectsState.activeProjectId) {
            await (window as any)?.electronAPI?.setShowProjectScope?.(removed.state.activeProjectId)
            const activeProject = prepareProjectForRuntime(getActiveShowProject(removed.state))
            setDocument(activeProject.document)
            setCleanDocument(clone(activeProject.document))
            setDefaultDocument(activeProject.defaultDocument)
            setIsDirty(false)
        }
        setProjectsState(removed.state)
        setProjectError(null)
        return { ok: true }
    }, [flushWorkingCopy, isDirty, projectsState])

    const setProjectLowerThirdTypesEnabled = useCallback(async (projectId: string, enabled: boolean) => {
        if (!projectsState) return { ok: false, error: 'SHOW_PROJECTS_NOT_LOADED' }
        if (!projectsState.projects.some((project) => project.id === projectId)) return { ok: false, error: 'PROJECT_NOT_FOUND' }
        const nextState = {
            ...projectsState,
            projects: projectsState.projects.map((project) => project.id === projectId
                ? { ...project, lowerThirdTypesEnabled: enabled }
                : project),
        }
        return await persistProjectsState(nextState)
            ? { ok: true }
            : { ok: false, error: projectError ?? 'SHOW_PROJECTS_SAVE_FAILED' }
    }, [persistProjectsState, projectError, projectsState])

    const importProject = useCallback(async () => {
        const result = await showProjectStorageService.import()
        if (!result.ok) {
            setProjectError(result.error ?? 'PROJECT_IMPORT_FAILED')
            return { ok: false, error: result.error ?? 'PROJECT_IMPORT_FAILED' }
        }
        if (!result.project) return { ok: true, canceled: true }
        return { ok: true, project: result.project }
    }, [])

    const exportActiveProject = useCallback(async () => {
        if (!projectsState) return { ok: false, error: 'SHOW_PROJECTS_NOT_LOADED' }
        const activeProject = getActiveShowProject(projectsState)
        const projectToExport = dehydrateProject({ ...activeProject, document })
        const result = await showProjectStorageService.export(projectToExport)
        if (!result.ok) {
            setProjectError(result.error ?? 'PROJECT_EXPORT_FAILED')
            return { ok: false, error: result.error ?? 'PROJECT_EXPORT_FAILED' }
        }
        return { ok: true, canceled: result.canceled }
    }, [document, projectsState])

    const saveTemplates = useCallback(async (): Promise<SaveTemplatesResult> => {
        if (!projectsState) return { ok: false, error: 'SHOW_PROJECTS_NOT_LOADED' }
        const activeProject = getActiveShowProject(projectsState)
        const updatedProject = { ...activeProject, document: dehydrateRuntimeAssets(document) }
        const nextState = {
            ...projectsState,
            projects: projectsState.projects.map((project) => project.id === activeProject.id ? updatedProject : project),
        }
        const saved = await persistProjectsState(nextState)
        if (!saved) return { ok: false, error: projectError ?? 'SHOW_PROJECTS_SAVE_FAILED' }

        let warning: string | undefined
        if (activeProject.id === 'csv-editor-pa') {
            const defaultSaveResult = await templateEditorStorageService.saveDevDefaultTemplateDocument(updatedProject.document)
            if (!defaultSaveResult.ok) warning = DEV_DEFAULT_SAVE_WARNING
        }

        setCleanDocument(clone(document))
        setIsDirty(false)
        return { ok: true, warning }
    }, [document, persistProjectsState, projectError, projectsState])

    const contextProjects = useMemo(
        () => projectsState?.projects.map(prepareProjectForRuntime) ?? [],
        [projectsState],
    )
    const contextActiveProject = useMemo(
        () => projectsState ? prepareProjectForRuntime(getActiveShowProject(projectsState)) : null,
        [projectsState],
    )

    const value = useMemo<TemplateDocumentContextValue>(() => ({
        document,
        defaultDocument,
        projects: contextProjects,
        activeProjectId: projectsState?.activeProjectId ?? '',
        activeProject: contextActiveProject,
        workspaces: projectsState?.workspaces ?? {},
        legacyWorkspaceMigration: projectsState?.legacyWorkspaceMigration ?? null,
        lowerThirdTypesEnabled: projectsState?.projects.find((project) => project.id === projectsState.activeProjectId)?.lowerThirdTypesEnabled !== false,
        projectError,
        activateProject,
        saveProject,
        exportProject,
        assignLegacyWorkspace,
        reloadProjects,
        registerWorkingCopyFlusher,
        flushWorkingCopy,
        registerAdminNavigationGuard,
        guardAdminNavigation,
        selectProject,
        createProject,
        renameProject,
        deleteProject,
        setProjectLowerThirdTypesEnabled,
        importProject,
        exportActiveProject,
        isLoaded,
        isDirty,
        updateTemplate,
        updateLowerThirdVariant,
        setTemplateEntityEnabled,
        resetTemplateToDefault,
        resetLowerThirdVariantToDefault,
        discardUnsavedChanges,
        saveTemplates,
        markClean,
    }), [
        document,
        defaultDocument,
        projectsState,
        contextProjects,
        contextActiveProject,
        projectError,
        activateProject,
        saveProject,
        exportProject,
        assignLegacyWorkspace,
        reloadProjects,
        registerWorkingCopyFlusher,
        flushWorkingCopy,
        registerAdminNavigationGuard,
        guardAdminNavigation,
        selectProject,
        createProject,
        renameProject,
        deleteProject,
        setProjectLowerThirdTypesEnabled,
        importProject,
        exportActiveProject,
        isLoaded,
        isDirty,
        updateTemplate,
        updateLowerThirdVariant,
        setTemplateEntityEnabled,
        resetTemplateToDefault,
        resetLowerThirdVariantToDefault,
        discardUnsavedChanges,
        saveTemplates,
        markClean,
    ])

    return (
        <TemplateDocumentContext.Provider value={value}>
            {children}
        </TemplateDocumentContext.Provider>
    )
}

export function useTemplateDocument() {
    const context = useContext(TemplateDocumentContext)
    if (!context) {
        throw new Error('useTemplateDocument must be used inside TemplateDocumentProvider')
    }

    return context
}

/** Optional variant for reusable hooks that also run in isolated legacy contexts/tests. */
export function useOptionalTemplateDocument() {
    return useContext(TemplateDocumentContext)
}

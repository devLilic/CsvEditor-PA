import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import {
    createTemplateDocumentFromTemplates,
    type TemplateDocument,
    type TemplateDocumentTemplates,
} from '../domain/templateDocument'
import type { ShowProject, ShowProjectsState } from '@/features/show-projects/domain/showProject'
import { createStandardShowProject } from '@/features/show-projects/domain/showProject'
import { showProjectStorageService } from '@/features/show-projects/services/showProjectStorageService'
import { TemplateDocumentProvider, useTemplateDocument } from './TemplateDocumentProvider'

vi.mock('@/features/show-projects/services/showProjectStorageService', () => ({
    showProjectStorageService: {
        get: vi.fn(),
        save: vi.fn(),
        saveProject: vi.fn(),
        deleteProject: vi.fn(),
        activate: vi.fn(),
        assignLegacyWorkspace: vi.fn(),
        import: vi.fn(),
        export: vi.fn(),
    },
}))

const serviceMock = vi.mocked(showProjectStorageService)

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

function createDocument(prefix: string): TemplateDocument {
    const templates = clone(broadcastTemplates) as TemplateDocumentTemplates
    return createTemplateDocumentFromTemplates({
        titles: { ...templates.titles, id: `${prefix}-titles` },
        persons: { ...templates.persons, id: `${prefix}-persons` },
        locations: { ...templates.locations, id: `${prefix}-locations` },
        phoneCalls: { ...templates.phoneCalls, id: `${prefix}-phoneCalls` },
        hotTitles: { ...templates.hotTitles, id: `${prefix}-hotTitles` },
        waitTitles: { ...templates.waitTitles, id: `${prefix}-waitTitles` },
        waitLocations: { ...templates.waitLocations, id: `${prefix}-waitLocations` },
    })
}

function createProject(id: string, name: string, prefix: string): ShowProject {
    const project = createStandardShowProject(id, name, createDocument(prefix))
    project.exportPrefix = prefix.toUpperCase()
    project.defaultDocument = clone(project.document)
    return project
}

function createState(activeProjectId = 'show-a'): ShowProjectsState {
    return {
        version: 2,
        activeProjectId,
        projects: [createProject('show-a', 'Show A', 'a'), createProject('show-b', 'Show B', 'b')],
        workspaces: { 'show-a': 'C:/shows/a', 'show-b': 'C:/shows/b' },
    }
}

function renderProvider() {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <TemplateDocumentProvider>{children}</TemplateDocumentProvider>
    )
    return renderHook(() => useTemplateDocument(), { wrapper })
}

async function waitForLoaded(result: ReturnType<typeof renderProvider>['result']) {
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
}

describe('TemplateDocumentProvider per-show runtime', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        const initialState = createState()
        serviceMock.get.mockResolvedValue({ ok: true, state: initialState })
        serviceMock.save.mockImplementation(async (state) => ({ ok: true, state }))
        serviceMock.activate.mockImplementation(async ({ projectId }) => ({
            ok: true,
            state: { ...initialState, activeProjectId: projectId },
        }))
        serviceMock.saveProject.mockImplementation(async (project, workspacePath) => ({
            ok: true,
            state: {
                ...initialState,
                projects: initialState.projects.map((existing) => existing.id === project.id ? project : existing),
                workspaces: { ...initialState.workspaces, [project.id]: workspacePath },
            },
        }))
    })

    it('loads the configured active show document and its project settings', async () => {
        const { result } = renderProvider()
        await waitForLoaded(result)

        expect(result.current.activeProjectId).toBe('show-a')
        expect(result.current.document.templates.titles.id).toBe('a-titles')
        expect(result.current.activeProject?.exportPrefix).toBe('A')
        expect(result.current.workspaces['show-a']).toBe('C:/shows/a')
    })

    it('persists template edits into the active show while leaving other shows untouched', async () => {
        const { result } = renderProvider()
        await waitForLoaded(result)
        const changedTitles = { ...result.current.document.templates.titles, id: 'a-custom-titles' }

        act(() => result.current.updateTemplate('titles', changedTitles))
        await act(async () => {
            const saved = await result.current.saveTemplates()
            expect(saved.ok).toBe(true)
        })

        const persistedState = serviceMock.save.mock.calls[0]?.[0]
        expect(persistedState?.projects.find((project) => project.id === 'show-a')?.document.templates.titles.id)
            .toBe('a-custom-titles')
        expect(persistedState?.projects.find((project) => project.id === 'show-b')?.document.templates.titles.id)
            .toBe('b-titles')
        expect(serviceMock.saveProject).not.toHaveBeenCalled()
        expect(result.current.isDirty).toBe(false)
    })

    it('activates another show and replaces the active runtime document', async () => {
        const { result } = renderProvider()
        await waitForLoaded(result)

        await act(async () => {
            expect(await result.current.activateProject('show-b')).toEqual({ ok: true })
        })

        expect(serviceMock.activate).toHaveBeenCalledWith({ projectId: 'show-b' })
        expect(result.current.activeProjectId).toBe('show-b')
        expect(result.current.document.templates.titles.id).toBe('b-titles')
    })
})

import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import { createTemplateDocumentFromTemplates } from '../domain/templateDocument'
import { createStandardShowProject, type ShowProjectsState } from '@/features/show-projects/domain/showProject'
import { showProjectStorageService } from '@/features/show-projects/services/showProjectStorageService'
import { csvService } from '@/features/csv-editor/services/csvService'
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
vi.mock('@/features/csv-editor/services/csvService', () => ({ csvService: { write: vi.fn() } }))

const showServiceMock = vi.mocked(showProjectStorageService)
const csvServiceMock = vi.mocked(csvService)

function createRegistry(activeProjectId = 'show-a'): ShowProjectsState {
    const document = createTemplateDocumentFromTemplates(broadcastTemplates)
    return {
        version: 2,
        activeProjectId,
        projects: [
            createStandardShowProject('show-a', 'Show A', document),
            createStandardShowProject('show-b', 'Show B', document),
        ],
        workspaces: { 'show-a': 'C:/Shows/A', 'show-b': 'C:/Shows/B' },
    }
}

function wrapper({ children }: { children: ReactNode }) {
    return <TemplateDocumentProvider>{children}</TemplateDocumentProvider>
}

describe('TemplateDocumentProvider runtime scope', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        csvServiceMock.write.mockResolvedValue({ ok: true })
        const state = createRegistry()
        showServiceMock.get.mockResolvedValue({ ok: true, state })
        showServiceMock.activate.mockImplementation(async ({ projectId }) => ({
            ok: true,
            state: { ...state, activeProjectId: projectId },
        }))
    })

    it('flushes the current edition with its captured show ID before activating another show', async () => {
        const { result } = renderHook(() => useTemplateDocument(), { wrapper })
        await waitFor(() => expect(result.current.isLoaded).toBe(true))

        const sequence: string[] = []
        act(() => {
            result.current.registerWorkingCopyFlusher(async (projectId) => {
                sequence.push(`flush:${projectId}`)
                return { ok: true, snapshot: { content: '{}', entities: { sections: [] } } }
            })
        })
        showServiceMock.activate.mockImplementationOnce(async ({ projectId }) => {
            sequence.push(`activate:${projectId}`)
            return { ok: true, state: { ...createRegistry(), activeProjectId: projectId } }
        })

        await act(async () => {
            expect(await result.current.activateProject('show-b')).toEqual({ ok: true })
        })

        expect(sequence).toEqual(['flush:show-a', 'activate:show-b'])
        expect(result.current.activeProjectId).toBe('show-b')
    })

    it('flushes the old workspace but does not export its snapshot into a newly selected workspace', async () => {
        const state = createRegistry()
        showServiceMock.get.mockResolvedValue({ ok: true, state })
        const { result } = renderHook(() => useTemplateDocument(), { wrapper })
        await waitFor(() => expect(result.current.isLoaded).toBe(true))
        const flusher = vi.fn(async (_projectId: string) => ({
            ok: true,
            snapshot: { content: 'old edition', entities: { sections: [] } },
        }))
        act(() => result.current.registerWorkingCopyFlusher(flusher))
        showServiceMock.saveProject.mockImplementationOnce(async (project, workspacePath) => ({
            ok: true,
            state: { ...state, workspaces: { ...state.workspaces, [project.id]: workspacePath ?? '' } },
        }))

        await act(async () => {
            expect(await result.current.saveProject(result.current.activeProject!, 'C:/Shows/New-A')).toEqual({ ok: true })
        })

        expect(flusher).toHaveBeenCalledWith('show-a')
        expect(showServiceMock.saveProject).toHaveBeenCalledOnce()
        expect(csvServiceMock.write).not.toHaveBeenCalled()
    })
})

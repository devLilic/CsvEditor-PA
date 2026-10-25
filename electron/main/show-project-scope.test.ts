import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShowProjectsState } from '../../src/features/show-projects/domain/showProject'

const mocks = vi.hoisted(() => ({
    handlers: new Map<string, (...args: any[]) => Promise<any>>(),
    state: null as unknown,
    ensureFolders: vi.fn(),
}))
vi.mock('electron', () => ({
    app: {},
    ipcMain: { handle: (channel: string, handler: (...args: any[]) => Promise<any>) => mocks.handlers.set(channel, handler) },
}))
vi.mock('../store', () => ({ getLegacyShowSettingsSnapshot: () => ({}) }))
vi.mock('./show-project-repository', () => ({
    initializeShowProjectRepository: async () => mocks.state,
    getShowProjectsStateSync: () => mocks.state,
}))
vi.mock('./project-workspace', () => ({ ensureProjectWorkspaceFolders: mocks.ensureFolders }))

import { getScopedShowProject, getScopedShowProjectId, scopedIpcHandle } from './show-project-scope'

function deferred() {
    let resolve!: () => void
    const promise = new Promise<void>((done) => { resolve = done })
    return { promise, resolve }
}

describe('show-scoped IPC operations', () => {
    beforeEach(() => {
        mocks.handlers.clear()
        mocks.state = {
            version: 2, activeProjectId: 'a',
            projects: [{ id: 'a', exportPrefix: 'PA_' }, { id: 'b', exportPrefix: 'ES_' }],
            workspaces: { a: 'C:/shows/a', b: 'C:/shows/b' },
        }
        mocks.ensureFolders.mockReset().mockImplementation(async (root: string) => ({ savedProjectsFolderPath: root + '/Saved', exportCsvFolderPath: root + '/Export' }))
    })

    it('keeps the original show config across awaits even after another show becomes active', async () => {
        const started = deferred()
        const release = deferred()
        scopedIpcHandle('csv:write', async () => {
            const prefix = getScopedShowProject()?.exportPrefix
            started.resolve()
            await release.promise
            return { id: getScopedShowProjectId(), before: prefix, after: getScopedShowProject()?.exportPrefix }
        })
        const pending = mocks.handlers.get('csv:write')!({}, {}, { showProjectId: 'a' })
        await started.promise
        const state = mocks.state as ShowProjectsState
        mocks.state = { ...state, activeProjectId: 'b', projects: state.projects.map((project) => project.id === 'a' ? { ...project, exportPrefix: 'CHANGED_' } : project) }
        release.resolve()
        expect(await pending).toEqual({ id: 'a', before: 'PA_', after: 'PA_' })
    })

    it('serializes autosave and explicit flush for the same show', async () => {
        const started = deferred()
        const release = deferred()
        const calls: number[] = []
        scopedIpcHandle('csv:write', async (_event, value: number) => {
            calls.push(value)
            if (value === 1) { started.resolve(); await release.promise }
            return { ok: true }
        })
        const handler = mocks.handlers.get('csv:write')!
        const first = handler({}, 1, { showProjectId: 'a' })
        await started.promise
        const second = handler({}, 2, { showProjectId: 'a' })
        await Promise.resolve()
        expect(calls).toEqual([1])
        release.resolve()
        await Promise.all([first, second])
        expect(calls).toEqual([1, 2])
    })

    it('does not redirect an invalid or unbound explicit show to the active show', async () => {
        const operation = vi.fn()
        scopedIpcHandle('csv:write', operation)
        const handler = mocks.handlers.get('csv:write')!
        expect(await handler({}, {}, { showProjectId: 'missing' })).toMatchObject({ ok: false, error: 'SHOW_PROJECT_NOT_FOUND' })
        ;(mocks.state as ShowProjectsState).workspaces = { b: 'C:/shows/b' }
        expect(await handler({}, {}, { showProjectId: 'a' })).toMatchObject({ ok: false, error: 'SHOW_PROJECT_WORKSPACE_REQUIRED' })
        expect(operation).not.toHaveBeenCalled()
    })
})

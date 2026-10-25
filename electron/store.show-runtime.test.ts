import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    values: new Map<string, unknown>(),
    project: undefined as any,
    saveRegistry: vi.fn(),
}))
vi.mock('electron-store', () => ({ default: class {
    get(key: string) { return mocks.values.get(key) }
    set(key: string, value: unknown) { mocks.values.set(key, value) }
} }))
vi.mock('./main/show-project-repository', () => ({ getShowProjectsStateSync: () => null, saveShowProjectsStateSync: mocks.saveRegistry }))
vi.mock('./main/show-project-scope', () => ({
    getScopedShowProject: () => mocks.project,
    getScopedShowProjectId: () => mocks.project?.id,
    getScopedWorkspaceRoot: () => undefined,
    getScopedWorkspaceFolders: () => undefined,
}))

import { getAppConfig, setAppConfig } from './store'

describe('local runtime metadata for shows', () => {
    beforeEach(() => { mocks.values.clear(); mocks.saveRegistry.mockReset(); mocks.project = undefined })

    it('keeps the active title-backup filename separate for each show', () => {
        mocks.project = { id: 'pa', lowerThirdTypes: [], entityTemplateNames: {} }
        setAppConfig({ activeTitleBackupFile: '25_10_2026_titluri.csv', uiTheme: 'dark' })
        mocks.project = { id: 'es', lowerThirdTypes: [], entityTemplateNames: {} }
        expect(getAppConfig().activeTitleBackupFile).toBeNull()
        setAppConfig({ ...getAppConfig(), activeTitleBackupFile: '25_10_2026_titluri_2.csv' })
        mocks.project = { id: 'pa', lowerThirdTypes: [], entityTemplateNames: {} }
        expect(getAppConfig()).toMatchObject({ activeTitleBackupFile: '25_10_2026_titluri.csv', uiTheme: 'dark' })
        expect(mocks.saveRegistry).not.toHaveBeenCalled()
    })

    it('does not write captured graphics configuration back when saving UI preferences or backup metadata', () => {
        const types = [{ id: 'ordinary', name: 'Current' }]
        mocks.project = { id: 'pa', lowerThirdTypes: types, entityTemplateNames: { phones: 'CurrentPhone' } }
        setAppConfig({ lowerThirdTypes: [{ id: 'ordinary', name: 'Stale' }], entityTemplateNames: { phones: 'StalePhone' }, uiTheme: 'dark' })
        expect(getAppConfig().lowerThirdTypes).toEqual(types)
        expect(getAppConfig().entityTemplateNames).toEqual({ phones: 'CurrentPhone' })
        expect(mocks.saveRegistry).not.toHaveBeenCalled()
    })
})

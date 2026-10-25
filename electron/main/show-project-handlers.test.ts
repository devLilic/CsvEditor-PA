import * as fs from 'node:fs'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import { DEFAULT_LOWER_THIRD_TYPES } from '../../src/features/lower-thirds/domain/lowerThirdTypes'
import { createEmptyEntitiesState } from '../../src/features/csv-editor/domain/entities'
import { createTemplateDocumentFromTemplates, type TemplateDocumentTemplates } from '../../src/features/template-editor/domain/templateDocument'
import { createStandardShowProject, type ShowProjectsState } from '../../src/features/show-projects/domain/showProject'
import { serializeShowEdition } from '../../src/features/show-projects/domain/showEdition'

const mocks = vi.hoisted(() => ({
    handlers: new Map<string, (...args: any[]) => Promise<any>>(),
    state: null as ShowProjectsState | null,
    userData: '',
}))
vi.mock('electron', () => ({
    app: { getPath: () => mocks.userData },
    dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
    ipcMain: { handle: (channel: string, handler: (...args: any[]) => Promise<any>) => mocks.handlers.set(channel, handler) },
}))
vi.mock('../store', () => ({
    getLegacyShowSettingsSnapshot: () => ({}),
    getRawCsvFileSettings: () => ({ workingCsvPath: '' }),
}))
vi.mock('./show-project-repository', () => ({
    initializeShowProjectRepository: async () => mocks.state,
    saveShowProjectsState: async (state: ShowProjectsState) => { mocks.state = state; return true },
}))

import { registerShowProjectHandlers } from './show-project-handlers'

const template = {
    id: 'template',
    name: 'Template',
    canvas: { width: 1920, height: 1080, background: { type: 'color', value: '#000000' } },
    layers: [],
}
const templates = {
    titles: template, persons: template, locations: template, phoneCalls: template,
    hotTitles: template, waitTitles: template, waitLocations: template,
} as unknown as TemplateDocumentTemplates
const templateDocument = createTemplateDocumentFromTemplates(templates)

function makeState(workspaces: Record<string, string> = {}, legacyWorkspaceMigration?: { projectFolderPath: string }): ShowProjectsState {
    const one = createStandardShowProject('one', 'One', templateDocument)
    const two = createStandardShowProject('two', 'Two', templateDocument)
    return {
        version: 2,
        activeProjectId: 'one',
        projects: [one, two],
        workspaces,
        legacyWorkspaceMigration,
    }
}
async function handler(channel: string, request: unknown) {
    return mocks.handlers.get(channel)!({}, request)
}

let tempRoot = ''
const testWorkspace = path.resolve('node_modules/.cache/tales-show-handler-tests')
beforeEach(() => {
    mocks.handlers.clear()
    fs.mkdirSync(testWorkspace, { recursive: true })
    tempRoot = fs.mkdtempSync(path.join(testWorkspace, 'case-'))
    mocks.userData = tempRoot
    mocks.state = makeState()
    registerShowProjectHandlers()
})
afterEach(() => {
    if (!path.resolve(tempRoot).startsWith(testWorkspace + path.sep)) throw new Error('Unsafe test cleanup path')
    fs.rmSync(tempRoot, { recursive: true, force: true })
})

describe('show project handlers', () => {
    it('rejects invalid current edition entities and leaves active show unchanged', async () => {
        const root = path.join(tempRoot, 'two')
        fs.mkdirSync(path.join(root, 'Saved'), { recursive: true })
        fs.writeFileSync(path.join(root, 'Saved', 'current-project.json'), JSON.stringify({ version: 2, showProjectId: 'two', entities: { invalid: true } }))
        mocks.state = makeState({ one: path.join(tempRoot, 'one'), two: root })
        const result = await handler(IPC_CHANNELS.SHOW_PROJECTS_ACTIVATE, { projectId: 'two' })
        expect(result).toMatchObject({ ok: false, error: 'INVALID_EDITION_FILE' })
        expect(mocks.state?.activeProjectId).toBe('one')
    })

    it('rejects a current edition stamped for a different show before activating', async () => {
        const root = path.join(tempRoot, 'two')
        fs.mkdirSync(path.join(root, 'Saved'), { recursive: true })
        fs.writeFileSync(path.join(root, 'Saved', 'current-project.json'), serializeShowEdition(createEmptyEntitiesState('invited'), 'one'))
        mocks.state = makeState({ one: path.join(tempRoot, 'one'), two: root })
        const result = await handler(IPC_CHANNELS.SHOW_PROJECTS_ACTIVATE, { projectId: 'two' })
        expect(result).toMatchObject({ ok: false, error: 'EDITION_BELONGS_TO_ANOTHER_SHOW' })
        expect(mocks.state?.activeProjectId).toBe('one')
    })

    it('rejects assigning a workspace already owned by another show', async () => {
        const root = path.join(tempRoot, 'shared')
        fs.mkdirSync(root)
        mocks.state = makeState({ one: root })
        const project = createStandardShowProject('new', 'New', templateDocument)
        const result = await handler(IPC_CHANNELS.SHOW_PROJECTS_SAVE_PROJECT, { project, workspacePath: root })
        expect(result).toMatchObject({ ok: false, error: 'SHOW_PROJECT_WORKSPACE_ALREADY_ASSIGNED' })
        expect(mocks.state?.projects.some((candidate) => candidate.id === 'new')).toBe(false)
    })

    it('migrates a legacy v1 edition to the selected show id before binding the root', async () => {
        const root = path.join(tempRoot, 'legacy')
        fs.mkdirSync(path.join(root, 'Saved'), { recursive: true })
        const entities = { sections: [{ id: 'invited', kind: 'invited', rows: [{ id: 'row', title: { id: 'title', title: 'Preserved headline' } }] }] }
        const currentPath = path.join(root, 'Saved', 'current-project.json')
        fs.writeFileSync(currentPath, serializeShowEdition(entities, undefined))
        mocks.state = makeState({}, { projectFolderPath: root })
        const result = await handler(IPC_CHANNELS.SHOW_PROJECTS_ASSIGN_LEGACY_WORKSPACE, { projectId: 'one' })
        const migrated = JSON.parse(fs.readFileSync(currentPath, 'utf-8'))
        expect(result.ok).toBe(true)
        expect(migrated.showProjectId).toBe('one')
        expect(migrated.entities.sections[0].rows[0].title.title).toBe('Preserved headline')
        expect(mocks.state?.workspaces.one).toBe(root)
        expect(mocks.state?.legacyWorkspaceMigration).toBeUndefined()
    })
})

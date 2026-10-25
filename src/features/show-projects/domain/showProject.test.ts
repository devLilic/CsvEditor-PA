import { describe, expect, it } from 'vitest'
import bundledDocument from '../../../templates/broadcast/defaultTemplates.pa.json'
import { DEFAULT_LOWER_THIRD_TYPES } from '../../lower-thirds/domain/lowerThirdTypes'
import { FALLBACK_DEFAULT_PROJECT_SETTINGS } from '../../csv-editor/domain/defaultProjectSettings'
import {
    cloneShowProject,
    createShowProjectFile,
    createStandardShowProject,
    isShowProjectsState,
    migrateShowProjectFile,
    migrateShowProjectsState,
} from './showProject'
import type { TemplateDocument } from '../../template-editor/domain/templateDocument'

const document = bundledDocument as TemplateDocument

describe('show project v2 schema', () => {
    it('creates standard scoped configuration from bundled templates', () => {
        const project = createStandardShowProject('morning-show', 'Morning show', document)
        expect(project.id).toBe('morning-show')
        expect(project.document.show).toBe('morning-show')
        expect(project.defaultDocument.show).toBe('morning-show')
        expect(project.lowerThirdTypes).toEqual(DEFAULT_LOWER_THIRD_TYPES)
        expect(project.defaultProjectSettings).toEqual(FALLBACK_DEFAULT_PROJECT_SETTINGS)
        expect(project.personDisplayMode).toBe('single-line')
        expect(isShowProjectsState({
            version: 2,
            activeProjectId: project.id,
            projects: [project],
            workspaces: {},
        })).toBe(true)
    })

    it('deep-clones a project without carrying an external workspace binding', () => {
        const original = createStandardShowProject('one', 'One', document)
        const cloned = cloneShowProject(original, 'two', 'Two')
        cloned.lowerThirdTypes[0].name = 'Changed'
        cloned.document.templates.titles.name = 'Changed'
        expect(original.lowerThirdTypes[0].name).not.toBe('Changed')
        expect(original.document.templates.titles.name).not.toBe('Changed')
        expect(cloned.document.show).toBe('two')
    })

    it('validates and preserves the selected person display mode', () => {
        const project = { ...createStandardShowProject('one', 'One', document), personDisplayMode: 'two-lines' as const }
        expect(isShowProjectsState({ version: 2, activeProjectId: 'one', projects: [project], workspaces: {} })).toBe(true)
        expect(migrateShowProjectFile(createShowProjectFile(project))?.personDisplayMode).toBe('two-lines')
    })

    it('migrates v1 registry global settings to every show and records legacy root for explicit assignment', () => {
        const legacy = {
            version: 1,
            activeProjectId: 'one',
            projects: [{
                id: 'one', name: 'One', document, defaultDocument: document,
            }],
        }
        const state = migrateShowProjectsState(legacy, {
            lowerThirdTypes: [{ ...DEFAULT_LOWER_THIRD_TYPES[0], name: 'Legacy' }],
            exportPrefix: 'PA_',
            defaultProjectSettings: { title: 'Title', personName: 'Name', personOccupation: 'Role', location: 'City' },
            phoneImage: { width: 500, height: 600 },
            projectFolderPath: 'C:/Broadcast/One',
        })
        expect(state?.projects[0].lowerThirdTypes[0].name).toBe('Legacy')
        expect(state?.projects[0].exportPrefix).toBe('PA_')
        expect(state?.projects[0].phoneImage).toEqual({ width: 500, height: 600 })
        expect(state?.legacyWorkspaceMigration).toEqual({ projectFolderPath: 'C:/Broadcast/One' })
        expect(state?.workspaces).toEqual({})
    })

    it('upgrades portable v1 files with standard settings and exports v2', () => {
        const legacy = {
            format: 'tales-show-project',
            version: 1,
            project: { id: 'one', name: 'One', document, defaultDocument: document },
        }
        const imported = migrateShowProjectFile(legacy)!
        expect(imported.lowerThirdTypes).toEqual(DEFAULT_LOWER_THIRD_TYPES)
        expect(imported.exportPrefix).toBe('')
        expect('workspacePath' in imported).toBe(false)
        expect(createShowProjectFile(imported).version).toBe(2)
    })
})

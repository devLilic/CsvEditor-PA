import { describe, expect, it } from 'vitest'
import {
    DEFAULT_PROJECT_CONTENT,
    createDefaultProjectCsv,
    createDefaultProjectEntities,
} from './defaultProject'
import { FALLBACK_DEFAULT_PROJECT_SETTINGS } from './defaultProjectSettings'
import { CSV_COLUMNS, parseCsv } from '../utils/csvParser'
import { serializeCsv } from '../utils/csvSerializer'

describe('createDefaultProjectEntities', () => {
    it('returns an invited section', () => {
        const project = createDefaultProjectEntities(FALLBACK_DEFAULT_PROJECT_SETTINGS)

        expect(project.sections).toHaveLength(1)
        expect(project.sections[0].kind).toBe('invited')
    })

    it('creates at least one row in the invited section', () => {
        const project = createDefaultProjectEntities(FALLBACK_DEFAULT_PROJECT_SETTINGS)

        expect(project.sections[0].rows.length).toBeGreaterThan(0)
    })

    it('keeps titles empty for the current default project', () => {
        const project = createDefaultProjectEntities(FALLBACK_DEFAULT_PROJECT_SETTINGS)

        expect(project.sections[0].rows.some((row) => row.title)).toBe(false)
    })

    it('can contain a standard person', () => {
        const project = createDefaultProjectEntities(FALLBACK_DEFAULT_PROJECT_SETTINGS)

        expect(
            project.sections[0].rows.some((row) => row.person?.name && row.person?.occupation)
        ).toBe(true)
    })

    it('can contain a standard location', () => {
        const project = createDefaultProjectEntities(FALLBACK_DEFAULT_PROJECT_SETTINGS)

        expect(project.sections[0].rows.some((row) => row.location?.location)).toBe(true)
    })

    it('creates the configured default hot title in INVITATI', () => {
        const project = createDefaultProjectEntities({
            ...FALLBACK_DEFAULT_PROJECT_SETTINGS,
            hotTitle: 'ULTIMA ORA DEFAULT',
        })

        expect(project.sections[0].rows[0].hotTitle?.title).toBe('ULTIMA ORA DEFAULT')
    })

    it('accepts legacy settings without a default hot title', () => {
        const project = createDefaultProjectEntities({
            title: 'LEGACY TITLE',
            personName: 'LEGACY NAME',
            personOccupation: 'LEGACY ROLE',
            location: 'LEGACY LOCATION',
        } as any)

        expect(project.sections[0].rows[0].title?.title).toBe('LEGACY TITLE')
        expect(project.sections[0].rows[0].person?.name).toBe('LEGACY NAME')
        expect(project.sections[0].rows[0].hotTitle).toBeUndefined()
    })

    it('creates ids for the section, rows, and entities', () => {
        const project = createDefaultProjectEntities(FALLBACK_DEFAULT_PROJECT_SETTINGS)
        const section = project.sections[0]
        const row = section.rows[0]

        expect(section.id).toBeTruthy()
        expect(row.id).toBeTruthy()
        expect(row.title).toBeUndefined()
        expect(row.person?.id).toBeTruthy()
        expect(row.location?.id).toBeTruthy()
    })

    it('generates different ids on consecutive calls', () => {
        const first = createDefaultProjectEntities(FALLBACK_DEFAULT_PROJECT_SETTINGS)
        const second = createDefaultProjectEntities(FALLBACK_DEFAULT_PROJECT_SETTINGS)

        expect(first.sections[0].id).not.toBe(second.sections[0].id)
        expect(first.sections[0].rows[0].id).not.toBe(second.sections[0].rows[0].id)
        expect(first.sections[0].rows[0].person?.id).not.toBe(second.sections[0].rows[0].person?.id)
        expect(first.sections[0].rows[0].location?.id).not.toBe(second.sections[0].rows[0].location?.id)
    })

    it('can be serialized to CSV and parsed back', () => {
        const project = createDefaultProjectEntities(FALLBACK_DEFAULT_PROJECT_SETTINGS)
        const csv = serializeCsv(project)
        const parsed = parseCsv(csv)

        expect(csv).toContain(CSV_COLUMNS.TITLE)
        expect(csv).toContain(CSV_COLUMNS.PERSON_NAME)
        expect(csv).toContain(CSV_COLUMNS.PERSON_OCCUPATION)
        expect(csv).toContain(CSV_COLUMNS.LOCATION)
        expect(csv).toContain(DEFAULT_PROJECT_CONTENT.personName)
        expect(csv).toContain(DEFAULT_PROJECT_CONTENT.personOccupation)
        expect(csv).toContain(DEFAULT_PROJECT_CONTENT.location)

        expect(parsed.sections[0].kind).toBe('invited')
        expect(parsed.sections[0].rows.some((row) => row.title?.title)).toBe(false)
        expect(parsed.sections[0].rows.some((row) => row.person?.name === DEFAULT_PROJECT_CONTENT.personName)).toBe(true)
        expect(parsed.sections[0].rows.some((row) => row.location?.location === DEFAULT_PROJECT_CONTENT.location)).toBe(true)
    })

    it('creates a valid default project CSV', () => {
        const csv = createDefaultProjectCsv(FALLBACK_DEFAULT_PROJECT_SETTINGS)
        const parsed = parseCsv(csv)

        expect(csv).toContain(CSV_COLUMNS.TITLE)
        expect(parsed.sections[0].kind).toBe('invited')
        expect(parsed.sections[0].rows.length).toBeGreaterThan(0)
    })

    it('uses the provided settings when creating default entities', () => {
        const project = createDefaultProjectEntities({
            title: 'CUSTOM TITLE',
            personName: 'CUSTOM NAME',
            personOccupation: 'CUSTOM OCCUPATION',
            location: 'CUSTOM LOCATION',
            hotTitle: 'CUSTOM HOT TITLE',
        })

        const row = project.sections[0].rows[0]

        expect(row.title?.title).toBe('CUSTOM TITLE')
        expect(row.person?.name).toBe('CUSTOM NAME')
        expect(row.person?.occupation).toBe('CUSTOM OCCUPATION')
        expect(row.location?.location).toBe('CUSTOM LOCATION')
        expect(row.hotTitle?.title).toBe('CUSTOM HOT TITLE')
    })

    it('does not create a title entity when provided settings have an empty title', () => {
        const project = createDefaultProjectEntities({
            title: '',
            personName: 'CUSTOM NAME',
            personOccupation: 'CUSTOM OCCUPATION',
            location: 'CUSTOM LOCATION',
            hotTitle: '',
        })

        expect(project.sections[0].rows[0].title).toBeUndefined()
    })

    it('does not create a location entity when provided settings have an empty location', () => {
        const project = createDefaultProjectEntities({
            title: '',
            personName: 'CUSTOM NAME',
            personOccupation: 'CUSTOM OCCUPATION',
            location: '',
            hotTitle: '',
        })

        expect(project.sections[0].rows[0].location).toBeUndefined()
    })

    it('does not create a location entity when provided settings location has only spaces', () => {
        const project = createDefaultProjectEntities({
            title: '',
            personName: 'CUSTOM NAME',
            personOccupation: 'CUSTOM OCCUPATION',
            location: '   ',
            hotTitle: '',
        })

        expect(project.sections[0].rows[0].location).toBeUndefined()
    })

    it('does not create a hot title entity when provided settings have an empty hot title', () => {
        const project = createDefaultProjectEntities({
            ...FALLBACK_DEFAULT_PROJECT_SETTINGS,
            hotTitle: '',
        })

        expect(project.sections[0].rows[0].hotTitle).toBeUndefined()
    })
})

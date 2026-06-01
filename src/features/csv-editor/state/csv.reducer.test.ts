import { describe, expect, it } from 'vitest'
import { csvReducer } from './csv.reducer'
import { initialCsvState } from './csv.types'
import type { CsvState } from './csv.types'
import { EntityTypes } from '../domain/entities'
import type { CsvSection } from '../domain/entities'

function stateWithSections(sections: CsvSection[], activeSectionId = sections[0]?.id ?? null): CsvState {
    return {
        ...initialCsvState,
        entities: { sections },
        isLoaded: true,
        activeSectionId,
    }
}

function invitedSection(overrides: Partial<CsvSection> = {}): CsvSection {
    return {
        id: 'invited-1',
        kind: 'invited',
        rows: [],
        ...overrides,
    }
}

function betaSection(overrides: Partial<CsvSection> = {}): CsvSection {
    return {
        id: 'beta-1',
        kind: 'beta',
        betaIndex: 1,
        betaTitle: 'Beta',
        rows: [],
        ...overrides,
    }
}

describe('csvReducer - CSV_LOADED', () => {
    it('sets isLoaded=true', () => {
        const nextState = csvReducer(initialCsvState, {
            type: 'CSV_LOADED',
            payload: { sections: [] },
        })

        expect(nextState.isLoaded).toBe(true)
    })

    it('ensures an invited section exists', () => {
        const nextState = csvReducer(initialCsvState, {
            type: 'CSV_LOADED',
            payload: { sections: [betaSection()] },
        })

        expect(nextState.entities.sections.some((section) => section.kind === 'invited')).toBe(true)
        expect(nextState.entities.sections.at(-1)?.kind).toBe('invited')
    })

    it('activates invited section when previous active section no longer exists', () => {
        const state = stateWithSections([betaSection(), invitedSection()], 'old-section-id')
        const nextInvited = invitedSection({ id: 'new-invited-id' })
        const nextState = csvReducer(state, {
            type: 'CSV_LOADED',
            payload: {
                sections: [
                    betaSection({ id: 'new-beta-id' }),
                    nextInvited,
                ],
            },
        })

        expect(nextState.activeSectionId).toBe(nextInvited.id)
    })

    it('keeps previous active section when it still exists after CSV_LOADED', () => {
        const state = stateWithSections([betaSection(), invitedSection()], 'beta-1')
        const nextState = csvReducer(state, {
            type: 'CSV_LOADED',
            payload: {
                sections: [
                    betaSection({ id: 'beta-1' }),
                    invitedSection(),
                ],
            },
        })

        expect(nextState.activeSectionId).toBe('beta-1')
    })
})

describe('csvReducer - sections', () => {
    it('SECTION_ADD_BETA adds a beta section and keeps invited last', () => {
        const state = stateWithSections([invitedSection()], 'invited-1')

        const nextState = csvReducer(state, {
            type: 'SECTION_ADD_BETA',
            payload: { betaTitle: 'Politic' },
        })

        expect(nextState.entities.sections.map((section) => section.kind)).toEqual(['beta', 'invited'])
        expect(nextState.entities.sections[0].betaTitle).toBe('Politic')
        expect(nextState.entities.sections[0].betaIndex).toBe(1)
        expect(nextState.entities.sections.at(-1)?.id).toBe('invited-1')
        expect(nextState.activeSectionId).toBe(nextState.entities.sections[0].id)
    })

    it('SECTION_DELETE_BETA does not delete invited section', () => {
        const beta = betaSection()
        const invited = invitedSection()
        const state = stateWithSections([beta, invited], beta.id)

        const nextState = csvReducer(state, {
            type: 'SECTION_DELETE_BETA',
            payload: { sectionId: invited.id },
        })

        expect(nextState).toBe(state)
        expect(nextState.entities.sections).toHaveLength(2)
        expect(nextState.entities.sections.at(-1)?.kind).toBe('invited')
    })
})

describe('csvReducer - entities', () => {
    it('does not define phoneCalls as a CSV EntityType', () => {
        expect(Object.values(EntityTypes)).not.toContain('phoneCalls')
    })

    it('ENTITY_ADD adds the entity in the correct section', () => {
        const beta = betaSection()
        const invited = invitedSection()
        const state = stateWithSections([beta, invited], beta.id)

        const nextState = csvReducer(state, {
            type: 'ENTITY_ADD',
            payload: {
                sectionId: invited.id,
                entityType: 'titles',
                data: { title: 'Breaking News' },
            },
        })

        const nextBeta = nextState.entities.sections.find((section) => section.id === beta.id)
        const nextInvited = nextState.entities.sections.find((section) => section.id === invited.id)

        expect(nextBeta?.rows).toHaveLength(0)
        expect(nextInvited?.rows).toHaveLength(1)
        expect(nextInvited?.rows[0].title?.title).toBe('Breaking News')
        expect(nextState.activeSectionId).toBe(invited.id)
        expect(nextState.activeViewType).toBe('titles')
        expect(nextState.activeEntityType).toBe('titles')
    })

    it('ENTITY_ADD keeps phoneCalls as the active view when adding a real persons entity', () => {
        const invited = invitedSection()
        const state = {
            ...stateWithSections([invited], invited.id),
            activeViewType: 'phoneCalls' as const,
            activeEntityType: 'phoneCalls' as const,
        }

        const nextState = csvReducer(state, {
            type: 'ENTITY_ADD',
            payload: {
                sectionId: invited.id,
                entityType: 'persons',
                data: {
                    name: 'Phone Guest',
                    occupation: 'Expert',
                    image: 'WORK_PATH/phone_guest.jpg',
                },
            },
        })

        expect(nextState.entities.sections[0].rows[0].person?.id).toBeTruthy()
        expect(nextState.activeViewType).toBe('phoneCalls')
        expect(nextState.activeEntityType).toBe('phoneCalls')
    })

    it('ENTITY_ADD creates a phone call as a persons entity with image', () => {
        const invited = invitedSection()
        const state = stateWithSections([invited], invited.id)

        const nextState = csvReducer(state, {
            type: 'ENTITY_ADD',
            payload: {
                sectionId: invited.id,
                entityType: 'persons',
                data: {
                    name: 'Phone Guest',
                    occupation: 'Expert',
                    image: 'WORK_PATH/phone_guest.jpg',
                },
            },
        })

        expect(nextState.entities.sections[0].rows).toHaveLength(1)
        expect(nextState.entities.sections[0].rows[0].person?.image).toBe('WORK_PATH/phone_guest.jpg')
        expect(nextState.entities.sections[0].rows[0].person).toMatchObject({
            name: 'Phone Guest',
            occupation: 'Expert',
            image: 'WORK_PATH/phone_guest.jpg',
        })
        expect(nextState.entities.sections[0].rows[0]).not.toHaveProperty('phoneCall')
        expect(nextState.entities).not.toHaveProperty('phoneCalls')
    })

    it('ENTITY_UPDATE modifies only the target entity', () => {
        const invited = invitedSection({
            rows: [
                {
                    id: 'row-1',
                    title: { id: 'title-1', title: 'Old target' },
                    person: { id: 'person-1', name: 'Person A', occupation: 'Role A' },
                },
                {
                    id: 'row-2',
                    title: { id: 'title-2', title: 'Other title' },
                },
            ],
        })
        const state = stateWithSections([invited], invited.id)

        const nextState = csvReducer(state, {
            type: 'ENTITY_UPDATE',
            payload: {
                sectionId: invited.id,
                entityType: 'titles',
                id: 'title-1',
                data: { title: 'Updated target' },
            },
        })

        const rows = nextState.entities.sections[0].rows

        expect(rows[0].title).toEqual({ id: 'title-1', title: 'Updated target' })
        expect(rows[0].person).toEqual({ id: 'person-1', name: 'Person A', occupation: 'Role A' })
        expect(rows[1].title).toEqual({ id: 'title-2', title: 'Other title' })
    })

    it('ENTITY_UPDATE updates a phone call as the existing persons entity with image', () => {
        const invited = invitedSection({
            rows: [
                {
                    id: 'row-1',
                    person: {
                        id: 'person-1',
                        name: 'Phone Guest',
                        occupation: 'Expert',
                        image: 'WORK_PATH/old_photo.jpg',
                    },
                },
            ],
        })
        const state = stateWithSections([invited], invited.id)

        const nextState = csvReducer(state, {
            type: 'ENTITY_UPDATE',
            payload: {
                sectionId: invited.id,
                entityType: 'persons',
                id: 'person-1',
                data: {
                    name: 'Phone Guest',
                    occupation: 'Analyst',
                    image: 'WORK_PATH/new_photo.jpg',
                },
            },
        })

        expect(nextState.entities.sections[0].rows).toHaveLength(1)
        expect(nextState.entities.sections[0].rows[0].person).toEqual({
            id: 'person-1',
            name: 'Phone Guest',
            occupation: 'Analyst',
            image: 'WORK_PATH/new_photo.jpg',
        })
    })

    it('ENTITY_DELETE deletes only the target entity', () => {
        const invited = invitedSection({
            rows: [
                {
                    id: 'row-1',
                    title: { id: 'title-1', title: 'Delete me' },
                    person: { id: 'person-1', name: 'Keep Person', occupation: 'Role' },
                },
                {
                    id: 'row-2',
                    title: { id: 'title-2', title: 'Keep title' },
                },
            ],
        })
        const state = stateWithSections([invited], invited.id)

        const nextState = csvReducer(state, {
            type: 'ENTITY_DELETE',
            payload: {
                sectionId: invited.id,
                entityType: 'titles',
                id: 'title-1',
            },
        })

        const rows = nextState.entities.sections[0].rows

        expect(rows).toHaveLength(2)
        expect(rows[0].title).toBeUndefined()
        expect(rows[0].person).toEqual({ id: 'person-1', name: 'Keep Person', occupation: 'Role' })
        expect(rows[1].title).toEqual({ id: 'title-2', title: 'Keep title' })
    })

    it('regression: selecting a phone call person keeps phoneCalls as the active view', () => {
        const invited = invitedSection({
            rows: [
                {
                    id: 'row-1',
                    person: {
                        id: 'person-1',
                        name: 'Phone Guest',
                        occupation: 'Expert',
                        image: 'WORK_PATH/phone_guest.jpg',
                    },
                },
            ],
        })
        const state = {
            ...stateWithSections([invited], invited.id),
            activeViewType: 'phoneCalls' as const,
            activeEntityType: 'phoneCalls' as const,
        }

        const nextState = csvReducer(state, {
            type: 'SET_SELECTED',
            payload: {
                sectionId: invited.id,
                entityType: 'persons',
                id: 'person-1',
            },
        })

        expect(nextState.selected?.entityType).toBe('persons')
        expect(nextState.activeViewType).toBe('phoneCalls')
        expect(nextState.activeEntityType).toBe('phoneCalls')
    })
})

import { describe, expect, expectTypeOf, it } from 'vitest'
import {
    EntityTypes,
    createBetaSection,
    createEmptyEntitiesState,
    createInvitedSection,
    type CsvSection,
    type EntitiesState,
    type EntityType,
    type SectionRow,
} from './entities'
import type { SectionKind } from './csv.types'

describe('PA entity domain model', () => {
    it('defines every PA entity type', () => {
        expect(EntityTypes).toEqual({
            TITLES: 'titles',
            PERSONS: 'persons',
            LOCATIONS: 'locations',
            PHONE_CALLS: 'phoneCalls',
            HOT_TITLES: 'hotTitles',
            WAIT_TITLES: 'waitTitles',
            WAIT_LOCATIONS: 'waitLocations',
        })
    })

    it('includes all seven PA values in EntityType', () => {
        const entityTypes: EntityType[] = [
            'titles',
            'persons',
            'locations',
            'phoneCalls',
            'hotTitles',
            'waitTitles',
            'waitLocations',
        ]

        expect(entityTypes).toEqual(Object.values(EntityTypes))
        expectTypeOf<EntityType>().toEqualTypeOf<typeof entityTypes[number]>()
    })

    it('represents every PA CSV slot and phone calls as persons with image', () => {
        const row: SectionRow = {
            id: 'row-1',
            title: { id: 'title-1', title: 'Titlu' },
            person: {
                id: 'person-1',
                name: 'Invitat telefonic',
                occupation: 'Reporter',
                image: 'WORK_PATH/invitat.jpg',
            },
            location: { id: 'location-1', location: 'Chisinau' },
            hotTitle: { id: 'hot-title-1', title: 'Ultima ora' },
            waitTitle: { id: 'wait-title-1', title: 'Titlu asteptare' },
            waitLocation: { id: 'wait-location-1', location: 'Locatie asteptare' },
        }

        expect(row).toMatchObject({
            title: { title: 'Titlu' },
            person: { image: 'WORK_PATH/invitat.jpg' },
            location: { location: 'Chisinau' },
            hotTitle: { title: 'Ultima ora' },
            waitTitle: { title: 'Titlu asteptare' },
            waitLocation: { location: 'Locatie asteptare' },
        })
    })

    it('creates only the invited PLATOU section for a new empty project', () => {
        expect(createEmptyEntitiesState('invited-1')).toEqual({
            sections: [
                {
                    id: 'invited-1',
                    kind: 'invited',
                    rows: [],
                },
            ],
        })
    })

    it('creates invited and beta sections through explicit helpers', () => {
        const invited = createInvitedSection('invited-1')
        const beta = createBetaSection('beta-1', 1, 'Externe', [])
        const state: EntitiesState = { sections: [beta, invited] }

        expectTypeOf<SectionKind>().toEqualTypeOf<'beta' | 'invited'>()
        expectTypeOf<CsvSection>().toMatchTypeOf<typeof beta>()
        expect(state.sections).toEqual([
            {
                id: 'beta-1',
                kind: 'beta',
                betaIndex: 1,
                betaTitle: 'Externe',
                rows: [],
            },
            {
                id: 'invited-1',
                kind: 'invited',
                rows: [],
            },
        ])
    })
})

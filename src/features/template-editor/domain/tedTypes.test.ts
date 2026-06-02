import { describe, expect, it } from 'vitest'
import { TED_ENTITY_LABELS, TED_ENTITY_TYPES } from './tedTypes'

describe('tedTypes', () => {
    it('exposes the complete PA template editor entity types', () => {
        expect(TED_ENTITY_TYPES).toEqual([
            'titles',
            'persons',
            'locations',
            'phoneCalls',
            'hotTitles',
            'waitTitles',
            'waitLocations',
        ])
    })

    it('uses the operator-facing PA tab labels', () => {
        expect(TED_ENTITY_LABELS).toEqual({
            titles: 'Titles',
            persons: 'Persons',
            locations: 'Locations',
            phoneCalls: 'Phones',
            hotTitles: 'Hot Titles',
            waitTitles: 'Wait Titles',
            waitLocations: 'Wait Locations',
        })
    })
})

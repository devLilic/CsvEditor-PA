import { describe, expect, it } from 'vitest'
import { DEFAULT_ENTITY_TEMPLATE_NAMES, normalizeEntityTemplateNames } from './entityTemplateNames'

describe('normalizeEntityTemplateNames', () => {
    it('provides the built-in single template names when no config exists', () => {
        expect(normalizeEntityTemplateNames(undefined)).toEqual(DEFAULT_ENTITY_TEMPLATE_NAMES)
    })

    it('keeps configured names and falls back only for missing fields', () => {
        expect(normalizeEntityTemplateNames({ locations: '  MapBug  ', waitTitles: 'WaitHeadline' })).toEqual({
            locations: 'MapBug',
            phones: DEFAULT_ENTITY_TEMPLATE_NAMES.phones,
            waitTitles: 'WaitHeadline',
            waitLocations: DEFAULT_ENTITY_TEMPLATE_NAMES.waitLocations,
        })
    })
})

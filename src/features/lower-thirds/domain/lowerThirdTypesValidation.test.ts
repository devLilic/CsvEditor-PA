import { describe, expect, it } from 'vitest'
import { DEFAULT_LOWER_THIRD_TYPES } from './lowerThirdTypes'
import { normalizeLowerThirdTypes, validateLowerThirdTypes } from './lowerThirdTypesValidation'

describe('lower-third type definitions', () => {
    it('accepts defaults and returns a detached normalized copy', () => {
        expect(validateLowerThirdTypes(DEFAULT_LOWER_THIRD_TYPES)).toBe(true)
        const normalized = normalizeLowerThirdTypes(DEFAULT_LOWER_THIRD_TYPES)
        expect(normalized).toEqual(DEFAULT_LOWER_THIRD_TYPES)
        expect(normalized).not.toBe(DEFAULT_LOWER_THIRD_TYPES)
    })

    it('rejects duplicate IDs, duplicate entity templates, and invalid opacity', () => {
        expect(validateLowerThirdTypes([
            ...DEFAULT_LOWER_THIRD_TYPES,
            { ...DEFAULT_LOWER_THIRD_TYPES[0], name: 'duplicate id' },
        ])).toBe(false)

        const duplicateTemplate = DEFAULT_LOWER_THIRD_TYPES.map((type) => ({ ...type, templates: { ...type.templates } }))
        duplicateTemplate[1].templates.titles.name = duplicateTemplate[0].templates.titles.name
        expect(validateLowerThirdTypes(duplicateTemplate)).toBe(false)

        const invalidOpacity = DEFAULT_LOWER_THIRD_TYPES.map((type) => ({ ...type, palette: { ...type.palette } }))
        invalidOpacity[0].palette.opacity = 2
        expect(validateLowerThirdTypes(invalidOpacity)).toBe(false)
    })

    it('falls back to defaults when persisted config is malformed', () => {
        expect(normalizeLowerThirdTypes({ nope: true })).toEqual(DEFAULT_LOWER_THIRD_TYPES)
    })
})

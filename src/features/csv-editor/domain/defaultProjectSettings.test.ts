import { describe, expect, it } from 'vitest'
import {
    FALLBACK_DEFAULT_PROJECT_SETTINGS,
    normalizeDefaultProjectSettings,
} from './defaultProjectSettings'

describe('normalizeDefaultProjectSettings', () => {
    it('preserves the project defaults without a legacy hot title field', () => {
        expect(normalizeDefaultProjectSettings({
            title: 'TITLU',
            personName: 'NUME',
            personOccupation: 'FUNCTIE',
            location: 'LOCATIE',
        })).toEqual({
            title: 'TITLU',
            personName: 'NUME',
            personOccupation: 'FUNCTIE',
            location: 'LOCATIE',
        })
    })

    it('uses fallback settings for invalid values', () => {
        expect(normalizeDefaultProjectSettings(null)).toBe(FALLBACK_DEFAULT_PROJECT_SETTINGS)
    })
})

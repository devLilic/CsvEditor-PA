import { describe, expect, it } from 'vitest'
import {
    buildPersonQuickTitleSuggestion,
    getFirstNameInitial,
    getLastNameSegment,
} from './personQuickTitleSuggestion'

describe('getLastNameSegment', () => {
    it('extracts the last segment from a simple name', () => {
        expect(getLastNameSegment('ION POPESCU')).toBe('POPESCU')
    })

    it('ignores multiple spaces', () => {
        expect(getLastNameSegment('  ANA   BUJOR  ')).toBe('BUJOR')
    })

    it('keeps hyphenated names', () => {
        expect(getLastNameSegment('ION POPESCU-IONESCU')).toBe('POPESCU-IONESCU')
    })

    it('returns an empty string for an empty name', () => {
        expect(getLastNameSegment('')).toBe('')
    })
})

describe('getFirstNameInitial', () => {
    it('extracts the first initial', () => {
        expect(getFirstNameInitial('IGOR BUJOR')).toBe('I')
    })
})

describe('buildPersonQuickTitleSuggestion', () => {
    it('suggests the complete person name', () => {
        expect(buildPersonQuickTitleSuggestion({
            personName: 'ANA BUJOR',
            existingQuickTitles: [],
        })).toBe('ANA BUJOR')
    })

    it('still suggests the complete person name when a surname quick title exists', () => {
        expect(buildPersonQuickTitleSuggestion({
            personName: 'IGOR BUJOR',
            existingQuickTitles: ['BUJOR'],
        })).toBe('IGOR BUJOR')
    })

    it('does not shorten a full name when a matching quick title already exists', () => {
        for (const existingQuickTitle of ['BUJOR', 'BUJOR:', 'BUJOR:  ']) {
            expect(buildPersonQuickTitleSuggestion({
                personName: 'IGOR BUJOR',
                existingQuickTitles: [existingQuickTitle],
            })).toBe('IGOR BUJOR')
        }
    })

    it('normalizes spacing in the full person name', () => {
        expect(buildPersonQuickTitleSuggestion({
            personName: '  IGOR   BUJOR  ',
            existingQuickTitles: [],
        })).toBe('IGOR BUJOR')
    })

    it('does not mutate existingQuickTitles', () => {
        const existingQuickTitles = ['BUJOR', 'DIRECTOR: ']
        const snapshot = [...existingQuickTitles]

        buildPersonQuickTitleSuggestion({
            personName: 'IGOR BUJOR',
            existingQuickTitles,
        })

        expect(existingQuickTitles).toEqual(snapshot)
    })
})

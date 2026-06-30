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
    it('suggests BUJOR when the prefix does not exist', () => {
        expect(buildPersonQuickTitleSuggestion({
            personName: 'ANA BUJOR',
            existingQuickTitles: [],
        })).toBe('BUJOR')
    })

    it('suggests I. BUJOR when BUJOR exists', () => {
        expect(buildPersonQuickTitleSuggestion({
            personName: 'IGOR BUJOR',
            existingQuickTitles: ['BUJOR'],
        })).toBe('I. BUJOR')
    })

    it('treats BUJOR, BUJOR:, and BUJOR:  as duplicates', () => {
        for (const existingQuickTitle of ['BUJOR', 'BUJOR:', 'BUJOR:  ']) {
            expect(buildPersonQuickTitleSuggestion({
                personName: 'IGOR BUJOR',
                existingQuickTitles: [existingQuickTitle],
            })).toBe('I. BUJOR')
        }
    })

    it('keeps I. BUJOR as the suggestion when that prefix also exists', () => {
        expect(buildPersonQuickTitleSuggestion({
            personName: 'IGOR BUJOR',
            existingQuickTitles: ['BUJOR: ', 'I. BUJOR: '],
        })).toBe('I. BUJOR')
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

import { describe, expect, it } from 'vitest'
import {
    normalizeAndDeduplicateQuickTitles,
    normalizeQuickTitle,
} from './quickTitle'

describe('normalizeQuickTitle', () => {
    it('adds a colon when it is missing', () => {
        expect(normalizeQuickTitle('PRESEDINTE')).toBe('PRESEDINTE: ')
    })

    it('adds one space when only the colon exists', () => {
        expect(normalizeQuickTitle('PRESEDINTE:')).toBe('PRESEDINTE: ')
    })

    it('does not duplicate the colon', () => {
        expect(normalizeQuickTitle('PRESEDINTE:')).toBe('PRESEDINTE: ')
    })

    it('does not add multiple trailing spaces', () => {
        expect(normalizeQuickTitle('PRESEDINTE:   ')).toBe('PRESEDINTE: ')
    })

    it('removes exterior whitespace', () => {
        expect(normalizeQuickTitle(' PRESEDINTE ')).toBe('PRESEDINTE: ')
    })

    it('returns an empty string for blank input', () => {
        expect(normalizeQuickTitle('   ')).toBe('')
    })
})

describe('normalizeAndDeduplicateQuickTitles', () => {
    it('removes exact duplicates', () => {
        expect(normalizeAndDeduplicateQuickTitles([
            'PRESEDINTE: ',
            'PRESEDINTE: ',
        ])).toEqual(['PRESEDINTE: '])
    })

    it('treats equivalent quickTitle spellings as duplicates', () => {
        expect(normalizeAndDeduplicateQuickTitles([
            'PRESEDINTE',
            'PRESEDINTE:',
            'PRESEDINTE: ',
        ])).toEqual(['PRESEDINTE: '])
    })

    it('keeps the first occurrence and preserves order', () => {
        expect(normalizeAndDeduplicateQuickTitles([
            'DIRECTOR',
            'PRESEDINTE',
            'DIRECTOR:',
            'PRIM-MINISTRU',
            'PRESEDINTE: ',
        ])).toEqual([
            'DIRECTOR: ',
            'PRESEDINTE: ',
            'PRIM-MINISTRU: ',
        ])
    })

    it('removes empty values', () => {
        expect(normalizeAndDeduplicateQuickTitles([
            '',
            '   ',
            'PRESEDINTE',
        ])).toEqual(['PRESEDINTE: '])
    })

    it('does not mutate the received array', () => {
        const input = ['PRESEDINTE', 'PRESEDINTE:']
        const snapshot = [...input]

        normalizeAndDeduplicateQuickTitles(input)

        expect(input).toEqual(snapshot)
    })
})

import { describe, expect, it } from 'vitest'
import {
    parseQuickTitlesCsv,
    serializeQuickTitlesCsv,
} from './quickTitlesCsv'

describe('serializeQuickTitlesCsv', () => {
    it('writes each quickTitle on a separate row', () => {
        expect(serializeQuickTitlesCsv([
            'PRESEDINTE',
            'DIRECTOR',
        ])).toBe([
            '"PRESEDINTE: "',
            '"DIRECTOR: "',
        ].join('\n'))
    })

    it('normalizes colon and trailing space', () => {
        expect(serializeQuickTitlesCsv([
            'PRESEDINTE',
            'DIRECTOR:',
        ])).toBe([
            '"PRESEDINTE: "',
            '"DIRECTOR: "',
        ].join('\n'))
    })

    it('removes duplicates after normalization', () => {
        expect(serializeQuickTitlesCsv([
            'PRESEDINTE',
            'PRESEDINTE:',
            'PRESEDINTE: ',
        ])).toBe([
            '"PRESEDINTE: "',
        ].join('\n'))
    })

    it('preserves first occurrence order', () => {
        expect(serializeQuickTitlesCsv([
            'DIRECTOR',
            'PRESEDINTE',
            'DIRECTOR:',
            'PRIM-MINISTRU',
        ])).toBe([
            '"DIRECTOR: "',
            '"PRESEDINTE: "',
            '"PRIM-MINISTRU: "',
        ].join('\n'))
    })

    it('serializes an empty list as an empty file', () => {
        expect(serializeQuickTitlesCsv([])).toBe('')
    })

    it('escapes text with separator, quotes, or newline', () => {
        expect(serializeQuickTitlesCsv([
            'TITLU; CU "GHILIMELE"\nLIVE',
        ])).toBe([
            '"TITLU; CU ""GHILIMELE""',
            'LIVE: "',
        ].join('\n'))
    })
})

describe('parseQuickTitlesCsv', () => {
    it('reads quickTitles from the first column without a header', () => {
        expect(parseQuickTitlesCsv([
            'PRESEDINTE;ignorat',
            'DIRECTOR;ignorat',
        ].join('\n'))).toEqual([
            'PRESEDINTE: ',
            'DIRECTOR: ',
        ])
    })

    it('normalizes read values', () => {
        expect(parseQuickTitlesCsv([
            'PRESEDINTE',
            'DIRECTOR:',
        ].join('\n'))).toEqual([
            'PRESEDINTE: ',
            'DIRECTOR: ',
        ])
    })

    it('removes duplicates after parsing', () => {
        expect(parseQuickTitlesCsv([
            'PRESEDINTE',
            'PRESEDINTE:',
            'PRESEDINTE: ',
        ].join('\n'))).toEqual(['PRESEDINTE: '])
    })

    it('ignores empty rows', () => {
        expect(parseQuickTitlesCsv([
            '',
            '   ',
            'PRESEDINTE',
        ].join('\n'))).toEqual(['PRESEDINTE: '])
    })

    it('returns an empty list for empty content', () => {
        expect(parseQuickTitlesCsv('')).toEqual([])
    })

    it('treats a legacy header-only CSV as an empty list', () => {
        expect(parseQuickTitlesCsv('Titlu')).toEqual([])
    })

    it('does not require a header', () => {
        expect(parseQuickTitlesCsv('PRESEDINTE')).toEqual(['PRESEDINTE: '])
    })

    it('keeps the normalized list across serialize and parse', () => {
        const csv = serializeQuickTitlesCsv([
            'DIRECTOR',
            'PRESEDINTE:',
            'DIRECTOR: ',
            '',
        ])

        expect(parseQuickTitlesCsv(csv)).toEqual([
            'DIRECTOR: ',
            'PRESEDINTE: ',
        ])
    })
})

import { describe, expect, it } from 'vitest'
import { serializeEntityCsv } from './entityCsvSerializer'

describe('serializeEntityCsv', () => {
    it('uses the application CSV delimiter', () => {
        expect(serializeEntityCsv(['Nr', 'Titlu'], [
            {
                Nr: '3',
                Titlu: 'Titlu test',
            },
        ])).toBe('Nr;Titlu\n3;Titlu test')
    })

    it('writes the header before rows', () => {
        expect(serializeEntityCsv(['Nr', 'Titlu'], [
            {
                Nr: '3',
                Titlu: 'Titlu test',
            },
        ])).toBe([
            'Nr;Titlu',
            '3;Titlu test',
        ].join('\n'))
    })

    it('returns header-only CSV for empty lists', () => {
        expect(serializeEntityCsv(['Nr', 'Titlu'], [])).toBe('Nr;Titlu')
    })

    it('escapes semicolons', () => {
        expect(serializeEntityCsv(['Titlu'], [
            {
                Titlu: 'Titlu; cu separator',
            },
        ])).toBe('Titlu\n"Titlu; cu separator"')
    })

    it('escapes newlines', () => {
        expect(serializeEntityCsv(['Titlu'], [
            {
                Titlu: 'Titlu\npe doua randuri',
            },
        ])).toBe('Titlu\n"Titlu\npe doua randuri"')
    })

    it('escapes quotes', () => {
        expect(serializeEntityCsv(['Titlu'], [
            {
                Titlu: 'Titlu "citat"',
            },
        ])).toBe('Titlu\n"Titlu ""citat"""')
    })
})

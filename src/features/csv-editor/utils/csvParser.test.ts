import { describe, expect, it } from 'vitest'
import { parseCsv } from './csvParser'

const header = 'Nr;Titlu;Nume;Functie;Locatie;Ultima Ora;Titlu Asteptare;Locatie Asteptare'

describe('parseCsv', () => {
    it('does not crash when CSV contains legacy Ultima Ora column', () => {
        const csv = [
            'Nr;Titlu;Nume;Functie;Locatie;Ultima Ora',
            '1;Titlu simplu;;;;Urgent',
        ].join('\n')

        const result = parseCsv(csv)

        expect(result.sections[0].rows[0].title?.title).toBe('Titlu simplu')
        expect(result.sections[0].rows[0].hotTitle).toBeUndefined()
    })

    it('does not crash when CSV contains legacy Titlu Asteptare column', () => {
        const csv = [
            'Nr;Titlu;Nume;Functie;Locatie;Titlu Asteptare',
            '1;Titlu simplu;;;;Titlu asteptare',
        ].join('\n')

        const result = parseCsv(csv)

        expect(result.sections[0].rows[0].title?.title).toBe('Titlu simplu')
        expect(result.sections[0].rows[0].waitTitle).toBeUndefined()
    })

    it('does not crash when CSV contains legacy Locatie Asteptare column', () => {
        const csv = [
            'Nr;Titlu;Nume;Functie;Locatie;Locatie Asteptare',
            '1;Titlu simplu;;;;Studio',
        ].join('\n')

        const result = parseCsv(csv)

        expect(result.sections[0].rows[0].title?.title).toBe('Titlu simplu')
        expect(result.sections[0].rows[0].waitLocation).toBeUndefined()
    })

    it('parses CSV without markers as a single invited section', () => {
        const csv = [
            header,
            '1;Titlu simplu;Ion Popescu;Reporter;Chisinau;Urgent;Asteptare;Studio',
        ].join('\n')

        const result = parseCsv(csv)

        expect(result.sections).toHaveLength(1)
        expect(result.sections[0].kind).toBe('invited')
        expect(result.sections[0].rows).toHaveLength(1)
        expect(result.sections[0].rows[0].title?.title).toBe('Titlu simplu')
        expect(result.sections[0].rows[0].person?.name).toBe('Ion Popescu')
        expect(result.sections[0].rows[0].hotTitle).toBeUndefined()
        expect(result.sections[0].rows[0].waitTitle).toBeUndefined()
        expect(result.sections[0].rows[0].waitLocation).toBeUndefined()
    })

    it('keeps the original Nr value on parsed titles', () => {
        const csv = [
            header,
            '003;Titlu cu nr;Ion Popescu;Reporter;Chisinau;Urgent;Asteptare;Studio',
        ].join('\n')

        const result = parseCsv(csv)

        expect(result.sections[0].rows[0].title?.nr).toBe('003')
    })

    it('parses Image column for a person', () => {
        const csv = [
            'Nr;Titlu;Nume;Functie;Locatie;Image',
            ';;ION POPESCU;EXPERT;;WORK_PATH/ion_popescu.jpg',
        ].join('\n')

        const result = parseCsv(csv)
        const person = result.sections[0].rows[0].person as any

        expect(person).toBeDefined()
        expect(person.image).toBe('WORK_PATH/ion_popescu.jpg')
    })

    it('keeps Image value exactly as the CSV string', () => {
        const csv = [
            'Nr;Titlu;Nume;Functie;Locatie;Image',
            ';;ION POPESCU;EXPERT;;WORK_PATH/ion_popescu.jpg',
        ].join('\n')

        const result = parseCsv(csv)

        expect((result.sections[0].rows[0].person as any).image).toBe(
            'WORK_PATH/ion_popescu.jpg'
        )
    })

    it('sets person.image to undefined when Image column is missing', () => {
        const csv = [
            'Nr;Titlu;Nume;Functie;Locatie',
            ';;ION POPESCU;EXPERT;',
        ].join('\n')

        const result = parseCsv(csv)

        expect((result.sections[0].rows[0].person as any).image).toBeUndefined()
    })

    it('sets person.image to undefined when Image column is empty', () => {
        const csv = [
            'Nr;Titlu;Nume;Functie;Locatie;Image',
            ';;ION POPESCU;EXPERT;;',
        ].join('\n')

        const result = parseCsv(csv)

        expect((result.sections[0].rows[0].person as any).image).toBeUndefined()
    })

    it('does not crash when CSV contains Image column', () => {
        const csv = [
            'Nr;Titlu;Nume;Functie;Locatie;Image',
            '1;Titlu simplu;ION POPESCU;EXPERT;;WORK_PATH/ion_popescu.jpg',
        ].join('\n')

        const result = parseCsv(csv)

        expect(result.sections[0].rows[0].title?.title).toBe('Titlu simplu')
        expect(result.sections[0].rows[0].person?.name).toBe('ION POPESCU')
    })

    it('creates BETA and INVITATI sections in marker order with invited last', () => {
        const csv = [
            header,
            ';--- beta 1 - Externe ---;;;;;;',
            '1;Titlu beta;Maria Rusu;Editor;Bruxelles;Ultima ora beta;;;',
            ';--- INVITATI ---;;;;;;',
            '1;Titlu invitati;Ion Popescu;Invitat;Chisinau;Urgent;Titlu asteptare;Locatie asteptare',
        ].join('\n')

        const result = parseCsv(csv)

        expect(result.sections.map((section) => section.kind)).toEqual(['beta', 'invited'])
        expect(result.sections[0].betaIndex).toBe(1)
        expect(result.sections[0].betaTitle).toBe('Externe')
        expect(result.sections[0].rows[0].title?.title).toBe('Titlu beta')
        expect(result.sections[0].rows[0].waitTitle).toBeUndefined()
        expect(result.sections[1].rows[0].title?.title).toBe('Titlu invitati')
        expect(result.sections[1].rows[0].hotTitle).toBeUndefined()
        expect(result.sections[1].rows[0].waitTitle).toBeUndefined()
        expect(result.sections[1].rows[0].waitLocation).toBeUndefined()
    })

    it('detects section markers from the Nr column', () => {
        const csv = [
            'Nr;Titlu;Nume;Functie;Image;Locatie',
            '--- INVITATI ---;;;;;',
            '1;Titlu invitati;Ion Popescu;Invitat;;Chisinau',
        ].join('\n')

        const result = parseCsv(csv)

        expect(result.sections).toHaveLength(1)
        expect(result.sections[0].kind).toBe('invited')
        expect(result.sections[0].rows[0].title?.title).toBe('Titlu invitati')
        expect(result.sections[0].rows[0].person?.name).toBe('Ion Popescu')
        expect(result.sections[0].rows[0].location?.location).toBe('Chisinau')
    })

    it('does not create false entities from empty rows', () => {
        const csv = [
            header,
            ';;;;;;;;',
            '1;;;;;;;',
            ';--- INVITATI ---;;;;;;',
            ';;;;;;;;',
            '1;Titlu valid;;;;;;',
            ';;;;;;;;',
        ].join('\n')

        const result = parseCsv(csv)

        expect(result.sections).toHaveLength(1)
        expect(result.sections[0].kind).toBe('invited')
        expect(result.sections[0].rows).toHaveLength(1)
        expect(result.sections[0].rows[0].title?.title).toBe('Titlu valid')
        expect(result.sections[0].rows[0].person).toBeUndefined()
        expect(result.sections[0].rows[0].location).toBeUndefined()
    })
})

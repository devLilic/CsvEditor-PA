import { describe, expect, it } from 'vitest'
import { CSV_COLUMNS, parseCsv } from './csvParser'

const header = 'Nr;Titlu;Nume;Functie;Image;Locatie;Ultima Ora;Titlu Asteptare;Locatie Asteptare'

describe('parseCsv PA common CSV', () => {
    it('defines the PA common CSV columns exactly', () => {
        expect(CSV_COLUMNS).toEqual({
            TITLE_NR: 'Nr',
            TITLE: 'Titlu',
            PERSON_NAME: 'Nume',
            PERSON_OCCUPATION: 'Functie',
            PERSON_IMAGE: 'Image',
            LOCATION: 'Locatie',
            HOT_TITLE: 'Ultima Ora',
            WAIT_TITLE: 'Titlu Asteptare',
            WAIT_LOCATION: 'Locatie Asteptare',
        })
    })

    it('parses CSV without markers into one INVITATI section with every PA slot', () => {
        const result = parseCsv([
            header,
            '003;Titlu simplu;Ion Popescu;Reporter;;Chisinau;Urgent;Asteptare;Studio',
        ].join('\n'))

        expect(result.sections).toHaveLength(1)
        expect(result.sections[0].kind).toBe('invited')
        expect(result.sections[0].rows).toHaveLength(1)
        expect(result.sections[0].rows[0]).toMatchObject({
            title: { nr: '003', title: 'Titlu simplu' },
            person: { name: 'Ion Popescu', occupation: 'Reporter' },
            location: { location: 'Chisinau' },
            hotTitle: { title: 'Urgent' },
            waitTitle: { title: 'Asteptare' },
            waitLocation: { location: 'Studio' },
        })
        expect(result.sections[0].rows[0].person?.image).toBeUndefined()
    })

    it('parses a person with Image as a phone person with image', () => {
        const result = parseCsv([
            header,
            ';;ION POPESCU;EXPERT;WORK_PATH/ion_popescu.jpg;;;;',
        ].join('\n'))

        expect(result.sections[0].rows[0].person).toMatchObject({
            name: 'ION POPESCU',
            occupation: 'EXPERT',
            image: 'WORK_PATH/ion_popescu.jpg',
        })
    })

    it('parses INVITATI and beta markers from the Titlu column without creating marker rows', () => {
        const result = parseCsv([
            header,
            ';--- beta 1 - Titlu beta ---;;;;;;;',
            '1;Titlu beta;Maria Rusu;Editor;;;;;',
            ';--- INVITATI ---;;;;;;;',
            '1;Titlu invitati;Ion Popescu;Invitat;;Chisinau;Urgent;Asteptare;Studio',
        ].join('\n'))

        expect(result.sections.map((section) => section.kind)).toEqual(['beta', 'invited'])
        expect(result.sections[0]).toMatchObject({
            kind: 'beta',
            betaIndex: 1,
            betaTitle: 'Titlu beta',
        })
        expect(result.sections[0].rows).toHaveLength(1)
        expect(result.sections[1].rows).toHaveLength(1)
    })

    it('parses multiple BETA sections and keeps an implicit INVITATI section last', () => {
        const result = parseCsv([
            header,
            ';--- beta 1 - Externe ---;;;;;;;',
            '1;Titlu beta 1;Maria Rusu;Editor;;;;;',
            ';--- beta 2 - Politic ---;;;;;;;',
            '1;Titlu beta 2;Ion Popescu;Reporter;;;;;',
        ].join('\n'))

        expect(result.sections.map((section) => section.kind)).toEqual(['beta', 'beta', 'invited'])
        expect(result.sections[0].betaTitle).toBe('Externe')
        expect(result.sections[1].betaTitle).toBe('Politic')
        expect(result.sections[2].rows).toEqual([])
    })

    it('keeps only titles and persons from BETA rows', () => {
        const result = parseCsv([
            header,
            ';--- beta 1 - Externe ---;;;;;;;',
            '1;Titlu beta;Maria Rusu;Editor;WORK_PATH/maria.jpg;Bruxelles;Urgent;Asteptare;Studio',
        ].join('\n'))

        expect(result.sections[0].rows[0]).toMatchObject({
            title: { title: 'Titlu beta' },
            person: { name: 'Maria Rusu', occupation: 'Editor' },
        })
        expect(result.sections[0].rows[0].person?.image).toBeUndefined()
        expect(result.sections[0].rows[0].location).toBeUndefined()
        expect(result.sections[0].rows[0].hotTitle).toBeUndefined()
        expect(result.sections[0].rows[0].waitTitle).toBeUndefined()
        expect(result.sections[0].rows[0].waitLocation).toBeUndefined()
    })

    it('keeps INVITATI present when markers contain only BETA sections', () => {
        const result = parseCsv([
            header,
            ';--- beta 1 - Externe ---;;;;;;;',
        ].join('\n'))

        expect(result.sections.map((section) => section.kind)).toEqual(['beta', 'invited'])
    })

    it('does not create rows for markers or empty rows', () => {
        const result = parseCsv([
            header,
            ';;;;;;;;',
            ';--- beta 1 - Externe ---;;;;;;;',
            ';--- INVITATI ---;;;;;;;',
            ';;;;;;;;',
        ].join('\n'))

        expect(result.sections.map((section) => section.rows)).toEqual([[], []])
    })

    it('keeps compatibility with saved projects that store markers in Nr', () => {
        const result = parseCsv([
            header,
            '--- INVITATI ---;;;;;;;;',
            '1;Titlu invitati;Ion Popescu;Invitat;;Chisinau;;;',
        ].join('\n'))

        expect(result.sections).toHaveLength(1)
        expect(result.sections[0].kind).toBe('invited')
        expect(result.sections[0].rows[0].title?.title).toBe('Titlu invitati')
    })
})

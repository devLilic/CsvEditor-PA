import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'
import type { EntitiesState } from '../domain/entities'
import { CSV_COLUMNS, parseCsv } from './csvParser'
import { serializeCsv } from './csvSerializer'

type CsvRow = Record<string, string>

function parseSerializedRows(state: EntitiesState): CsvRow[] {
    return Papa.parse<CsvRow>(serializeCsv(state), {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
    }).data
}

function title(id: string, value: string) {
    return { id, title: value }
}

function location(id: string, value: string) {
    return { id, location: value }
}

describe('serializeCsv PA common CSV', () => {
    it('writes the PA common CSV header in exact order', () => {
        const serialized = serializeCsv({
            sections: [{ id: 'invited-1', kind: 'invited', rows: [] }],
        })

        expect(serialized.split(/\r?\n/)[0]).toBe(
            'Nr;Titlu;Nume;Functie;Image;Locatie;Ultima Ora;Titlu Asteptare;Locatie Asteptare'
        )
    })

    it('writes beta and INVITATI markers in Titlu and keeps INVITATI last', () => {
        const rows = parseSerializedRows({
            sections: [
                { id: 'invited-1', kind: 'invited', rows: [] },
                { id: 'beta-1', kind: 'beta', betaIndex: 1, betaTitle: 'Titlu', rows: [] },
            ],
        })

        expect(rows).toEqual([
            {
                [CSV_COLUMNS.TITLE_NR]: '',
                [CSV_COLUMNS.TITLE]: '--- beta 1 - Titlu ---',
                [CSV_COLUMNS.PERSON_NAME]: '',
                [CSV_COLUMNS.PERSON_OCCUPATION]: '',
                [CSV_COLUMNS.PERSON_IMAGE]: '',
                [CSV_COLUMNS.LOCATION]: '',
                [CSV_COLUMNS.HOT_TITLE]: '',
                [CSV_COLUMNS.WAIT_TITLE]: '',
                [CSV_COLUMNS.WAIT_LOCATION]: '',
            },
            {
                [CSV_COLUMNS.TITLE_NR]: '',
                [CSV_COLUMNS.TITLE]: '--- INVITATI ---',
                [CSV_COLUMNS.PERSON_NAME]: '',
                [CSV_COLUMNS.PERSON_OCCUPATION]: '',
                [CSV_COLUMNS.PERSON_IMAGE]: '',
                [CSV_COLUMNS.LOCATION]: '',
                [CSV_COLUMNS.HOT_TITLE]: '',
                [CSV_COLUMNS.WAIT_TITLE]: '',
                [CSV_COLUMNS.WAIT_LOCATION]: '',
            },
        ])
    })

    it('resets title Nr for every section', () => {
        const rows = parseSerializedRows({
            sections: [
                {
                    id: 'beta-1',
                    kind: 'beta',
                    betaIndex: 1,
                    betaTitle: 'Externe',
                    rows: [
                        { id: 'beta-row-1', title: title('beta-title-1', 'Titlu beta 1') },
                        { id: 'beta-row-2', title: title('beta-title-2', 'Titlu beta 2') },
                    ],
                },
                {
                    id: 'invited-1',
                    kind: 'invited',
                    rows: [{ id: 'invited-row-1', title: title('invited-title-1', 'Titlu invitati') }],
                },
            ],
        })

        expect(rows.map((row) => row[CSV_COLUMNS.TITLE_NR])).toEqual(['', '1', '2', '', '1'])
    })

    it('writes PA data columns and emits wait values only for INVITATI', () => {
        const rows = parseSerializedRows({
            sections: [
                {
                    id: 'beta-1',
                    kind: 'beta',
                    betaIndex: 1,
                    betaTitle: 'Externe',
                    rows: [{
                        id: 'beta-row-1',
                        title: title('beta-title-1', 'Titlu beta'),
                        person: { id: 'beta-person-1', name: 'Maria Rusu', occupation: 'Editor' },
                        hotTitle: title('beta-hot-1', 'Ignorat'),
                        waitTitle: title('beta-wait-title-1', 'Ignorat'),
                        waitLocation: location('beta-wait-location-1', 'Ignorat'),
                    }],
                },
                {
                    id: 'invited-1',
                    kind: 'invited',
                    rows: [{
                        id: 'invited-row-1',
                        title: title('invited-title-1', 'Titlu invitati'),
                        person: {
                            id: 'phone-1',
                            name: 'Ion Popescu',
                            occupation: 'Invitat',
                            image: 'C:\\PhoneImages\\ion.jpg',
                        },
                        location: location('location-1', 'Chisinau'),
                        hotTitle: title('hot-title-1', 'Urgent'),
                        waitTitle: title('wait-title-1', 'Asteptare'),
                        waitLocation: location('wait-location-1', 'Studio'),
                    }],
                },
            ],
        })

        expect(rows[1]).toMatchObject({
            [CSV_COLUMNS.PERSON_NAME]: 'Maria Rusu',
            [CSV_COLUMNS.PERSON_OCCUPATION]: 'Editor',
            [CSV_COLUMNS.PERSON_IMAGE]: '',
            [CSV_COLUMNS.HOT_TITLE]: '',
            [CSV_COLUMNS.WAIT_TITLE]: '',
            [CSV_COLUMNS.WAIT_LOCATION]: '',
        })
        expect(rows[3]).toMatchObject({
            [CSV_COLUMNS.PERSON_NAME]: 'Ion Popescu',
            [CSV_COLUMNS.PERSON_OCCUPATION]: 'Invitat',
            [CSV_COLUMNS.PERSON_IMAGE]: 'C:\\PhoneImages\\ion.jpg',
            [CSV_COLUMNS.LOCATION]: 'Chisinau',
            [CSV_COLUMNS.HOT_TITLE]: 'Urgent',
            [CSV_COLUMNS.WAIT_TITLE]: 'Asteptare',
            [CSV_COLUMNS.WAIT_LOCATION]: 'Studio',
        })
    })

    it('expands legacy WORK_PATH image refs when phone image workPath is provided', () => {
        const state: EntitiesState = {
            sections: [{
                id: 'invited-1',
                kind: 'invited',
                rows: [{
                    id: 'row-1',
                    person: {
                        id: 'phone-1',
                        name: 'Ion Popescu',
                        occupation: 'Invitat',
                        image: 'WORK_PATH/ion.jpg',
                    },
                }],
            }],
        }
        const serialized = serializeCsv(state, { phoneImageWorkPath: 'C:\\PhoneImages' })
        const rows = Papa.parse<CsvRow>(serialized, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true,
        }).data

        expect(rows[1][CSV_COLUMNS.PERSON_IMAGE]).toBe('C:\\PhoneImages\\ion.jpg')
    })

    it('round-trips the principal PA data through parseCsv', () => {
        const state: EntitiesState = {
            sections: [
                {
                    id: 'beta-1',
                    kind: 'beta',
                    betaIndex: 1,
                    betaTitle: 'Externe',
                    rows: [{
                        id: 'beta-row-1',
                        title: title('beta-title-1', 'Titlu beta'),
                        person: { id: 'beta-person-1', name: 'Maria Rusu', occupation: 'Editor' },
                    }],
                },
                {
                    id: 'invited-1',
                    kind: 'invited',
                    rows: [{
                        id: 'invited-row-1',
                        title: title('invited-title-1', 'Titlu invitati'),
                        person: {
                            id: 'phone-1',
                            name: 'Ion Popescu',
                            occupation: 'Invitat',
                            image: 'C:\\PhoneImages\\ion.jpg',
                        },
                        location: location('location-1', 'Chisinau'),
                        hotTitle: title('hot-title-1', 'Urgent'),
                        waitTitle: title('wait-title-1', 'Asteptare'),
                        waitLocation: location('wait-location-1', 'Studio'),
                    }],
                },
            ],
        }

        const reparsed = parseCsv(serializeCsv(state))

        expect(reparsed.sections.map((section) => section.kind)).toEqual(['beta', 'invited'])
        expect(reparsed.sections[0].rows[0]).toMatchObject({
            title: { title: 'Titlu beta' },
            person: { name: 'Maria Rusu', occupation: 'Editor' },
        })
        expect(reparsed.sections[1].rows[0]).toMatchObject({
            title: { title: 'Titlu invitati' },
            person: {
                name: 'Ion Popescu',
                occupation: 'Invitat',
                image: 'C:\\PhoneImages\\ion.jpg',
            },
            location: { location: 'Chisinau' },
            hotTitle: { title: 'Urgent' },
            waitTitle: { title: 'Asteptare' },
            waitLocation: { location: 'Studio' },
        })
    })
})

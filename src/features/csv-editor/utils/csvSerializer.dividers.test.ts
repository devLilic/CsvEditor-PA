import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'
import type { EntitiesState } from '../domain/entities'
import { TITLE_DIVIDER_MARKER, createTitleDivider } from '../domain/plateauTitleList'
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

describe('serializeCsv PLATOU title dividers', () => {
    it('serializes a divider in the correct mixed position with the exact marker', () => {
        const rows = parseSerializedRows({
            sections: [{
                id: 'invited-1',
                kind: 'invited',
                rows: [
                    { id: 'row-1', title: title('title-1', 'Primul titlu') },
                    { id: 'row-2', titleDivider: createTitleDivider('divider-1') },
                    { id: 'row-3', title: title('title-2', 'Al doilea titlu') },
                ],
            }],
        })

        expect(rows.map((row) => row[CSV_COLUMNS.TITLE])).toEqual([
            '--- INVITATI ---',
            'Primul titlu',
            TITLE_DIVIDER_MARKER,
            'Al doilea titlu',
        ])
    })

    it('leaves Nr and all non-title columns empty for divider rows', () => {
        const rows = parseSerializedRows({
            sections: [{
                id: 'invited-1',
                kind: 'invited',
                rows: [{ id: 'row-1', titleDivider: createTitleDivider('divider-1') }],
            }],
        })

        expect(rows[1]).toEqual({
            [CSV_COLUMNS.TITLE_NR]: '',
            [CSV_COLUMNS.TITLE]: TITLE_DIVIDER_MARKER,
            [CSV_COLUMNS.SUPRATITLE]: '',
            [CSV_COLUMNS.PERSON_NAME]: '',
            [CSV_COLUMNS.PERSON_OCCUPATION]: '',
            [CSV_COLUMNS.PERSON_IMAGE]: '',
            [CSV_COLUMNS.LOCATION]: '',
            [CSV_COLUMNS.HOT_TITLE]: '',
            [CSV_COLUMNS.WAIT_TITLE]: '',
            [CSV_COLUMNS.WAIT_LOCATION]: '',
        })
    })

    it('renumbers only title rows while ignoring dividers', () => {
        const rows = parseSerializedRows({
            sections: [{
                id: 'invited-1',
                kind: 'invited',
                rows: [
                    { id: 'row-1', titleDivider: createTitleDivider('divider-before') },
                    { id: 'row-2', title: title('title-1', 'Primul titlu') },
                    { id: 'row-3', titleDivider: createTitleDivider('divider-middle') },
                    { id: 'row-4', title: title('title-2', 'Al doilea titlu') },
                    { id: 'row-5', title: title('title-3', 'Al treilea titlu') },
                ],
            }],
        })

        expect(rows.map((row) => row[CSV_COLUMNS.TITLE_NR])).toEqual(['', '', '1', '', '2', '3'])
    })

    it('round-trips parser and serializer while preserving title and divider positions', () => {
        const state: EntitiesState = {
            sections: [{
                id: 'invited-1',
                kind: 'invited',
                rows: [
                    { id: 'row-1', title: title('title-1', 'Primul titlu') },
                    { id: 'row-2', titleDivider: createTitleDivider('divider-1') },
                    { id: 'row-3', title: title('title-2', 'Al doilea titlu') },
                    { id: 'row-4', titleDivider: createTitleDivider('divider-2') },
                ],
            }],
        }

        const reparsed = parseCsv(serializeCsv(state))

        expect(reparsed.sections[0].rows.map((row) => row.titleDivider ? 'divider' : row.title?.title)).toEqual([
            'Primul titlu',
            'divider',
            'Al doilea titlu',
            'divider',
        ])
    })

    it('does not write dividers in beta sections and keeps section markers unchanged', () => {
        const rows = parseSerializedRows({
            sections: [
                {
                    id: 'beta-1',
                    kind: 'beta',
                    betaIndex: 1,
                    betaTitle: 'Externe',
                    rows: [
                        { id: 'beta-row-1', titleDivider: createTitleDivider('divider-beta') },
                        { id: 'beta-row-2', title: title('beta-title-1', 'Titlu beta') },
                    ],
                },
                {
                    id: 'invited-1',
                    kind: 'invited',
                    rows: [],
                },
            ],
        })

        expect(rows.map((row) => row[CSV_COLUMNS.TITLE])).toEqual([
            '--- beta 1 - Externe ---',
            'Titlu beta',
            '--- INVITATI ---',
        ])
        expect(rows.some((row) => row[CSV_COLUMNS.TITLE] === TITLE_DIVIDER_MARKER)).toBe(false)
    })
})

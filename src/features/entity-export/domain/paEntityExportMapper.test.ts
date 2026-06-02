import { describe, expect, it } from 'vitest'
import type { EntitiesState } from '../../csv-editor/domain/entities'
import {
    mapPaLocationsExport,
    mapPaPersonsExport,
    mapPaPhonesExport,
    mapPaTitlesExport,
    mapPaWaitTitlesLocationsExport,
    mapPaWaitTitlesLocationsValues,
} from './paEntityExportMapper'

function paState(): EntitiesState {
    return {
        sections: [
            {
                id: 'beta-1',
                kind: 'beta',
                betaIndex: 1,
                betaTitle: 'Externe',
                rows: [
                    { id: 'b1-t1', title: { id: 't1', title: 'T1' } },
                    { id: 'b1-t2', title: { id: 't2', title: 'T2' } },
                    { id: 'b1-a', person: { id: 'a', name: 'A', occupation: 'Funcție A' } },
                    { id: 'b1-b', person: { id: 'b', name: 'B', occupation: 'Funcție B' } },
                    { id: 'b1-hidden-location', location: { id: 'hidden', location: 'NU EXPORTA' } },
                ],
            },
            {
                id: 'beta-2',
                kind: 'beta',
                betaIndex: 2,
                betaTitle: 'Consiliu',
                rows: [
                    { id: 'b2-t3', title: { id: 't3', title: 'T3' } },
                    { id: 'b2-c', person: { id: 'c', name: 'C', occupation: 'Funcție C' } },
                ],
            },
            {
                id: 'invited',
                kind: 'invited',
                rows: [
                    {
                        id: 'i-1',
                        title: { id: 't4', title: 'T4' },
                        person: { id: 'd', name: 'D', occupation: 'Funcție D' },
                        location: { id: 'location-1', location: 'Chișinău' },
                        hotTitle: { id: 'h1', title: 'H1' },
                        waitTitle: { id: 'w1', title: 'Titlu așteptare 1' },
                        waitLocation: { id: 'wl1', location: 'Locație așteptare 1' },
                    },
                    {
                        id: 'i-2',
                        person: { id: 'e', name: 'E', occupation: 'Funcție E' },
                        hotTitle: { id: 'h2', title: 'H2' },
                        waitTitle: { id: 'w2', title: 'Titlu așteptare 2' },
                    },
                    {
                        id: 'i-phone',
                        person: {
                            id: 'phone',
                            name: 'PHONE',
                            occupation: 'Funcție Phone',
                            image: 'D:\\photos\\phone.jpg',
                        },
                    },
                ],
            },
        ],
    }
}

describe('PA entity export mapper', () => {
    it('writes PA_titles.csv with section markers, per-section numbers, and independent hot titles', () => {
        expect(mapPaTitlesExport(paState())).toBe([
            'Nr;Titlu;Ultima Ora',
            '--- beta 1 - Externe ---;;',
            '1;T1;',
            '2;T2;',
            '--- beta 2 - Consiliu ---;;',
            '1;T3;',
            '--- INVITATI ---;;',
            '1;T4;H1',
            ';;H2',
        ].join('\n'))
    })

    it('writes PA_persons.csv with markers and excludes persons with image', () => {
        const csv = mapPaPersonsExport(paState())

        expect(csv).toBe([
            'Sectiune;Nume;Functie',
            '--- beta 1 - Externe ---;;',
            ';A;Funcție A',
            ';B;Funcție B',
            '--- beta 2 - Consiliu ---;;',
            ';C;Funcție C',
            '--- INVITATI ---;;',
            ';D;Funcție D',
            ';E;Funcție E',
        ].join('\n'))
        expect(csv).not.toContain('Image')
        expect(csv).not.toContain('PHONE')
    })

    it('writes PA_locations.csv without markers and only with INVITATI locations', () => {
        expect(mapPaLocationsExport(paState())).toBe([
            'Locatie',
            'Chișinău',
        ].join('\n'))
    })

    it('writes header-only PA_locations.csv when INVITATI has no locations', () => {
        expect(mapPaLocationsExport({ sections: [{ id: 'invited', kind: 'invited', rows: [] }] }))
            .toBe('Locatie')
    })

    it('writes PA_phones.csv only for persons with image and preserves the image path', () => {
        expect(mapPaPhonesExport(paState())).toBe([
            'Nume;Functie;Image',
            'PHONE;Funcție Phone;D:\\photos\\phone.jpg',
        ].join('\n'))
    })

    it('writes header-only PA_phones.csv when no persons have image', () => {
        expect(mapPaPhonesExport({ sections: [{ id: 'invited', kind: 'invited', rows: [] }] }))
            .toBe('Nume;Functie;Image')
    })

    it('writes wait titles and locations without Nr or markers', () => {
        expect(mapPaWaitTitlesLocationsExport(paState())).toBe([
            'Titlu;Locatie',
            'Titlu așteptare 1;Locație așteptare 1',
            'Titlu așteptare 2;',
        ].join('\n'))
    })

    it('aligns wait titles and locations by index only and leaves missing cells empty', () => {
        expect(mapPaWaitTitlesLocationsValues(
            ['Titlu așteptare 1', 'Titlu așteptare 2', ''],
            ['Locație așteptare 1', '', 'Locație așteptare 2'],
        )).toBe([
            'Titlu;Locatie',
            'Titlu așteptare 1;Locație așteptare 1',
            'Titlu așteptare 2;',
            ';Locație așteptare 2',
        ].join('\n'))
    })

    it('writes header-only PA_wait_titles_locations.csv when both lists are empty', () => {
        expect(mapPaWaitTitlesLocationsValues([], [])).toBe('Titlu;Locatie')
    })

    it('escapes separators, quotes, and newlines through the shared serializer', () => {
        expect(mapPaLocationsExport({
            sections: [{
                id: 'invited',
                kind: 'invited',
                rows: [{
                    id: 'location',
                    location: { id: 'location', location: 'Chișinău; "Centru"\nLive' },
                }],
            }],
        })).toBe([
            'Locatie',
            '"Chișinău; ""Centru""',
            'Live"',
        ].join('\n'))
    })
})

import { describe, expect, it } from 'vitest'
import type { EntitiesState } from '../../csv-editor/domain/entities'
import { DEFAULT_LOWER_THIRD_TYPES } from '../../lower-thirds/domain/lowerThirdTypes'
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
    it('writes PA_titles.csv with section markers and per-section numbers', () => {
        expect(mapPaTitlesExport(paState())).toBe([
            'Nr;Titlu;Supratitlu;Template',
            '--- beta 1 - Externe ---;;;',
            '1;T1;;01_Titlu',
            '2;T2;;01_Titlu',
            '--- beta 2 - Consiliu ---;;;',
            '1;T3;;01_Titlu',
            '--- INVITATI ---;;;',
            '1;T4;;01_Titlu',
        ].join('\n'))
    })

    it('writes PA_persons.csv with markers and excludes persons with image', () => {
        const csv = mapPaPersonsExport(paState())

        expect(csv).toBe([
            'Sectiune;Nume;Functie;Template',
            '--- beta 1 - Externe ---;;;',
            ';A;Funcție A;02_Nume',
            ';B;Funcție B;02_Nume',
            '--- beta 2 - Consiliu ---;;;',
            ';C;Funcție C;02_Nume',
            '--- INVITATI ---;;;',
            ';D;Funcție D;02_Nume',
            ';E;Funcție E;02_Nume',
        ].join('\n'))
        expect(csv).not.toContain('Image')
        expect(csv).not.toContain('PHONE')
    })

    it('writes PA_locations.csv without markers and only with INVITATI locations', () => {
        expect(mapPaLocationsExport(paState())).toBe([
            'Locatie;Template',
            'Chișinău;Location Bug',
        ].join('\n'))
    })

    it('writes header-only PA_locations.csv when INVITATI has no locations', () => {
        expect(mapPaLocationsExport({ sections: [{ id: 'invited', kind: 'invited', rows: [] }] }))
            .toBe('Locatie;Template')
    })

    it('writes PA_phones.csv only for persons with image and preserves the image path', () => {
        expect(mapPaPhonesExport(paState())).toBe([
            'Nume;Functie;Image;Template',
            'PHONE;Funcție Phone;D:\\photos\\phone.jpg;Phone Call Lower Third',
        ].join('\n'))
    })

    it('writes header-only PA_phones.csv when no persons have image', () => {
        expect(mapPaPhonesExport({ sections: [{ id: 'invited', kind: 'invited', rows: [] }] }))
            .toBe('Nume;Functie;Image;Template')
    })

    it('writes wait titles and locations without Nr or markers', () => {
        expect(mapPaWaitTitlesLocationsExport(paState())).toBe([
            'Titlu;Locatie;Template',
            'Titlu așteptare 1;Locație așteptare 1;Wait Title',
            'Titlu așteptare 2;;Wait Title',
        ].join('\n'))
    })

    it('aligns wait titles and locations by index only and leaves missing cells empty', () => {
        expect(mapPaWaitTitlesLocationsValues(
            ['Titlu așteptare 1', 'Titlu așteptare 2', ''],
            ['Locație așteptare 1', '', 'Locație așteptare 2'],
        )).toBe([
            'Titlu;Locatie;Template',
            'Titlu așteptare 1;Locație așteptare 1;Wait Title',
            'Titlu așteptare 2;;Wait Title',
            ';Locație așteptare 2;Wait Location',
        ].join('\n'))
    })

    it('writes header-only PA_wait_titles_locations.csv when both lists are empty', () => {
        expect(mapPaWaitTitlesLocationsValues([], [])).toBe('Titlu;Locatie;Template')
    })

    it('applies the project prefix once to template names across all entity exports', () => {
        const state = paState()
        expect(mapPaLocationsExport(state, undefined, 'PA_')).toContain('Chișinău;PA_Location Bug')
        expect(mapPaPhonesExport(state, undefined, 'PA_')).toContain('D:\\photos\\phone.jpg;PA_Phone Call Lower Third')
        expect(mapPaWaitTitlesLocationsExport(state, undefined, 'PA_')).toContain('Titlu așteptare 1;Locație așteptare 1;PA_Wait Title')
    })

    it('applies the project prefix to title and person template names in their dedicated exports', () => {
        const state: EntitiesState = {
            sections: [{
                id: 'invited',
                kind: 'invited',
                rows: [
                    { id: 'title', title: { id: 'title', title: 'Headline' } },
                    { id: 'person', person: { id: 'person', name: 'Ana', occupation: 'Editor' } },
                ],
            }],
        }
        expect(mapPaTitlesExport(state, DEFAULT_LOWER_THIRD_TYPES, 'PA_')).toContain('1;Headline;;PA_01_Titlu')
        expect(mapPaPersonsExport(state, DEFAULT_LOWER_THIRD_TYPES, 'PA_')).toContain(';Ana;Editor;PA_02_Nume')
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
            'Locatie;Template',
            '"Chișinău; ""Centru""\nLive";Location Bug',
        ].join('\n'))
    })
})

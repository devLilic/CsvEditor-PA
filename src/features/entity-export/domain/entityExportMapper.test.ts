import { describe, expect, it } from 'vitest'
import {
    mapEntitiesStateToExportCsvs,
    mapFullCsvContentToExportCsvs,
    mapLocationsToExportCsv,
    mapPersonsToExportCsv,
    mapPhonesToExportCsv,
    mapTitlesToExportCsv,
} from './entityExportMapper'

describe('entity export mapper', () => {
    it('maps titles to OC CSV', () => {
        expect(mapTitlesToExportCsv([
            {
                nr: '3',
                title: 'Titlu test',
            },
        ])).toBe([
            'Nr;Titlu',
            '3;Titlu test',
        ].join('\n'))
    })

    it('maps persons without image to OC CSV', () => {
        expect(mapPersonsToExportCsv([
            {
                name: 'Ion',
                role: 'Invitat',
                image: '',
            },
        ])).toBe([
            'Nume;Functie',
            'Ion;Invitat',
        ].join('\n'))
    })

    it('maps phones from persons with image to OC CSV', () => {
        expect(mapPhonesToExportCsv([
            {
                name: 'Ion',
                role: 'Invitat',
                image: 'D:\\photos\\ion.jpg',
            },
        ])).toBe([
            'Nume;Functie;Image',
            'Ion;Invitat;D:\\photos\\ion.jpg',
        ].join('\n'))
    })

    it('maps locations to OC CSV', () => {
        expect(mapLocationsToExportCsv([
            {
                location: 'Chișinău',
            },
        ])).toBe([
            'Locatie',
            'Chișinău',
        ].join('\n'))
    })

    it('excludes persons with image from persons.csv', () => {
        expect(mapPersonsToExportCsv([
            {
                name: 'Ion',
                role: 'Invitat',
                image: 'D:\\photos\\ion.jpg',
            },
            {
                name: 'Ana',
                role: 'Expert',
                image: '',
            },
        ])).toBe([
            'Nume;Functie',
            'Ana;Expert',
        ].join('\n'))
    })

    it('includes only persons with image in phones.csv', () => {
        expect(mapPhonesToExportCsv([
            {
                name: 'Ion',
                role: 'Invitat',
                image: 'D:\\photos\\ion.jpg',
            },
            {
                name: 'Ana',
                role: 'Expert',
                image: '',
            },
        ])).toBe([
            'Nume;Functie;Image',
            'Ion;Invitat;D:\\photos\\ion.jpg',
        ].join('\n'))
    })

    it('returns header-only CSV for empty lists', () => {
        expect(mapTitlesToExportCsv([])).toBe('Nr;Titlu')
        expect(mapPersonsToExportCsv([])).toBe('Nume;Functie')
        expect(mapPhonesToExportCsv([])).toBe('Nume;Functie;Image')
        expect(mapLocationsToExportCsv([])).toBe('Locatie')
    })

    it('keeps Nr exactly as received from the full CSV', () => {
        expect(mapTitlesToExportCsv([
            {
                nr: '003',
                title: 'Primul titlu',
            },
            {
                nr: '7A',
                title: 'Al doilea titlu',
            },
        ])).toBe([
            'Nr;Titlu',
            '003;Primul titlu',
            '7A;Al doilea titlu',
        ].join('\n'))
    })

    it('maps EntitiesState to all PA export CSVs with section markers', () => {
        const result = mapEntitiesStateToExportCsvs({
            sections: [
                {
                    id: 'section-1',
                    kind: 'invited',
                    rows: [
                        {
                            id: 'row-title',
                            title: {
                                id: 'title-1',
                                nr: '007',
                                title: 'Titlu din state',
                            },
                        },
                        {
                            id: 'row-person',
                            person: {
                                id: 'person-1',
                                name: 'Ion',
                                occupation: 'Invitat',
                            },
                        },
                        {
                            id: 'row-phone',
                            person: {
                                id: 'person-2',
                                name: 'Ana',
                                occupation: 'Reporter',
                                image: 'D:\\photos\\ana.jpg',
                            },
                        },
                        {
                            id: 'row-location',
                            location: {
                                id: 'location-1',
                                location: 'Chișinău',
                            },
                        },
                    ],
                },
            ],
        })

        expect(result).toEqual({
            titlesCsv: [
                'Nr;Titlu;Ultima Ora',
                '--- INVITATI ---;;',
                '1;Titlu din state;',
            ].join('\n'),
            personsCsv: [
                'Sectiune;Nume;Functie',
                '--- INVITATI ---;;',
                ';Ion;Invitat',
            ].join('\n'),
            locationsCsv: [
                'Locatie',
                'Chișinău',
            ].join('\n'),
            phonesCsv: [
                'Nume;Functie;Image',
                'Ana;Reporter;D:\\photos\\ana.jpg',
            ].join('\n'),
            waitTitlesLocationsCsv: 'Titlu;Locatie',
        })
    })

    it('maps full CSV content through the PA sections model', () => {
        const result = mapFullCsvContentToExportCsvs([
            'Nr;Titlu;Nume;Functie;Image;Locatie',
            '003;Titlu CSV;Ion;Invitat;;Chișinău',
            '7A;Alt titlu;Ana;Reporter;D:\\photos\\ana.jpg;',
        ].join('\n'))

        expect(result).toEqual({
            titlesCsv: [
                'Nr;Titlu;Ultima Ora',
                '--- INVITATI ---;;',
                '1;Titlu CSV;',
                '2;Alt titlu;',
            ].join('\n'),
            personsCsv: [
                'Sectiune;Nume;Functie',
                '--- INVITATI ---;;',
                ';Ion;Invitat',
            ].join('\n'),
            locationsCsv: [
                'Locatie',
                'Chișinău',
            ].join('\n'),
            phonesCsv: [
                'Nume;Functie;Image',
                'Ana;Reporter;D:\\photos\\ana.jpg',
            ].join('\n'),
            waitTitlesLocationsCsv: 'Titlu;Locatie',
        })
    })

    it('maps full CSV default content and keeps empty export files header-only', () => {
        const result = mapFullCsvContentToExportCsvs([
            'Nr;Titlu;Nume;Functie;Image;Locatie',
            ';Titlu implicit;;;;',
        ].join('\n'))

        expect(result).toEqual({
            titlesCsv: [
                'Nr;Titlu;Ultima Ora',
                '--- INVITATI ---;;',
                '1;Titlu implicit;',
            ].join('\n'),
            personsCsv: [
                'Sectiune;Nume;Functie',
                '--- INVITATI ---;;',
            ].join('\n'),
            locationsCsv: 'Locatie',
            phonesCsv: 'Nume;Functie;Image',
            waitTitlesLocationsCsv: 'Titlu;Locatie',
        })
    })

    it('maps wait titles and locations into the PA convenience CSV', () => {
        const result = mapFullCsvContentToExportCsvs([
            'Nr;Titlu;Nume;Functie;Image;Locatie;Ultima Ora;Titlu Asteptare;Locatie Asteptare',
            ';;;;;;;Titlu wait;',
            ';;;;;;;;Locatie wait',
        ].join('\n'))

        expect(result.waitTitlesLocationsCsv).toBe([
            'Titlu;Locatie',
            'Titlu wait;Locatie wait',
        ].join('\n'))
    })

    it('preserves PA section markers when regenerating exports from the full CSV', () => {
        const result = mapFullCsvContentToExportCsvs([
            'Nr;Titlu;Nume;Functie;Image;Locatie;Ultima Ora;Titlu Asteptare;Locatie Asteptare',
            ';--- beta 1 - Extern ---;;;;;;;',
            ';Titlu beta;Invitat beta;Rol beta;;;;;',
            ';--- INVITATI ---;;;;;;;',
            ';Titlu platou;Invitat platou;Rol platou;;;Ultima ora;;',
        ].join('\n'))

        expect(result.titlesCsv).toBe([
            'Nr;Titlu;Ultima Ora',
            '--- beta 1 - Extern ---;;',
            '1;Titlu beta;',
            '--- INVITATI ---;;',
            '1;Titlu platou;Ultima ora',
        ].join('\n'))
        expect(result.personsCsv).toBe([
            'Sectiune;Nume;Functie',
            '--- beta 1 - Extern ---;;',
            ';Invitat beta;Rol beta',
            '--- INVITATI ---;;',
            ';Invitat platou;Rol platou',
        ].join('\n'))
    })
})

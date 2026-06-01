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

    it('maps EntitiesState to all OC export CSVs without recalculating Nr', () => {
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
                'Nr;Titlu',
                '007;Titlu din state',
            ].join('\n'),
            personsCsv: [
                'Nume;Functie',
                'Ion;Invitat',
            ].join('\n'),
            locationsCsv: [
                'Locatie',
                'Chișinău',
            ].join('\n'),
            phonesCsv: [
                'Nume;Functie;Image',
                'Ana;Reporter;D:\\photos\\ana.jpg',
            ].join('\n'),
        })
    })

    it('maps full CSV content to OC export CSVs and preserves Nr exactly', () => {
        const result = mapFullCsvContentToExportCsvs([
            'Nr;Titlu;Nume;Functie;Image;Locatie',
            '003;Titlu CSV;Ion;Invitat;;Chișinău',
            '7A;Alt titlu;Ana;Reporter;D:\\photos\\ana.jpg;',
        ].join('\n'))

        expect(result).toEqual({
            titlesCsv: [
                'Nr;Titlu',
                '003;Titlu CSV',
                '7A;Alt titlu',
            ].join('\n'),
            personsCsv: [
                'Nume;Functie',
                'Ion;Invitat',
            ].join('\n'),
            locationsCsv: [
                'Locatie',
                'Chișinău',
            ].join('\n'),
            phonesCsv: [
                'Nume;Functie;Image',
                'Ana;Reporter;D:\\photos\\ana.jpg',
            ].join('\n'),
        })
    })

    it('maps full CSV default content and keeps empty export files header-only', () => {
        const result = mapFullCsvContentToExportCsvs([
            'Nr;Titlu;Nume;Functie;Image;Locatie',
            ';Titlu implicit;;;;',
        ].join('\n'))

        expect(result).toEqual({
            titlesCsv: [
                'Nr;Titlu',
                ';Titlu implicit',
            ].join('\n'),
            personsCsv: 'Nume;Functie',
            locationsCsv: 'Locatie',
            phonesCsv: 'Nume;Functie;Image',
        })
    })
})

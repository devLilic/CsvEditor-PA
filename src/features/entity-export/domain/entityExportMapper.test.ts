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
    it('stores uppercase template text values in exported CSVs', () => {
        const titleTemplate = {
            id: 'uppercase-title',
            name: 'Uppercase title',
            canvas: { width: 1920, height: 1080, background: { type: 'color', value: '#000' } },
            layers: [
                { id: 'headline', type: 'text', fieldId: 'title', textStyle: { transform: 'uppercase' }, x: 0, y: 0, width: 400, height: 80, zIndex: 1 },
                { id: 'custom', type: 'text', fieldId: 'customLabel', textStyle: { transform: 'uppercase' }, x: 0, y: 80, width: 400, height: 80, zIndex: 2 },
            ],
        }
        const showDocument = {
            templates: { titles: titleTemplate },
            lowerThirdVariants: { titles: { ordinary: titleTemplate } },
        }
        const entities = { sections: [{
            id: 'invited', kind: 'invited' as const,
            rows: [{ id: 'row', title: { id: 'title', title: 'Preturile la energie cresc', customFields: { customLabel: 'text demo' } } }],
        }] }

        const csv = mapEntitiesStateToExportCsvs(entities, undefined, '', undefined, showDocument as any).titlesCsv

        expect(csv).toContain('PRETURILE LA ENERGIE CRESC')
        expect(csv).toContain('TEXT DEMO')
    })

    it('applies uppercase transforms configured on individual text parts', () => {
        const personTemplate = {
            id: 'person-parts',
            name: 'Person parts',
            canvas: { width: 1920, height: 1080, background: { type: 'color', value: '#000' } },
            layers: [{
                id: 'person', type: 'text', fieldId: 'name',
                textParts: [
                    { fieldId: 'name', transform: 'uppercase' },
                    { fieldId: 'occupation' },
                ],
                x: 0, y: 0, width: 400, height: 80, zIndex: 1,
            }],
        }
        const showDocument = {
            templates: { persons: personTemplate },
            lowerThirdVariants: { persons: { ordinary: personTemplate } },
        }
        const entities = { sections: [{
            id: 'invited', kind: 'invited' as const,
            rows: [{ id: 'row', person: { id: 'person', name: 'Ana Popescu', occupation: 'Reporter' } }],
        }] }

        const csv = mapEntitiesStateToExportCsvs(entities, undefined, '', undefined, showDocument as any).personsCsv

        expect(csv).toContain('ANA POPESCU')
        expect(csv).toContain('Reporter')
    })

    it('appends only active-show template custom fields to the stable title export columns', () => {
        const activeTemplate = {
            id: 'title-ordinary',
            name: 'Ordinary',
            canvas: { width: 1920, height: 1080, background: { type: 'color', value: '#000' } },
            layers: [
                { id: 'headline', type: 'text', fieldId: 'headlineText', x: 0, y: 0, width: 400, height: 80, zIndex: 1 },
                { id: 'split', type: 'text', fieldId: 'title', textParts: [{ fieldId: 'desk', prefix: ' • ' }], x: 0, y: 80, width: 400, height: 80, zIndex: 2 },
                { id: 'collision', type: 'text', fieldId: 'Template', x: 0, y: 160, width: 400, height: 80, zIndex: 3 },
                { id: 'hidden', type: 'text', fieldId: 'hiddenValue', visible: false, x: 0, y: 240, width: 400, height: 80, zIndex: 4 },
            ],
        } as any
        const breakingTemplate = {
            ...activeTemplate,
            id: 'title-breaking',
            layers: [{ id: 'breaking', type: 'text', fieldId: 'breakingOnly', x: 0, y: 0, width: 400, height: 80, zIndex: 1 }],
        }
        const entities = {
            sections: [{
                id: 'invited', kind: 'invited' as const,
                rows: [{ id: 'row', title: { id: 't', title: 'Test headline', customFields: {
                    headlineText: 'Custom headline', desk: 'Politics desk', unusedBase: 'Should not export',
                    hiddenValue: 'Hidden value', anotherShow: 'Do not leak', breakingOnly: 'Wrong variant value',
                    Template: 'Overwrite fixed template',
                } } }],
            }],
        }
        const showDocument = {
            templates: { titles: activeTemplate },
            lowerThirdVariants: { titles: { ordinary: activeTemplate, 'breaking-news': breakingTemplate } },
        }

        const csv = mapEntitiesStateToExportCsvs(entities, undefined, '', undefined, showDocument as any).titlesCsv
        const [header, , row] = csv.split('\n')
        expect(header).toBe('Nr;Titlu;Supratitlu;Template;headlineText;desk;breakingOnly')
        expect(row).toContain('Test headline')
        expect(row).toContain('Custom headline')
        expect(row).toContain('Politics desk')
        expect(csv).not.toContain('hiddenValue')
        expect(csv).not.toContain('anotherShow')
        expect(csv).not.toContain('Should not export')
        expect(csv).not.toContain('Overwrite fixed template')
        expect(csv).not.toContain('Wrong variant value')
        expect(mapEntitiesStateToExportCsvs({ sections: [] }, undefined, '', undefined, showDocument as any).titlesCsv.split('\n')[0])
            .toBe(header)
    })

    it('namespaces colliding custom fields for wait titles and wait locations', () => {
        const titleTemplate = {
            id: 'wait-title', name: 'Wait title', canvas: { width: 1920, height: 1080, background: { type: 'color', value: '#000' } },
            layers: [{ id: 't', type: 'text', fieldId: 'customNote', x: 0, y: 0, width: 400, height: 80, zIndex: 1 }],
        }
        const locationTemplate = {
            ...titleTemplate, id: 'wait-location', name: 'Wait location',
        }
        const showDocument = {
            templates: { waitTitles: titleTemplate, waitLocations: locationTemplate },
            lowerThirdVariants: { titles: {}, persons: {} },
        }
        const csv = mapEntitiesStateToExportCsvs({ sections: [{
            id: 'invited', kind: 'invited', rows: [{
                id: 'row',
                waitTitle: { id: 'wt', title: 'Wait', customFields: { customNote: 'TITLE NOTE' } },
                waitLocation: { id: 'wl', location: 'Place', customFields: { customNote: 'LOCATION NOTE' } },
            }],
        }] }, undefined, '', undefined, showDocument as any).waitTitlesLocationsCsv

        expect(csv.split('\n')[0]).toBe('Titlu;Template Titlu;Locatie;Template Locatie;waitTitle.customNote;waitLocation.customNote')
        expect(csv.split('\n')[1]).toContain('TITLE NOTE;LOCATION NOTE')
    })

    it('maps titles to OC CSV', () => {
        expect(mapTitlesToExportCsv([
            {
                nr: '3',
                title: 'Titlu test',
                supratitle: 'Supratitlu exemplu',
            },
        ])).toBe([
            'Nr;Titlu;Supratitlu',
            '3;Titlu test;Supratitlu exemplu',
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
        expect(mapTitlesToExportCsv([])).toBe('Nr;Titlu;Supratitlu')
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
            'Nr;Titlu;Supratitlu',
            '003;Primul titlu;',
            '7A;Al doilea titlu;',
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
                            supratitle: '',
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
                'Nr;Titlu;Supratitlu;Template',
                '--- INVITATI ---;;;',
                '1;Titlu din state;;01_Titlu',
            ].join('\n'),
            personsCsv: [
                'Sectiune;Nume;Functie;Template',
                '--- INVITATI ---;;;',
                ';Ion;Invitat;02_Nume',
            ].join('\n'),
            locationsCsv: [
                'Locatie;Template',
                'Chișinău;Location Bug',
            ].join('\n'),
            phonesCsv: [
                'Nume;Functie;Image;Template',
                'Ana;Reporter;D:\\photos\\ana.jpg;Phone Call Lower Third',
            ].join('\n'),
            waitTitlesLocationsCsv: 'Titlu;Template Titlu;Locatie;Template Locatie',
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
                'Nr;Titlu;Supratitlu;Template',
                '--- INVITATI ---;;;',
                '1;Titlu CSV;;01_Titlu',
                '2;Alt titlu;;01_Titlu',
            ].join('\n'),
            personsCsv: [
                'Sectiune;Nume;Functie;Template',
                '--- INVITATI ---;;;',
                ';Ion;Invitat;02_Nume',
            ].join('\n'),
            locationsCsv: [
                'Locatie;Template',
                'Chișinău;Location Bug',
            ].join('\n'),
            phonesCsv: [
                'Nume;Functie;Image;Template',
                'Ana;Reporter;D:\\photos\\ana.jpg;Phone Call Lower Third',
            ].join('\n'),
            waitTitlesLocationsCsv: 'Titlu;Template Titlu;Locatie;Template Locatie',
        })
    })

    it('maps full CSV default content and keeps empty export files header-only', () => {
        const result = mapFullCsvContentToExportCsvs([
            'Nr;Titlu;Nume;Functie;Image;Locatie',
            ';Titlu implicit;;;;',
        ].join('\n'))

        expect(result).toEqual({
            titlesCsv: [
                'Nr;Titlu;Supratitlu;Template',
                '--- INVITATI ---;;;',
                '1;Titlu implicit;;01_Titlu',
            ].join('\n'),
            personsCsv: [
                'Sectiune;Nume;Functie;Template',
                '--- INVITATI ---;;;',
            ].join('\n'),
            locationsCsv: 'Locatie;Template',
            phonesCsv: 'Nume;Functie;Image;Template',
            waitTitlesLocationsCsv: 'Titlu;Template Titlu;Locatie;Template Locatie',
        })
    })

    it('maps wait titles and locations into the PA convenience CSV', () => {
        const result = mapFullCsvContentToExportCsvs([
            'Nr;Titlu;Nume;Functie;Image;Locatie;Ultima Ora;Titlu Asteptare;Locatie Asteptare',
            ';;;;;;;Titlu wait;',
            ';;;;;;;;Locatie wait',
        ].join('\n'))

        expect(result.waitTitlesLocationsCsv).toBe([
            'Titlu;Template Titlu;Locatie;Template Locatie',
            'Titlu wait;Wait Title;Locatie wait;Wait Location',
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
            'Nr;Titlu;Supratitlu;Template',
            '--- beta 1 - Extern ---;;;',
            '1;Titlu beta;;01_Titlu',
            '--- INVITATI ---;;;',
            '1;Titlu platou;;01_Titlu',
        ].join('\n'))
        expect(result.personsCsv).toBe([
            'Sectiune;Nume;Functie;Template',
            '--- beta 1 - Extern ---;;;',
            ';Invitat beta;Rol beta;02_Nume',
            '--- INVITATI ---;;;',
            ';Invitat platou;Rol platou;02_Nume',
        ].join('\n'))
    })
})

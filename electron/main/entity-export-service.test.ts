import { beforeEach, describe, expect, it, vi } from 'vitest'
import { promises as fsp } from 'node:fs'
import {
    exportEntityCsvFilesFromEntities,
    exportSingleEntityCsv,
    type ExportSingleEntityCsvInput,
} from './entity-export-service'

vi.mock('node:fs', () => ({
    promises: {
        mkdir: vi.fn(),
        writeFile: vi.fn(),
    },
}))

const baseInput: ExportSingleEntityCsvInput = {
    kind: 'titles',
    paths: {
        titlesPath: 'D:\\TV\\OC\\Export\\OC_titles.csv',
        personsPath: 'D:\\TV\\OC\\Export\\OC_persons.csv',
        locationsPath: 'D:\\TV\\OC\\Export\\OC_locations.csv',
        phonesPath: 'D:\\TV\\OC\\Export\\OC_phones.csv',
    },
    csvs: {
        titlesCsv: 'Nr;Titlu\n3;Titlu test',
        personsCsv: 'Nume;Functie',
        locationsCsv: 'Locatie',
        phonesCsv: 'Nume;Functie;Image',
    },
}

describe('entity-export-service retry write logic', () => {
    beforeEach(() => {
        vi.mocked(fsp.mkdir).mockReset()
        vi.mocked(fsp.writeFile).mockReset()
        vi.mocked(fsp.mkdir).mockResolvedValue(undefined)
        vi.mocked(fsp.writeFile).mockResolvedValue(undefined)
    })

    it('succeeds on first try', async () => {
        await expect(exportSingleEntityCsv(baseInput)).resolves.toEqual({ ok: true })

        expect(fsp.mkdir).toHaveBeenCalledTimes(1)
        expect(fsp.writeFile).toHaveBeenCalledTimes(1)
        expect(fsp.writeFile).toHaveBeenCalledWith(
            'D:\\TV\\OC\\Export\\OC_titles.csv',
            'Nr;Titlu\n3;Titlu test',
            {
                encoding: 'utf-8',
                flag: 'w',
            }
        )
    })

    it('retries after failure and succeeds on second try', async () => {
        vi.mocked(fsp.writeFile)
            .mockRejectedValueOnce(new Error('LOCKED'))
            .mockResolvedValueOnce(undefined)

        await expect(exportSingleEntityCsv(baseInput)).resolves.toEqual({ ok: true })

        expect(fsp.mkdir).toHaveBeenCalledTimes(2)
        expect(fsp.writeFile).toHaveBeenCalledTimes(2)
    })

    it('returns error after failing three times', async () => {
        const onError = vi.fn()
        vi.mocked(fsp.writeFile).mockRejectedValue(new Error('LOCKED'))

        await expect(exportSingleEntityCsv({
            ...baseInput,
            onError,
        })).resolves.toEqual({
            ok: false,
            error: 'LOCKED',
        })

        expect(fsp.mkdir).toHaveBeenCalledTimes(3)
        expect(fsp.writeFile).toHaveBeenCalledTimes(3)
        expect(onError).toHaveBeenCalledWith({
            kind: 'titles',
            filePath: 'D:\\TV\\OC\\Export\\OC_titles.csv',
            error: expect.any(Error),
        })
    })

    it('creates export folder when it is missing', async () => {
        await exportSingleEntityCsv(baseInput)

        expect(fsp.mkdir).toHaveBeenCalledWith('D:\\TV\\OC\\Export', {
            recursive: true,
        })
    })

    it('exports all entity CSV files from EntitiesState', async () => {
        await expect(exportEntityCsvFilesFromEntities({
            paths: baseInput.paths,
            entities: {
                sections: [
                    {
                        id: 'section-1',
                        kind: 'invited',
                        rows: [
                            {
                                id: 'row-title',
                                title: {
                                    id: 'title-1',
                                    nr: '003',
                                    title: 'Titlu proiect',
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
                                    location: 'Chisinau',
                                },
                            },
                        ],
                    },
                ],
            },
        })).resolves.toEqual({ ok: true })

        expect(fsp.writeFile).toHaveBeenCalledTimes(4)
        expect(fsp.writeFile).toHaveBeenCalledWith(
            'D:\\TV\\OC\\Export\\OC_titles.csv',
            'Nr;Titlu\n003;Titlu proiect',
            expect.any(Object)
        )
        expect(fsp.writeFile).toHaveBeenCalledWith(
            'D:\\TV\\OC\\Export\\OC_persons.csv',
            'Nume;Functie\nIon;Invitat',
            expect.any(Object)
        )
        expect(fsp.writeFile).toHaveBeenCalledWith(
            'D:\\TV\\OC\\Export\\OC_locations.csv',
            'Locatie\nChisinau',
            expect.any(Object)
        )
        expect(fsp.writeFile).toHaveBeenCalledWith(
            'D:\\TV\\OC\\Export\\OC_phones.csv',
            'Nume;Functie;Image\nAna;Reporter;D:\\photos\\ana.jpg',
            expect.any(Object)
        )
    })
})

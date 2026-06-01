import type { EntitiesState, SimpleTitle } from '../../csv-editor/domain/entities'
import Papa from 'papaparse'
import { CSV_COLUMNS } from '../../csv-editor/utils/csvParser'
import { serializeEntityCsv } from './entityCsvSerializer'

export interface ExportTitle {
    nr: string
    title: string
}

export interface ExportPerson {
    name: string
    role: string
    image?: string
}

export interface ExportLocation {
    location: string
}

export interface EntityExportCsvs {
    titlesCsv: string
    personsCsv: string
    locationsCsv: string
    phonesCsv: string
}

type CsvRawRow = Record<string, string | undefined>

type TitleWithOptionalNr = SimpleTitle & {
    nr?: unknown
}

function hasImage(person: ExportPerson): boolean {
    return typeof person.image === 'string' && person.image.trim() !== ''
}

function getTitleNr(title: SimpleTitle): string {
    const nr = (title as TitleWithOptionalNr).nr

    if (typeof nr === 'string') {
        return nr
    }

    if (typeof nr === 'number') {
        return String(nr)
    }

    return ''
}

export function mapTitlesToExportCsv(titles: ExportTitle[]): string {
    return serializeEntityCsv(
        ['Nr', 'Titlu'],
        titles.map((title) => [
            ['Nr', title.nr],
            ['Titlu', title.title],
        ]).map(Object.fromEntries)
    )
}

export function mapPersonsToExportCsv(persons: ExportPerson[]): string {
    return serializeEntityCsv(
        ['Nume', 'Functie'],
        persons
            .filter((person) => !hasImage(person))
            .map((person) => [
                ['Nume', person.name],
                ['Functie', person.role],
            ]).map(Object.fromEntries)
    )
}

export function mapPhonesToExportCsv(persons: ExportPerson[]): string {
    return serializeEntityCsv(
        ['Nume', 'Functie', 'Image'],
        persons
            .filter(hasImage)
            .map((person) => [
                ['Nume', person.name],
                ['Functie', person.role],
                ['Image', person.image ?? ''],
            ]).map(Object.fromEntries)
    )
}

export function mapLocationsToExportCsv(locations: ExportLocation[]): string {
    return serializeEntityCsv(
        ['Locatie'],
        locations.map((location) => [
            ['Locatie', location.location],
        ]).map(Object.fromEntries)
    )
}

export function mapEntitiesStateToExportCsvs(state: EntitiesState): EntityExportCsvs {
    const titles: ExportTitle[] = []
    const persons: ExportPerson[] = []
    const locations: ExportLocation[] = []

    for (const section of state.sections) {
        for (const row of section.rows) {
            if (row.title) {
                titles.push({
                    nr: getTitleNr(row.title),
                    title: row.title.title,
                })
            }

            if (row.person) {
                persons.push({
                    name: row.person.name,
                    role: row.person.occupation,
                    image: row.person.image ?? '',
                })
            }

            if (row.location) {
                locations.push({
                    location: row.location.location,
                })
            }
        }
    }

    return {
        titlesCsv: mapTitlesToExportCsv(titles),
        personsCsv: mapPersonsToExportCsv(persons),
        locationsCsv: mapLocationsToExportCsv(locations),
        phonesCsv: mapPhonesToExportCsv(persons),
    }
}

function cell(row: CsvRawRow, column: string): string {
    return (row[column] ?? '').trim()
}

export function mapFullCsvContentToExportCsvs(content: string): EntityExportCsvs {
    const parsed = Papa.parse<CsvRawRow>(content, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
    })
    const titles: ExportTitle[] = []
    const persons: ExportPerson[] = []
    const locations: ExportLocation[] = []

    for (const row of parsed.data) {
        const nr = cell(row, CSV_COLUMNS.TITLE_NR)
        const title = cell(row, CSV_COLUMNS.TITLE)
        const name = cell(row, CSV_COLUMNS.PERSON_NAME)
        const role = cell(row, CSV_COLUMNS.PERSON_OCCUPATION)
        const image = cell(row, CSV_COLUMNS.IMAGE)
        const location = cell(row, CSV_COLUMNS.LOCATION)

        if (title) {
            titles.push({
                nr,
                title,
            })
        }

        if (name || role || image) {
            persons.push({
                name,
                role,
                image,
            })
        }

        if (location) {
            locations.push({
                location,
            })
        }
    }

    return {
        titlesCsv: mapTitlesToExportCsv(titles),
        personsCsv: mapPersonsToExportCsv(persons),
        locationsCsv: mapLocationsToExportCsv(locations),
        phonesCsv: mapPhonesToExportCsv(persons),
    }
}

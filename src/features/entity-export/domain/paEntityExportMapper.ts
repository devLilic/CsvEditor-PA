import type { CsvSection, EntitiesState } from '../../csv-editor/domain/entities'
import { buildBetaMarker, CSV_SECTION_MARKERS } from '../../csv-editor/domain/csv.schema'
import { serializeEntityCsv } from './entityCsvSerializer'

function getSectionMarker(section: CsvSection): string {
    return section.kind === 'beta'
        ? buildBetaMarker(section.betaIndex ?? 0, section.betaTitle ?? '')
        : CSV_SECTION_MARKERS.INVITED
}

function hasImage(image?: string): boolean {
    return typeof image === 'string' && image.trim() !== ''
}

export function mapPaTitlesExport(state: EntitiesState): string {
    const rows: Record<string, string>[] = []

    for (const section of state.sections) {
        rows.push({ Nr: getSectionMarker(section), Titlu: '', 'Ultima Ora': '' })
        const titles = section.rows.flatMap((row) => row.title ? [row.title] : [])
        const hotTitles = section.kind === 'invited'
            ? section.rows.flatMap((row) => row.hotTitle ? [row.hotTitle] : [])
            : []
        const rowCount = Math.max(titles.length, hotTitles.length)

        for (let index = 0; index < rowCount; index += 1) {
            rows.push({
                Nr: titles[index] ? String(index + 1) : '',
                Titlu: titles[index]?.title ?? '',
                'Ultima Ora': hotTitles[index]?.title ?? '',
            })
        }
    }

    return serializeEntityCsv(['Nr', 'Titlu', 'Ultima Ora'], rows)
}

export function mapPaPersonsExport(state: EntitiesState): string {
    const rows: Record<string, string>[] = []

    for (const section of state.sections) {
        rows.push({ Sectiune: getSectionMarker(section), Nume: '', Functie: '' })

        for (const row of section.rows) {
            if (!row.person || hasImage(row.person.image)) continue
            rows.push({
                Sectiune: '',
                Nume: row.person.name,
                Functie: row.person.occupation,
            })
        }
    }

    return serializeEntityCsv(['Sectiune', 'Nume', 'Functie'], rows)
}

export function mapPaLocationsExport(state: EntitiesState): string {
    return serializeEntityCsv(
        ['Locatie'],
        state.sections
            .filter((section) => section.kind === 'invited')
            .flatMap((section) => section.rows)
            .flatMap((row) => row.location ? [{ Locatie: row.location.location }] : [])
    )
}

export function mapPaPhonesExport(state: EntitiesState): string {
    return serializeEntityCsv(
        ['Nume', 'Functie', 'Image'],
        state.sections
            .filter((section) => section.kind === 'invited')
            .flatMap((section) => section.rows)
            .flatMap((row) => row.person && hasImage(row.person.image)
                ? [{ Nume: row.person.name, Functie: row.person.occupation, Image: row.person.image ?? '' }]
                : [])
    )
}

export function mapPaWaitTitlesLocationsValues(titles: string[], locations: string[]): string {
    const rowCount = Math.max(titles.length, locations.length)

    return serializeEntityCsv(
        ['Titlu', 'Locatie'],
        Array.from({ length: rowCount }, (_, index) => ({
            Titlu: titles[index] ?? '',
            Locatie: locations[index] ?? '',
        }))
    )
}

export function mapPaWaitTitlesLocationsExport(state: EntitiesState): string {
    const invitedRows = state.sections
        .filter((section) => section.kind === 'invited')
        .flatMap((section) => section.rows)

    return mapPaWaitTitlesLocationsValues(
        invitedRows.flatMap((row) => row.waitTitle ? [row.waitTitle.title] : []),
        invitedRows.flatMap((row) => row.waitLocation ? [row.waitLocation.location] : [])
    )
}

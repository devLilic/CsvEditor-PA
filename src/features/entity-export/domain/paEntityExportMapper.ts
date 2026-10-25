import type { CsvSection, EntitiesState } from '../../csv-editor/domain/entities'
import { buildBetaMarker, CSV_SECTION_MARKERS } from '../../csv-editor/domain/csv.schema'
import { serializeEntityCsv } from './entityCsvSerializer'
import { DEFAULT_LOWER_THIRD_TYPES } from '../../lower-thirds/domain/lowerThirdTypes'
import { getLowerThirdTemplateName } from '../../lower-thirds/domain/lowerThirdAssignments'
import type { LowerThirdTypeDefinition } from '../../lower-thirds/domain/lowerThirdTypes'
import { DEFAULT_ENTITY_TEMPLATE_NAMES, type EntityTemplateNames } from '../../lower-thirds/domain/entityTemplateNames'

function prefixedTemplateName(name: string, prefix: string): string {
    return prefix && !name.startsWith(prefix) ? `${prefix}${name}` : name
}

function getSectionMarker(section: CsvSection): string {
    return section.kind === 'beta'
        ? buildBetaMarker(section.betaIndex ?? 0, section.betaTitle ?? '')
        : CSV_SECTION_MARKERS.INVITED
}

function hasImage(image?: string): boolean {
    return typeof image === 'string' && image.trim() !== ''
}

export function mapPaTitlesExport(
    state: EntitiesState,
    types: LowerThirdTypeDefinition[] = DEFAULT_LOWER_THIRD_TYPES,
    exportPrefix = '',
): string {
    const rows: Record<string, string>[] = []

    for (const section of state.sections) {
        rows.push({ Nr: getSectionMarker(section), Titlu: '', Supratitlu: '', Template: '' })
        const titles = section.rows.flatMap((row) => row.title ? [row.title] : [])

        for (let index = 0; index < titles.length; index += 1) {
            rows.push({
                Nr: String(index + 1),
                Titlu: titles[index].title,
                Supratitlu: titles[index].supratitle ?? '',
                Template: getLowerThirdTemplateName(titles[index], types, 'titles', exportPrefix),
            })
        }
    }

    return serializeEntityCsv(['Nr', 'Titlu', 'Supratitlu', 'Template'], rows)
}

export function mapPaPersonsExport(
    state: EntitiesState,
    types: LowerThirdTypeDefinition[] = DEFAULT_LOWER_THIRD_TYPES,
    exportPrefix = '',
): string {
    const rows: Record<string, string>[] = []

    for (const section of state.sections) {
        rows.push({ Sectiune: getSectionMarker(section), Nume: '', Functie: '', Template: '' })

        for (const row of section.rows) {
            if (!row.person || hasImage(row.person.image)) continue
            rows.push({
                Sectiune: '',
                Nume: row.person.name,
                Functie: row.person.occupation,
                Template: getLowerThirdTemplateName(row.person, types, 'persons', exportPrefix),
            })
        }
    }

    return serializeEntityCsv(['Sectiune', 'Nume', 'Functie', 'Template'], rows)
}

export function mapPaLocationsExport(
    state: EntitiesState,
    templates: EntityTemplateNames = DEFAULT_ENTITY_TEMPLATE_NAMES,
    exportPrefix = '',
): string {
    return serializeEntityCsv(
        ['Locatie', 'Template'],
        state.sections
            .filter((section) => section.kind === 'invited')
            .flatMap((section) => section.rows)
            .flatMap((row) => row.location ? [{
                Locatie: row.location.location,
                Template: prefixedTemplateName(templates.locations, exportPrefix),
            }] : [])
    )
}

export function mapPaPhonesExport(
    state: EntitiesState,
    templates: EntityTemplateNames = DEFAULT_ENTITY_TEMPLATE_NAMES,
    exportPrefix = '',
): string {
    return serializeEntityCsv(
        ['Nume', 'Functie', 'Image', 'Template'],
        state.sections
            .filter((section) => section.kind === 'invited')
            .flatMap((section) => section.rows)
            .flatMap((row) => row.person && hasImage(row.person.image)
                ? [{
                    Nume: row.person.name,
                    Functie: row.person.occupation,
                    Image: row.person.image ?? '',
                    Template: prefixedTemplateName(templates.phones, exportPrefix),
                }]
                : [])
    )
}

export function mapPaWaitTitlesLocationsValues(
    titles: string[],
    locations: string[],
    templates: EntityTemplateNames = DEFAULT_ENTITY_TEMPLATE_NAMES,
    exportPrefix = '',
): string {
    const rowCount = Math.max(titles.length, locations.length)

    return serializeEntityCsv(
        ['Titlu', 'Template Titlu', 'Locatie', 'Template Locatie'],
        Array.from({ length: rowCount }, (_, index) => ({
            Titlu: titles[index] ?? '',
            'Template Titlu': titles[index] ? prefixedTemplateName(templates.waitTitles, exportPrefix) : '',
            Locatie: locations[index] ?? '',
            'Template Locatie': locations[index] ? prefixedTemplateName(templates.waitLocations, exportPrefix) : '',
        }))
    )
}

export function mapPaWaitTitlesLocationsExport(
    state: EntitiesState,
    templates: EntityTemplateNames = DEFAULT_ENTITY_TEMPLATE_NAMES,
    exportPrefix = '',
): string {
    const invitedRows = state.sections
        .filter((section) => section.kind === 'invited')
        .flatMap((section) => section.rows)

    return mapPaWaitTitlesLocationsValues(
        invitedRows.flatMap((row) => row.waitTitle ? [row.waitTitle.title] : []),
        invitedRows.flatMap((row) => row.waitLocation ? [row.waitLocation.location] : []),
        templates,
        exportPrefix,
    )
}

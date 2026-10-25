import type { CsvSection, EntitiesState } from '../../csv-editor/domain/entities'
import { buildBetaMarker, CSV_SECTION_MARKERS } from '../../csv-editor/domain/csv.schema'
import { serializeEntityCsv } from './entityCsvSerializer'
import { DEFAULT_LOWER_THIRD_TYPES } from '../../lower-thirds/domain/lowerThirdTypes'
import { getLowerThirdTemplateName } from '../../lower-thirds/domain/lowerThirdAssignments'
import type { LowerThirdTypeDefinition } from '../../lower-thirds/domain/lowerThirdTypes'
import { DEFAULT_ENTITY_TEMPLATE_NAMES, type EntityTemplateNames } from '../../lower-thirds/domain/entityTemplateNames'
import type { ShowTemplateFieldConfig } from './entityTemplateFieldValues'
import { getEntityTemplateCustomFieldIds, getEntityTemplateCustomValues } from './entityTemplateFieldValues'

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
    show?: ShowTemplateFieldConfig,
): string {
    const rows: Record<string, string>[] = []
    const allTitles = state.sections.flatMap((section) => section.rows.flatMap((row) => row.title ? [row.title] : []))
    const customFieldIds = getEntityTemplateCustomFieldIds('titles', allTitles, show)

    for (const section of state.sections) {
        rows.push({ Nr: getSectionMarker(section), Titlu: '', Supratitlu: '', Template: '' })
        const titles = section.rows.flatMap((row) => row.title ? [row.title] : [])

        for (let index = 0; index < titles.length; index += 1) {
            rows.push({
                Nr: String(index + 1),
                Titlu: titles[index].title,
                Supratitlu: titles[index].supratitle ?? '',
                Template: getLowerThirdTemplateName(titles[index], types, 'titles', exportPrefix),
                ...getEntityTemplateCustomValues('titles', titles[index], show),
            })
        }
    }

    return serializeEntityCsv(['Nr', 'Titlu', 'Supratitlu', 'Template', ...customFieldIds], rows)
}

export function mapPaPersonsExport(
    state: EntitiesState,
    types: LowerThirdTypeDefinition[] = DEFAULT_LOWER_THIRD_TYPES,
    exportPrefix = '',
    show?: ShowTemplateFieldConfig,
): string {
    const rows: Record<string, string>[] = []
    const people = state.sections.flatMap((section) => section.rows.flatMap((row) => row.person && !hasImage(row.person.image) ? [row.person] : []))
    const customFieldIds = getEntityTemplateCustomFieldIds('persons', people, show)

    for (const section of state.sections) {
        rows.push({ Sectiune: getSectionMarker(section), Nume: '', Functie: '', Template: '' })

        for (const row of section.rows) {
            if (!row.person || hasImage(row.person.image)) continue
            rows.push({
                Sectiune: '',
                Nume: row.person.name,
                Functie: row.person.occupation,
                Template: getLowerThirdTemplateName(row.person, types, 'persons', exportPrefix),
                ...getEntityTemplateCustomValues('persons', row.person, show),
            })
        }
    }

    return serializeEntityCsv(['Sectiune', 'Nume', 'Functie', 'Template', ...customFieldIds], rows)
}

export function mapPaLocationsExport(
    state: EntitiesState,
    templates: EntityTemplateNames = DEFAULT_ENTITY_TEMPLATE_NAMES,
    exportPrefix = '',
    show?: ShowTemplateFieldConfig,
): string {
    const locations = state.sections.filter((section) => section.kind === 'invited').flatMap((section) => section.rows.flatMap((row) => row.location ? [row.location] : []))
    const customFieldIds = getEntityTemplateCustomFieldIds('locations', locations, show)
    return serializeEntityCsv(
        ['Locatie', 'Template', ...customFieldIds],
        state.sections
            .filter((section) => section.kind === 'invited')
            .flatMap((section) => section.rows)
            .flatMap((row) => row.location ? [{
                Locatie: row.location.location,
                Template: prefixedTemplateName(templates.locations, exportPrefix),
                ...getEntityTemplateCustomValues('locations', row.location, show),
            }] : [])
    )
}

export function mapPaPhonesExport(
    state: EntitiesState,
    templates: EntityTemplateNames = DEFAULT_ENTITY_TEMPLATE_NAMES,
    exportPrefix = '',
    show?: ShowTemplateFieldConfig,
): string {
    const phones = state.sections.filter((section) => section.kind === 'invited').flatMap((section) => section.rows.flatMap((row) => row.person && hasImage(row.person.image) ? [row.person] : []))
    const customFieldIds = getEntityTemplateCustomFieldIds('phoneCalls', phones, show)
    return serializeEntityCsv(
        ['Nume', 'Functie', 'Image', 'Template', ...customFieldIds],
        state.sections
            .filter((section) => section.kind === 'invited')
            .flatMap((section) => section.rows)
            .flatMap((row) => row.person && hasImage(row.person.image)
                ? [{
                    Nume: row.person.name,
                    Functie: row.person.occupation,
                    Image: row.person.image ?? '',
                    Template: prefixedTemplateName(templates.phones, exportPrefix),
                    ...getEntityTemplateCustomValues('phoneCalls', row.person, show),
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
    show?: ShowTemplateFieldConfig,
): string {
    const invitedRows = state.sections
        .filter((section) => section.kind === 'invited')
        .flatMap((section) => section.rows)

    const titleEntries = invitedRows.flatMap((row) => row.waitTitle ? [row.waitTitle] : [])
    const locationEntries = invitedRows.flatMap((row) => row.waitLocation ? [row.waitLocation] : [])
    const titleFieldIds = getEntityTemplateCustomFieldIds('waitTitles', titleEntries, show)
    const locationFieldIds = getEntityTemplateCustomFieldIds('waitLocations', locationEntries, show)
    const collisions = new Set(titleFieldIds.filter((id) => locationFieldIds.includes(id)))
    const titleColumnIds = new Map(titleFieldIds.map((id) => [id, collisions.has(id) ? `waitTitle.${id}` : id]))
    const locationColumnIds = new Map(locationFieldIds.map((id) => [id, collisions.has(id) ? `waitLocation.${id}` : id]))
    const customFieldIds = [...titleColumnIds.values(), ...locationColumnIds.values()]
    const rowCount = Math.max(titleEntries.length, locationEntries.length)
    const rows = Array.from({ length: rowCount }, (_, index) => ({
        Titlu: titleEntries[index]?.title ?? '',
        'Template Titlu': titleEntries[index] ? prefixedTemplateName(templates.waitTitles, exportPrefix) : '',
        Locatie: locationEntries[index]?.location ?? '',
        'Template Locatie': locationEntries[index] ? prefixedTemplateName(templates.waitLocations, exportPrefix) : '',
        ...(titleEntries[index]
            ? Object.fromEntries(Object.entries(getEntityTemplateCustomValues('waitTitles', titleEntries[index], show)).map(([id, value]) => [titleColumnIds.get(id) ?? id, value]))
            : {}),
        ...(locationEntries[index]
            ? Object.fromEntries(Object.entries(getEntityTemplateCustomValues('waitLocations', locationEntries[index], show)).map(([id, value]) => [locationColumnIds.get(id) ?? id, value]))
            : {}),
    }))
    return serializeEntityCsv(['Titlu', 'Template Titlu', 'Locatie', 'Template Locatie', ...customFieldIds], rows)
}

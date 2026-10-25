import type { EntitiesState } from '../../csv-editor/domain/entities'
import { parseCsv } from '../../csv-editor/utils/csvParser'
import { DEFAULT_LOWER_THIRD_TYPES } from '../../lower-thirds/domain/lowerThirdTypes'
import type { LowerThirdTypeDefinition } from '../../lower-thirds/domain/lowerThirdTypes'
import { DEFAULT_ENTITY_TEMPLATE_NAMES, type EntityTemplateNames } from '../../lower-thirds/domain/entityTemplateNames'
import { serializeEntityCsv } from './entityCsvSerializer'
import {
    mapPaLocationsExport,
    mapPaPersonsExport,
    mapPaPhonesExport,
    mapPaTitlesExport,
    mapPaWaitTitlesLocationsExport,
    mapPaWaitTitlesLocationsValues,
} from './paEntityExportMapper'
import type { ShowTemplateFieldConfig } from './entityTemplateFieldValues'
import { applyTemplateTextTransformsToEntities } from './entityTemplateFieldValues'

export interface ExportTitle {
    nr: string
    title: string
    supratitle?: string
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
    waitTitlesLocationsCsv: string
}

function hasImage(person: ExportPerson): boolean {
    return typeof person.image === 'string' && person.image.trim() !== ''
}

export function mapTitlesToExportCsv(titles: ExportTitle[]): string {
    return serializeEntityCsv(
        ['Nr', 'Titlu', 'Supratitlu'],
        titles.map((title) => [
            ['Nr', title.nr],
            ['Titlu', title.title],
            ['Supratitlu', title.supratitle ?? ''],
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

export function mapWaitTitlesLocationsToExportCsv(titles: string[], locations: string[]): string {
    return mapPaWaitTitlesLocationsValues(titles, locations)
}

export function mapEntitiesStateToExportCsvs(
    state: EntitiesState,
    lowerThirdTypes: LowerThirdTypeDefinition[] = DEFAULT_LOWER_THIRD_TYPES,
    exportPrefix = '',
    entityTemplateNames: EntityTemplateNames = DEFAULT_ENTITY_TEMPLATE_NAMES,
    showProject?: ShowTemplateFieldConfig,
): EntityExportCsvs {
    const exportState = showProject
        ? applyTemplateTextTransformsToEntities(state, showProject)
        : state
    return {
        titlesCsv: mapPaTitlesExport(exportState, lowerThirdTypes, exportPrefix, showProject),
        personsCsv: mapPaPersonsExport(exportState, lowerThirdTypes, exportPrefix, showProject),
        locationsCsv: mapPaLocationsExport(exportState, entityTemplateNames, exportPrefix, showProject),
        phonesCsv: mapPaPhonesExport(exportState, entityTemplateNames, exportPrefix, showProject),
        waitTitlesLocationsCsv: mapPaWaitTitlesLocationsExport(exportState, entityTemplateNames, exportPrefix, showProject),
    }
}

export function mapFullCsvContentToExportCsvs(
    content: string,
    lowerThirdTypes: LowerThirdTypeDefinition[] = DEFAULT_LOWER_THIRD_TYPES,
    exportPrefix = '',
    entityTemplateNames: EntityTemplateNames = DEFAULT_ENTITY_TEMPLATE_NAMES,
    showProject?: ShowTemplateFieldConfig,
): EntityExportCsvs {
    return mapEntitiesStateToExportCsvs(parseCsv(content), lowerThirdTypes, exportPrefix, entityTemplateNames, showProject)
}

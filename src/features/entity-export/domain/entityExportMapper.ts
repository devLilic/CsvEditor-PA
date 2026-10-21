import type { EntitiesState } from '../../csv-editor/domain/entities'
import { parseCsv } from '../../csv-editor/utils/csvParser'
import { DEFAULT_LOWER_THIRD_TYPES } from '../../lower-thirds/domain/lowerThirdTypes'
import type { LowerThirdTypeDefinition } from '../../lower-thirds/domain/lowerThirdTypes'
import { serializeEntityCsv } from './entityCsvSerializer'
import {
    mapPaLocationsExport,
    mapPaPersonsExport,
    mapPaPhonesExport,
    mapPaTitlesExport,
    mapPaTitlesWithHotExport,
    mapPaWaitTitlesLocationsExport,
    mapPaWaitTitlesLocationsValues,
} from './paEntityExportMapper'

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
    titlesWithHotCsv: string
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

export function mapEntitiesStateToExportCsvs(state: EntitiesState, lowerThirdTypes: LowerThirdTypeDefinition[] = DEFAULT_LOWER_THIRD_TYPES): EntityExportCsvs {
    return {
        titlesCsv: mapPaTitlesExport(state, lowerThirdTypes),
        titlesWithHotCsv: mapPaTitlesWithHotExport(state),
        personsCsv: mapPaPersonsExport(state, lowerThirdTypes),
        locationsCsv: mapPaLocationsExport(state),
        phonesCsv: mapPaPhonesExport(state),
        waitTitlesLocationsCsv: mapPaWaitTitlesLocationsExport(state),
    }
}

export function mapFullCsvContentToExportCsvs(content: string, lowerThirdTypes: LowerThirdTypeDefinition[] = DEFAULT_LOWER_THIRD_TYPES): EntityExportCsvs {
    return mapEntitiesStateToExportCsvs(parseCsv(content), lowerThirdTypes)
}

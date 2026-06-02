// src/features/csv-editor/domain/entities.ts
import type { SectionKind } from './csv.types'

export const EntityTypes = {
    TITLES: 'titles',
    PERSONS: 'persons',
    LOCATIONS: 'locations',
    /**
     * Editor/export view over persons with image. SectionRow intentionally
     * keeps the canonical CSV representation in the person slot.
     */
    PHONE_CALLS: 'phoneCalls',
    HOT_TITLES: 'hotTitles',
    WAIT_TITLES: 'waitTitles',
    WAIT_LOCATIONS: 'waitLocations',
} as const

export type EntityType = typeof EntityTypes[keyof typeof EntityTypes]

export interface BaseEntity {
    id: string
}

export interface Person extends BaseEntity {
    name: string
    occupation: string
    /**
     * Persons with an image are shown in the phoneCalls editor view.
     * This is still the CSV Image field, not a separate entity/type column.
     */
    image?: string
}

export interface SimpleTitle extends BaseEntity {
    nr?: string
    title: string
}

export interface Location extends BaseEntity {
    location: string
}

/**
 * Canonical row inside a section.
 * Packing/export is based on row order.
 */
export interface SectionRow {
    id: string

    // allowed in beta + invited
    title?: SimpleTitle
    person?: Person
    location?: Location
    hotTitle?: SimpleTitle

    // allowed only in INVITATI
    waitTitle?: SimpleTitle
    waitLocation?: Location
}

export interface CsvSection {
    id: string
    kind: SectionKind

    // beta-only metadata
    betaIndex?: number
    betaTitle?: string

    rows: SectionRow[]
}

export interface EntitiesState {
    sections: CsvSection[]
}

export function createInvitedSection(id: string, rows: SectionRow[] = []): CsvSection {
    return {
        id,
        kind: 'invited',
        rows,
    }
}

export function createBetaSection(
    id: string,
    betaIndex: number,
    betaTitle: string,
    rows: SectionRow[]
): CsvSection {
    return {
        id,
        kind: 'beta',
        betaIndex,               // 1..n
        betaTitle,               // editabil, ex: "Consiliu UE"
        rows,
    }
}

export function createEmptyEntitiesState(invitedId: string): EntitiesState {
    return {
        sections: [createInvitedSection(invitedId, [])],
    }
}

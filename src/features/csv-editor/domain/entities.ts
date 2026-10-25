// src/features/csv-editor/domain/entities.ts
import type { SectionKind } from './csv.types'
import type { PlateauTitleListItem } from './plateauTitleList'

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
    /** Values for show-specific template fields not represented in the fixed CSV schema. */
    customFields?: Record<string, string>
}

export function normalizeCustomFields(value: unknown): Record<string, string> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
    const output: Record<string, string> = {}
    for (const [fieldId, fieldValue] of Object.entries(value)) {
        if (!fieldId.trim() || fieldId.length > 128 || fieldId === '__proto__' || fieldId === 'constructor' || fieldId === 'prototype') continue
        if (typeof fieldValue === 'string') output[fieldId] = fieldValue
    }
    return Object.keys(output).length > 0 ? output : undefined
}

/** Preserve custom values on partial updates; replace them when the editor sends the field. */
export function getUpdatedCustomFields(
    existing: Record<string, string> | undefined,
    data: Record<string, unknown>,
): Record<string, string> | undefined {
    return Object.prototype.hasOwnProperty.call(data, 'customFields')
        ? normalizeCustomFields(data.customFields)
        : existing
}

export interface Person extends BaseEntity {
    name: string
    occupation: string
    lowerThirdTypeId?: string
    lowerThirdTemplateOverride?: string
    /**
     * Persons with an image are shown in the phoneCalls editor view.
     * This is still the CSV Image field, not a separate entity/type column.
     */
    image?: string
}

export interface SimpleTitle extends BaseEntity {
    nr?: string
    title: string
    supratitle?: string
    lowerThirdTypeId?: string
    lowerThirdTemplateOverride?: string
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

    // allowed only in INVITATI / PLATOU title ordering
    titleDivider?: Extract<PlateauTitleListItem, { type: 'divider' }>
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

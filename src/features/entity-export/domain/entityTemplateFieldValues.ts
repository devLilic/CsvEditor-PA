import type { BroadcastTemplate } from '../../../shared/preview/templateContract'
import { getTemplateCustomFieldValues, getTemplateTextFieldIds } from '../../../shared/preview/entityTemplateFieldValues'
import type { TemplateDocument } from '../../template-editor/domain/templateDocument'
import type { LowerThirdEntityKind } from '../../lower-thirds/domain/lowerThirdTypes'
import { DEFAULT_LOWER_THIRD_TYPE_ID } from '../../lower-thirds/domain/lowerThirdTypes'
import type { BaseEntity, EntitiesState } from '../../csv-editor/domain/entities'

type TemplateEntityKind = 'titles' | 'persons' | 'locations' | 'phoneCalls' | 'hotTitles' | 'waitTitles' | 'waitLocations'

export type ShowTemplateFieldConfig = Pick<TemplateDocument, 'templates' | 'lowerThirdVariants'> & {
    lowerThirdTypesEnabled?: boolean
}

export function resolveEntityActiveTemplate(
    entityType: TemplateEntityKind,
    entity: BaseEntity & { lowerThirdTypeId?: string },
    document?: ShowTemplateFieldConfig,
): BroadcastTemplate | undefined {
    if (!document) return undefined
    if (entityType === 'titles' || entityType === 'persons') {
        const kind = entityType as LowerThirdEntityKind
        const variants = document.lowerThirdVariants?.[kind]
        const typeId = document.lowerThirdTypesEnabled === false
            ? DEFAULT_LOWER_THIRD_TYPE_ID
            : entity.lowerThirdTypeId ?? DEFAULT_LOWER_THIRD_TYPE_ID
        return variants?.[typeId]
            ?? variants?.[DEFAULT_LOWER_THIRD_TYPE_ID]
            ?? document.templates?.[kind]
    }
    return document.templates?.[entityType]
}

export function getEntityUppercaseTextFieldIds(
    entityType: TemplateEntityKind,
    entity: BaseEntity & { lowerThirdTypeId?: string },
    document?: ShowTemplateFieldConfig,
): Set<string> {
    const template = resolveEntityActiveTemplate(entityType, entity, document)
    const fieldIds = new Set<string>()
    for (const layer of template?.layers ?? []) {
        if (layer.type !== 'text' || layer.visible === false) continue
        if (layer.textParts?.length) {
            for (const part of layer.textParts) {
                if (part.transform === 'uppercase') fieldIds.add(part.fieldId)
            }
        } else if (layer.textStyle?.transform === 'uppercase') {
            fieldIds.add(layer.fieldId)
        }
    }
    return fieldIds
}

/** Apply template casing to the stored entity values without mutating the caller's object. */
export function applyEntityTemplateTextTransforms<T extends BaseEntity & { lowerThirdTypeId?: string }>(
    entityType: TemplateEntityKind,
    entity: T,
    document?: ShowTemplateFieldConfig,
): T {
    const uppercaseFieldIds = getEntityUppercaseTextFieldIds(entityType, entity, document)
    if (!uppercaseFieldIds.size) return entity

    const next = { ...entity } as T
    let customFields = entity.customFields ? { ...entity.customFields } : undefined
    for (const fieldId of uppercaseFieldIds) {
        const value = (entity as Record<string, unknown>)[fieldId]
        if (typeof value === 'string') {
            ;(next as Record<string, unknown>)[fieldId] = value.toUpperCase()
            continue
        }
        const customValue = customFields?.[fieldId]
        if (typeof customValue === 'string' && customFields) customFields[fieldId] = customValue.toUpperCase()
    }
    if (customFields) next.customFields = customFields
    return next
}

/** Normalize every entity for the CSV working copy and export using its active template. */
export function applyTemplateTextTransformsToEntities(
    state: EntitiesState,
    document?: ShowTemplateFieldConfig,
): EntitiesState {
    if (!document) return state
    return {
        ...state,
        sections: state.sections.map((section) => ({
            ...section,
            rows: section.rows.map((row) => ({
                ...row,
                ...(row.title ? { title: applyEntityTemplateTextTransforms('titles', row.title, document) } : {}),
                ...(row.hotTitle ? { hotTitle: applyEntityTemplateTextTransforms('hotTitles', row.hotTitle, document) } : {}),
                ...(row.person ? { person: applyEntityTemplateTextTransforms(row.person.image?.trim() ? 'phoneCalls' : 'persons', row.person, document) } : {}),
                ...(row.location ? { location: applyEntityTemplateTextTransforms('locations', row.location, document) } : {}),
                ...(row.waitTitle ? { waitTitle: applyEntityTemplateTextTransforms('waitTitles', row.waitTitle, document) } : {}),
                ...(row.waitLocation ? { waitLocation: applyEntityTemplateTextTransforms('waitLocations', row.waitLocation, document) } : {}),
            })),
        })),
    }
}

const RESERVED_FIELDS: Record<TemplateEntityKind, string[]> = {
    titles: ['title', 'supratitle', 'nr', 'Titlu', 'Supratitlu', 'Nr', 'Template'],
    persons: ['name', 'occupation', 'image', 'Nume', 'Functie', 'Image', 'Sectiune', 'Template'],
    locations: ['location', 'Locatie', 'Template'],
    phoneCalls: ['name', 'occupation', 'image', 'Nume', 'Functie', 'Image', 'Template'],
    hotTitles: ['title', 'Titlu', 'Template'],
    waitTitles: ['title', 'Titlu', 'location', 'Locatie', 'Template'],
    waitLocations: ['location', 'Locatie', 'Template'],
}

function normalizeFieldId(fieldId: string) {
    return fieldId.trim().toLocaleLowerCase()
}

export function getEntityTemplateCustomValues(
    entityType: TemplateEntityKind,
    entity: BaseEntity & { lowerThirdTypeId?: string },
    document?: ShowTemplateFieldConfig,
): Record<string, string> {
    const template = resolveEntityActiveTemplate(entityType, entity, document)
    return getTemplateCustomFieldValues(entity.customFields, template, RESERVED_FIELDS[entityType])
}

export function getEntityTemplateCustomFieldIds(
    entityType: TemplateEntityKind,
    entities: Array<BaseEntity & { lowerThirdTypeId?: string }>,
    document?: ShowTemplateFieldConfig,
): string[] {
    const ids: string[] = []
    const seen = new Set<string>(RESERVED_FIELDS[entityType].map(normalizeFieldId))
    if (document) {
        const configuredTemplates = entityType === 'titles' || entityType === 'persons'
            ? [
                document.templates[entityType],
                ...Object.values(document.lowerThirdVariants?.[entityType] ?? {}),
            ]
            : [document.templates[entityType]]
        for (const template of configuredTemplates) {
            for (const id of getTemplateTextFieldIds(template)) {
                const normalizedId = normalizeFieldId(id)
                if (seen.has(normalizedId)) continue
                seen.add(normalizedId)
                ids.push(id)
            }
        }
    }
    for (const entity of entities) {
        const template = resolveEntityActiveTemplate(entityType, entity, document)
        for (const id of getTemplateTextFieldIds(template)) {
            const normalizedId = normalizeFieldId(id)
            if (seen.has(normalizedId)) continue
            seen.add(normalizedId)
            ids.push(id)
        }
    }
    return ids
}

import type { BroadcastTemplate } from '../../../shared/preview/templateContract'
import {
    DEFAULT_LOWER_THIRD_TYPES,
    type LowerThirdEntityKind,
} from '../../lower-thirds/domain/lowerThirdTypes'

export const TEMPLATE_DOCUMENT_VERSION = 2
export const TEMPLATE_DOCUMENT_SHOW = 'punctul-pe-azi'

export type TemplateDocumentTemplates = {
    titles: BroadcastTemplate
    persons: BroadcastTemplate
    locations: BroadcastTemplate
    phoneCalls: BroadcastTemplate
    hotTitles: BroadcastTemplate
    waitTitles: BroadcastTemplate
    waitLocations: BroadcastTemplate
}

export type LowerThirdTemplateVariants = Record<LowerThirdEntityKind, Record<string, BroadcastTemplate>>

export type TemplateDocument = {
    version: 2
    show: string
    templates: TemplateDocumentTemplates
    /** Editable layout variants keyed by lower-third category and shared type id. */
    lowerThirdVariants: LowerThirdTemplateVariants
    disabledEntityTypes?: (keyof TemplateDocumentTemplates)[]
}

type LegacyTemplateDocument = {
    version: 1
    show: string
    templates: TemplateDocumentTemplates
    disabledEntityTypes?: (keyof TemplateDocumentTemplates)[]
}

const templateKeys = ['titles', 'persons', 'locations', 'phoneCalls', 'hotTitles', 'waitTitles', 'waitLocations'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBroadcastTemplate(value: unknown): value is BroadcastTemplate {
    if (!isRecord(value)) return false
    if (typeof value.id !== 'string') return false
    if (typeof value.name !== 'string') return false
    if (!isRecord(value.canvas)) return false
    if (typeof value.canvas.width !== 'number') return false
    if (typeof value.canvas.height !== 'number') return false
    if (!isRecord(value.canvas.background)) return false
    if (!Array.isArray(value.layers)) return false

    return true
}

function cloneTemplate<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

function hasOnlyCurrentTemplateKeys(value: Record<string, unknown>) {
    const keys = Object.keys(value)

    return (
        keys.length === templateKeys.length
        && templateKeys.every((key) => keys.includes(key))
    )
}

function validDisabledEntityTypes(value: Record<string, unknown>) {
    if (value.disabledEntityTypes === undefined) return true
    if (!Array.isArray(value.disabledEntityTypes)) return false
    if (!value.disabledEntityTypes.every((key) => (
        typeof key === 'string' && templateKeys.includes(key as typeof templateKeys[number])
    ))) return false
    return new Set(value.disabledEntityTypes).size === value.disabledEntityTypes.length
}

function isTemplateMap(value: unknown): value is TemplateDocumentTemplates {
    return isRecord(value)
        && hasOnlyCurrentTemplateKeys(value)
        && templateKeys.every((key) => isBroadcastTemplate(value[key]))
}

function createLowerThirdVariants(templates: TemplateDocumentTemplates): LowerThirdTemplateVariants {
    const variants: LowerThirdTemplateVariants = { titles: {}, persons: {} }

    for (const kind of ['titles', 'persons'] as const) {
        for (const type of DEFAULT_LOWER_THIRD_TYPES) {
            const template = cloneTemplate(templates[kind])
            template.id = `${template.id}-${type.id}`
            template.name = type.templates[kind].name
            variants[kind][type.id] = template
        }
    }

    return variants
}

export function isTemplateDocument(value: unknown): value is TemplateDocument {
    if (!isRecord(value)) return false
    if (value.version !== TEMPLATE_DOCUMENT_VERSION) return false
    if (typeof value.show !== 'string' || value.show.trim().length === 0) return false
    if (!isTemplateMap(value.templates)) return false
    if (!validDisabledEntityTypes(value)) return false
    if (!isRecord(value.lowerThirdVariants)) return false

    const variants = value.lowerThirdVariants
    for (const kind of ['titles', 'persons'] as const) {
        if (!isRecord(variants[kind])) return false
        const categoryVariants = variants[kind]
        const requiredIds = ['ordinary']
        if (!requiredIds.every((id) => isBroadcastTemplate(categoryVariants[id]))) return false
        if (!Object.entries(categoryVariants).every(([id, template]) => (
            id.trim().length > 0 && isBroadcastTemplate(template)
        ))) return false
    }

    return Object.keys(variants).length === 2
}

export function isLegacyTemplateDocument(value: unknown): value is LegacyTemplateDocument {
    return isRecord(value)
        && value.version === 1
        && typeof value.show === 'string'
        && value.show.trim().length > 0
        && isTemplateMap(value.templates)
        && validDisabledEntityTypes(value)
}

/** Upgrade v1 documents by keeping their title/person designs as ordinary and seeding the other variants from them. */
export function migrateLegacyTemplateDocument(value: unknown): TemplateDocument | null {
    if (!isLegacyTemplateDocument(value)) return null
    const migrated = createTemplateDocumentFromTemplates(value.templates)
    migrated.show = value.show
    migrated.disabledEntityTypes = value.disabledEntityTypes ? [...value.disabledEntityTypes] : undefined
    return migrated
}

export function createTemplateDocumentFromTemplates(
    input: TemplateDocumentTemplates,
    show = TEMPLATE_DOCUMENT_SHOW,
): TemplateDocument {
    const templates = {
        titles: cloneTemplate(input.titles),
        persons: cloneTemplate(input.persons),
        locations: cloneTemplate(input.locations),
        phoneCalls: cloneTemplate(input.phoneCalls),
        hotTitles: cloneTemplate(input.hotTitles),
        waitTitles: cloneTemplate(input.waitTitles),
        waitLocations: cloneTemplate(input.waitLocations),
    }

    return {
        version: TEMPLATE_DOCUMENT_VERSION,
        show,
        templates,
        lowerThirdVariants: createLowerThirdVariants(templates),
    }
}

export function validateTemplateDocument(value: unknown): value is TemplateDocument {
    return isTemplateDocument(value)
}

export function resolveTemplateDocumentTemplates(
    value: unknown,
    fallbackTemplates: TemplateDocumentTemplates
): TemplateDocumentTemplates {
    return isTemplateDocument(value) ? value.templates : fallbackTemplates
}

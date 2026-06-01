import type { BroadcastTemplate } from '@/shared/preview/templateContract'

export const TEMPLATE_DOCUMENT_VERSION = 1
export const TEMPLATE_DOCUMENT_SHOW = 'obiectiv-comun'

export type TemplateDocumentTemplates = {
    titles: BroadcastTemplate
    persons: BroadcastTemplate
    locations: BroadcastTemplate
    phoneCalls: BroadcastTemplate
}

export type TemplateDocument = {
    version: 1
    show: 'obiectiv-comun'
    templates: TemplateDocumentTemplates
}

const templateKeys = ['titles', 'persons', 'locations', 'phoneCalls'] as const

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

export function isTemplateDocument(value: unknown): value is TemplateDocument {
    if (!isRecord(value)) return false
    if (value.version !== TEMPLATE_DOCUMENT_VERSION) return false
    if (value.show !== TEMPLATE_DOCUMENT_SHOW) return false
    if (!isRecord(value.templates)) return false
    const templates = value.templates
    if (!hasOnlyCurrentTemplateKeys(templates)) return false

    return templateKeys.every((key) => isBroadcastTemplate(templates[key]))
}

export function createTemplateDocumentFromTemplates(
    input: TemplateDocumentTemplates
): TemplateDocument {
    return {
        version: TEMPLATE_DOCUMENT_VERSION,
        show: TEMPLATE_DOCUMENT_SHOW,
        templates: {
            titles: cloneTemplate(input.titles),
            persons: cloneTemplate(input.persons),
            locations: cloneTemplate(input.locations),
            phoneCalls: cloneTemplate(input.phoneCalls),
        },
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

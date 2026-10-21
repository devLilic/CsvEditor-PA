import {
    DEFAULT_LOWER_THIRD_TYPES,
    type LowerThirdEntityKind,
    type LowerThirdTypeDefinition,
} from './lowerThirdTypes'

const ENTITY_KINDS: LowerThirdEntityKind[] = ['titles', 'persons']

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

export function validateLowerThirdTypes(value: unknown): value is LowerThirdTypeDefinition[] {
    if (!Array.isArray(value) || value.length === 0) return false
    const ids = new Set<string>()
    const templateNames: Record<LowerThirdEntityKind, Set<string>> = {
        titles: new Set(),
        persons: new Set(),
    }

    for (const item of value) {
        if (!isObject(item) || !nonEmptyString(item.id) || !nonEmptyString(item.name)) return false
        if (ids.has(item.id)) return false
        ids.add(item.id)

        if (!isObject(item.palette)) return false
        const { indicatorColor, backgroundColor, textColor, opacity } = item.palette
        if (!nonEmptyString(indicatorColor) || !nonEmptyString(backgroundColor) || !nonEmptyString(textColor)) return false
        if (typeof opacity !== 'number' || !Number.isFinite(opacity) || opacity < 0 || opacity > 1) return false
        if (!isObject(item.templates)) return false

        for (const kind of ENTITY_KINDS) {
            const template = item.templates[kind]
            if (!isObject(template) || !nonEmptyString(template.name)) return false
            if (templateNames[kind].has(template.name)) return false
            templateNames[kind].add(template.name)
        }
    }

    return true
}

/** Return a safe editable copy, falling back to defaults for malformed config. */
export function normalizeLowerThirdTypes(value: unknown): LowerThirdTypeDefinition[] {
    if (!validateLowerThirdTypes(value)) return DEFAULT_LOWER_THIRD_TYPES.map((item) => structuredClone(item))
    return value.map((item) => ({
        id: item.id.trim(),
        name: item.name.trim(),
        palette: {
            indicatorColor: item.palette.indicatorColor.trim(),
            backgroundColor: item.palette.backgroundColor.trim(),
            textColor: item.palette.textColor.trim(),
            opacity: item.palette.opacity,
        },
        templates: {
            titles: { name: item.templates.titles.name.trim() },
            persons: { name: item.templates.persons.name.trim() },
        },
    }))
}

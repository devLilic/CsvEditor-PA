export const ENTITY_TEMPLATE_NAMES_CONFIG_KEY = 'entityTemplateNames'

export type EntityTemplateNameKey = 'locations' | 'phones' | 'waitTitles' | 'waitLocations'

export interface EntityTemplateNames {
    locations: string
    phones: string
    waitTitles: string
    waitLocations: string
}

export const DEFAULT_ENTITY_TEMPLATE_NAMES: EntityTemplateNames = {
    locations: 'Location Bug',
    phones: 'Phone Call Lower Third',
    waitTitles: 'Wait Title',
    waitLocations: 'Wait Location',
}

export function normalizeEntityTemplateNames(value: unknown): EntityTemplateNames {
    const source = value && typeof value === 'object' ? value as Partial<Record<EntityTemplateNameKey, unknown>> : {}
    const normalize = (key: EntityTemplateNameKey) =>
        typeof source[key] === 'string' && source[key].trim()
            ? source[key].trim()
            : DEFAULT_ENTITY_TEMPLATE_NAMES[key]
    return {
        locations: normalize('locations'),
        phones: normalize('phones'),
        waitTitles: normalize('waitTitles'),
        waitLocations: normalize('waitLocations'),
    }
}

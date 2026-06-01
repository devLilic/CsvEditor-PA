export type DefaultProjectSettings = {
    title: string
    personName: string
    personOccupation: string
    location: string
}

export const FALLBACK_DEFAULT_PROJECT_SETTINGS: DefaultProjectSettings = {
    title: '',
    personName: 'NUME STANDARD',
    personOccupation: 'FUNCȚIE STANDARD',
    location: 'CHIȘINĂU',
}

export function isDefaultProjectSettings(value: unknown): value is DefaultProjectSettings {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false
    }

    const candidate = value as Record<keyof DefaultProjectSettings, unknown>

    return (
        typeof candidate.title === 'string' &&
        typeof candidate.personName === 'string' &&
        typeof candidate.personOccupation === 'string' &&
        typeof candidate.location === 'string'
    )
}

export function normalizeDefaultProjectSettings(value: unknown): DefaultProjectSettings {
    return isDefaultProjectSettings(value) ? value : FALLBACK_DEFAULT_PROJECT_SETTINGS
}

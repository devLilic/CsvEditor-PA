export type DefaultProjectSettings = {
    title: string
    personName: string
    personOccupation: string
    location: string
    hotTitle: string
}

export const FALLBACK_DEFAULT_PROJECT_SETTINGS: DefaultProjectSettings = {
    title: '',
    personName: 'NUME STANDARD',
    personOccupation: 'FUNCȚIE STANDARD',
    location: 'CHIȘINĂU',
    hotTitle: '',
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
        typeof candidate.location === 'string' &&
        typeof candidate.hotTitle === 'string'
    )
}

export function normalizeDefaultProjectSettings(value: unknown): DefaultProjectSettings {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return FALLBACK_DEFAULT_PROJECT_SETTINGS
    }

    const candidate = value as Partial<Record<keyof DefaultProjectSettings, unknown>>

    if (
        typeof candidate.title !== 'string' ||
        typeof candidate.personName !== 'string' ||
        typeof candidate.personOccupation !== 'string' ||
        typeof candidate.location !== 'string'
    ) {
        return FALLBACK_DEFAULT_PROJECT_SETTINGS
    }

    return {
        title: candidate.title,
        personName: candidate.personName,
        personOccupation: candidate.personOccupation,
        location: candidate.location,
        hotTitle: typeof candidate.hotTitle === 'string' ? candidate.hotTitle : '',
    }
}

import type { TedEntityType } from './tedTypes'

type TedSampleData = Record<string, string>

const TED_SAMPLE_DATA: Record<TedEntityType, TedSampleData> = {
    titles: {
        title: 'SAMPLE TITLE',
    },
    persons: {
        name: 'SAMPLE NAME',
        occupation: 'Sample occupation',
    },
    locations: {
        location: 'SAMPLE LOCATION',
    },
    phoneCalls: {
        name: 'SAMPLE NAME',
        occupation: 'Sample occupation',
        image: '',
    },
}

export function createTedSampleData(
    entityType: TedEntityType,
    manualInput: Partial<TedSampleData> = {}
): TedSampleData {
    return mergeTedSampleData(entityType, manualInput)
}

export function getDefaultTedSampleData(entityType: TedEntityType): Record<string, string> {
    return { ...TED_SAMPLE_DATA[entityType] }
}

export function mergeTedSampleData(
    entityType: TedEntityType,
    overrides: Partial<Record<string, string>> = {}
): Record<string, string> {
    const sampleData = getDefaultTedSampleData(entityType)
    const nextData = { ...sampleData }

    for (const [key, value] of Object.entries(overrides)) {
        if (typeof value === 'string' && value.trim()) {
            nextData[key] = value
        }
    }

    return nextData
}

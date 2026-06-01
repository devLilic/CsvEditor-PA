export type PhoneImageSettings = {
    workPath: string
    width: number
    height: number
}

export const FALLBACK_PHONE_IMAGE_SETTINGS: PhoneImageSettings = {
    workPath: '',
    width: 420,
    height: 540,
}

function positiveNumberOrFallback(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
        ? value
        : fallback
}

export function normalizePhoneImageSettings(value: unknown): PhoneImageSettings {
    const source =
        value && typeof value === 'object'
            ? value as Partial<Record<keyof PhoneImageSettings, unknown>>
            : {}

    return {
        workPath: typeof source.workPath === 'string'
            ? source.workPath
            : FALLBACK_PHONE_IMAGE_SETTINGS.workPath,
        width: positiveNumberOrFallback(
            source.width,
            FALLBACK_PHONE_IMAGE_SETTINGS.width
        ),
        height: positiveNumberOrFallback(
            source.height,
            FALLBACK_PHONE_IMAGE_SETTINGS.height
        ),
    }
}

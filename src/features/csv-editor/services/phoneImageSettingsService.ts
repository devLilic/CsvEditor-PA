import {
    FALLBACK_PHONE_IMAGE_SETTINGS,
    normalizePhoneImageSettings,
    type PhoneImageSettings,
} from '../domain/phoneImageSettings'

function getApi() {
    const api = (window as any)?.electronAPI
    if (!api) {
        throw new Error('electronAPI not available')
    }
    return api
}

export const phoneImageSettingsService = {
    async getPhoneImageSettings(): Promise<PhoneImageSettings> {
        try {
            const settings = await getApi().getPhoneImageSettings()
            return normalizePhoneImageSettings(settings)
        } catch {
            return FALLBACK_PHONE_IMAGE_SETTINGS
        }
    },

    async setPhoneImageSettings(settings: PhoneImageSettings): Promise<PhoneImageSettings> {
        try {
            const savedSettings = await getApi().setPhoneImageSettings(
                normalizePhoneImageSettings(settings)
            )
            return normalizePhoneImageSettings(savedSettings)
        } catch {
            return FALLBACK_PHONE_IMAGE_SETTINGS
        }
    },

    async selectWorkPath(): Promise<string | null> {
        try {
            const path = await getApi().selectWorkPath()
            return typeof path === 'string' ? path : null
        } catch {
            return null
        }
    },
}

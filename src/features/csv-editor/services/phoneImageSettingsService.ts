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
    async getPhoneImageSettings(projectId?: string): Promise<PhoneImageSettings> {
        try {
            const api = getApi()
            const settings = projectId ? await api.getPhoneImageSettings(projectId) : await api.getPhoneImageSettings()
            return normalizePhoneImageSettings(settings)
        } catch {
            return FALLBACK_PHONE_IMAGE_SETTINGS
        }
    },

    async setPhoneImageSettings(settings: PhoneImageSettings, projectId?: string): Promise<PhoneImageSettings> {
        try {
            const api = getApi()
            const normalized = normalizePhoneImageSettings(settings)
            const savedSettings = projectId
                ? await api.setPhoneImageSettings(normalized, projectId)
                : await api.setPhoneImageSettings(normalized)
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

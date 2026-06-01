import {
    FALLBACK_DEFAULT_PROJECT_SETTINGS,
    isDefaultProjectSettings,
    type DefaultProjectSettings,
} from '../domain/defaultProjectSettings'

function getApi() {
    const api = (window as any)?.electronAPI
    if (!api) {
        throw new Error('electronAPI not available')
    }
    return api
}

export const defaultProjectSettingsService = {
    async getDefaultProjectSettings(): Promise<DefaultProjectSettings> {
        try {
            const settings = await getApi().getDefaultProjectSettings()
            return isDefaultProjectSettings(settings) ? settings : FALLBACK_DEFAULT_PROJECT_SETTINGS
        } catch {
            return FALLBACK_DEFAULT_PROJECT_SETTINGS
        }
    },

    async setDefaultProjectSettings(settings: DefaultProjectSettings): Promise<DefaultProjectSettings> {
        if (!isDefaultProjectSettings(settings)) {
            return FALLBACK_DEFAULT_PROJECT_SETTINGS
        }

        try {
            const savedSettings = await getApi().setDefaultProjectSettings(settings)
            return isDefaultProjectSettings(savedSettings) ? savedSettings : FALLBACK_DEFAULT_PROJECT_SETTINGS
        } catch {
            return FALLBACK_DEFAULT_PROJECT_SETTINGS
        }
    },
}

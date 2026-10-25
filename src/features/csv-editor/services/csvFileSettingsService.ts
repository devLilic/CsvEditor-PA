import {
    FALLBACK_CSV_FILE_SETTINGS,
    normalizeCsvFileSettings,
    type CsvFileSettings,
} from '../domain/csvFileSettings'

type CsvFileSettingsListener = (settings: CsvFileSettings) => void
const csvFileSettingsListeners = new Set<CsvFileSettingsListener>()

function emitCsvFileSettings(settings: CsvFileSettings) {
    for (const listener of csvFileSettingsListeners) {
        try {
            listener(settings)
        } catch (error) {
            console.error('[csvFileSettingsService] listener error', error)
        }
    }
}

function getApi() {
    const api = (window as any)?.electronAPI

    if (!api) {
        throw new Error('electronAPI not available')
    }

    return api
}

export const csvFileSettingsService = {
    async getCsvFileSettings(showProjectId?: string): Promise<CsvFileSettings> {
        try {
            const api = getApi()
            const settings = showProjectId
                ? await api.getCsvFileSettings(showProjectId)
                : await api.getCsvFileSettings()
            return normalizeCsvFileSettings(settings)
        } catch {
            return FALLBACK_CSV_FILE_SETTINGS
        }
    },

    async setCsvFileSettings(settings: CsvFileSettings, showProjectId?: string): Promise<CsvFileSettings> {
        try {
            const api = getApi()
            const normalized = normalizeCsvFileSettings(settings)
            const savedSettings = showProjectId
                ? await api.setCsvFileSettings(normalized, showProjectId)
                : await api.setCsvFileSettings(normalized)
            const normalizedSettings = normalizeCsvFileSettings(savedSettings)
            emitCsvFileSettings(normalizedSettings)
            return normalizedSettings
        } catch {
            return FALLBACK_CSV_FILE_SETTINGS
        }
    },

    subscribeCsvFileSettings(listener: CsvFileSettingsListener): () => void {
        csvFileSettingsListeners.add(listener)
        return () => {
            csvFileSettingsListeners.delete(listener)
        }
    },

    async selectWorkingCsv(): Promise<string | null> {
        try {
            const selectedPath = await getApi().selectWorkingCsv()
            return typeof selectedPath === 'string' ? selectedPath : null
        } catch {
            return null
        }
    },

    async selectProjectFolder(): Promise<string | null> {
        try {
            const selectedPath = await getApi().selectProjectFolder()
            return typeof selectedPath === 'string' ? selectedPath : null
        } catch {
            return null
        }
    },

    async selectBackupFolder(): Promise<string | null> {
        try {
            const selectedPath = await getApi().selectBackupFolder()
            return typeof selectedPath === 'string' ? selectedPath : null
        } catch {
            return null
        }
    },

    async selectSavedProjectsFolder(): Promise<string | null> {
        try {
            const selectedPath = await getApi().selectSavedProjectsFolder()
            return typeof selectedPath === 'string' ? selectedPath : null
        } catch {
            return null
        }
    },

    async selectExportCsvFolder(): Promise<string | null> {
        try {
            const selectedPath = await getApi().selectExportCsvFolder()
            return typeof selectedPath === 'string' ? selectedPath : null
        } catch {
            return null
        }
    },
}

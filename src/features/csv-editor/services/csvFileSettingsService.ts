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
    async getCsvFileSettings(): Promise<CsvFileSettings> {
        try {
            const settings = await getApi().getCsvFileSettings()
            return normalizeCsvFileSettings(settings)
        } catch {
            return FALLBACK_CSV_FILE_SETTINGS
        }
    },

    async setCsvFileSettings(settings: CsvFileSettings): Promise<CsvFileSettings> {
        try {
            const savedSettings = await getApi().setCsvFileSettings(normalizeCsvFileSettings(settings))
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

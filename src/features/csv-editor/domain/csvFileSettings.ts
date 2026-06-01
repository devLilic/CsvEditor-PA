export type CsvFileSettings = {
    workingCsvPath: string
    backupFolderPath: string
    savedProjectsFolderPath: string
    exportCsvFolderPath: string
}

export const FALLBACK_CSV_FILE_SETTINGS: CsvFileSettings = {
    workingCsvPath: '',
    backupFolderPath: '',
    savedProjectsFolderPath: '',
    exportCsvFolderPath: '',
}

export function normalizeCsvFileSettings(value: unknown): CsvFileSettings {
    const source =
        value && typeof value === 'object'
            ? value as Partial<Record<keyof CsvFileSettings, unknown>>
            : {}

    return {
        workingCsvPath: typeof source.workingCsvPath === 'string'
            ? source.workingCsvPath
            : FALLBACK_CSV_FILE_SETTINGS.workingCsvPath,
        backupFolderPath: typeof source.backupFolderPath === 'string'
            ? source.backupFolderPath
            : FALLBACK_CSV_FILE_SETTINGS.backupFolderPath,
        savedProjectsFolderPath: typeof source.savedProjectsFolderPath === 'string'
            ? source.savedProjectsFolderPath
            : FALLBACK_CSV_FILE_SETTINGS.savedProjectsFolderPath,
        exportCsvFolderPath: typeof source.exportCsvFolderPath === 'string'
            ? source.exportCsvFolderPath
            : FALLBACK_CSV_FILE_SETTINGS.exportCsvFolderPath,
    }
}

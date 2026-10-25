export type CsvFileSettings = {
    /** Root folder for the active project; standard subfolders are created below it. */
    projectFolderPath: string
    /** Prefix applied to CSV filenames and exported graphics template names. */
    exportPrefix: string
    /** Legacy compatibility fields, retained for migration of older settings. */
    workingCsvPath: string
    backupFolderPath: string
    savedProjectsFolderPath: string
    exportCsvFolderPath: string
}

export const FALLBACK_CSV_FILE_SETTINGS: CsvFileSettings = {
    projectFolderPath: '',
    exportPrefix: '',
    workingCsvPath: '',
    backupFolderPath: '',
    savedProjectsFolderPath: '',
    exportCsvFolderPath: '',
}

function childFolder(root: string, name: string): string {
    if (!root) return ''
    const separator = root.includes('\\') ? '\\' : '/'
    const trimmedRoot = root.replace(/[\\/]+$/, '')
    return `${trimmedRoot || separator}${trimmedRoot ? separator : ''}${name}`
}

export function normalizeCsvFileSettings(value: unknown): CsvFileSettings {
    const source =
        value && typeof value === 'object'
            ? value as Partial<Record<keyof CsvFileSettings, unknown>>
            : {}

    const workingCsvPath = typeof source.workingCsvPath === 'string'
        ? source.workingCsvPath
        : FALLBACK_CSV_FILE_SETTINGS.workingCsvPath
    const legacyRoot = workingCsvPath
        ? workingCsvPath.replace(/[\\/][^\\/]+$/, '')
        : ''
    const projectFolderPath = typeof source.projectFolderPath === 'string'
        ? source.projectFolderPath.trim()
        : legacyRoot

    return {
        projectFolderPath,
        exportPrefix: typeof source.exportPrefix === 'string'
            ? source.exportPrefix.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim()
            : FALLBACK_CSV_FILE_SETTINGS.exportPrefix,
        workingCsvPath,
        backupFolderPath: typeof source.backupFolderPath === 'string'
            ? (projectFolderPath ? childFolder(projectFolderPath, 'Backup') : source.backupFolderPath)
            : FALLBACK_CSV_FILE_SETTINGS.backupFolderPath,
        savedProjectsFolderPath: typeof source.savedProjectsFolderPath === 'string'
            ? (projectFolderPath ? childFolder(projectFolderPath, 'Saved') : source.savedProjectsFolderPath)
            : FALLBACK_CSV_FILE_SETTINGS.savedProjectsFolderPath,
        exportCsvFolderPath: typeof source.exportCsvFolderPath === 'string'
            ? (projectFolderPath ? childFolder(projectFolderPath, 'Export') : source.exportCsvFolderPath)
            : FALLBACK_CSV_FILE_SETTINGS.exportCsvFolderPath,
    }
}

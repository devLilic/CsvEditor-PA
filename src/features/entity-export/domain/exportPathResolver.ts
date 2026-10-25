export const ENTITY_EXPORT_FILENAMES = {
    titles: 'titles.csv',
    persons: 'persons.csv',
    locations: 'locations.csv',
    phones: 'phones.csv',
    waitTitlesLocations: 'wait_titles_locations.csv',
    quickTitles: 'quickTitles.csv',
} as const

export interface ResolveEntityExportPathInput {
    workingCsvPath?: string
    projectFolderPath?: string | null
    exportFolderPath?: string | null
    exportPrefix?: string | null
}

export interface EntityExportPaths {
    titlesPath: string
    personsPath: string
    locationsPath: string
    phonesPath: string
    waitTitlesLocationsPath: string
}

function trimTrailingSeparators(folderPath: string): string {
    return folderPath.replace(/[\\/]+$/, '')
}

function normalizeWindowsSeparators(filePath: string): string {
    return filePath.replace(/\//g, '\\')
}

function dirname(filePath: string): string {
    const normalizedPath = trimTrailingSeparators(normalizeWindowsSeparators(filePath))
    const separatorIndex = Math.max(
        normalizedPath.lastIndexOf('\\'),
        normalizedPath.lastIndexOf('/')
    )

    if (separatorIndex < 0) {
        return ''
    }

    if (separatorIndex === 0) {
        return normalizedPath.slice(0, 1)
    }

    return normalizedPath.slice(0, separatorIndex)
}

function joinPath(folderPath: string, filename: string): string {
    const cleanFolder = trimTrailingSeparators(normalizeWindowsSeparators(folderPath))

    if (!cleanFolder) {
        return filename
    }

    return `${cleanFolder}\\${filename}`
}

export function resolveEntityExportFolder(input: ResolveEntityExportPathInput): string {
    const configuredFolder = input.exportFolderPath?.trim()

    if (configuredFolder) {
        return configuredFolder
    }

    const projectFolder = input.projectFolderPath?.trim()
    if (projectFolder) return joinPath(projectFolder, 'Export')

    return joinPath(dirname(input.workingCsvPath ?? ''), 'Export')
}

export function resolveEntityExportPaths(input: ResolveEntityExportPathInput): EntityExportPaths {
    const exportFolder = resolveEntityExportFolder(input)
    const prefix = (input.exportPrefix ?? '').trim().replace(/[\\/:*?"<>|]/g, '')
    const filename = (value: string) => `${prefix}${value}`

    return {
        titlesPath: joinPath(exportFolder, filename(ENTITY_EXPORT_FILENAMES.titles)),
        personsPath: joinPath(exportFolder, filename(ENTITY_EXPORT_FILENAMES.persons)),
        locationsPath: joinPath(exportFolder, filename(ENTITY_EXPORT_FILENAMES.locations)),
        phonesPath: joinPath(exportFolder, filename(ENTITY_EXPORT_FILENAMES.phones)),
        waitTitlesLocationsPath: joinPath(exportFolder, filename(ENTITY_EXPORT_FILENAMES.waitTitlesLocations)),
    }
}

export function resolveQuickTitlesCsvPath(input: ResolveEntityExportPathInput): string {
    const prefix = (input.exportPrefix ?? '').trim().replace(/[\\/:*?"<>|]/g, '')
    return joinPath(resolveEntityExportFolder(input), `${prefix}${ENTITY_EXPORT_FILENAMES.quickTitles}`)
}

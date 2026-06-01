export const ENTITY_EXPORT_FILENAMES = {
    titles: 'OC_titles.csv',
    persons: 'OC_persons.csv',
    locations: 'OC_locations.csv',
    phones: 'OC_phones.csv',
} as const

export interface ResolveEntityExportPathInput {
    workingCsvPath: string
    exportFolderPath?: string | null
}

export interface EntityExportPaths {
    titlesPath: string
    personsPath: string
    locationsPath: string
    phonesPath: string
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

    return joinPath(dirname(input.workingCsvPath), 'Export')
}

export function resolveEntityExportPaths(input: ResolveEntityExportPathInput): EntityExportPaths {
    const exportFolder = resolveEntityExportFolder(input)

    return {
        titlesPath: joinPath(exportFolder, ENTITY_EXPORT_FILENAMES.titles),
        personsPath: joinPath(exportFolder, ENTITY_EXPORT_FILENAMES.persons),
        locationsPath: joinPath(exportFolder, ENTITY_EXPORT_FILENAMES.locations),
        phonesPath: joinPath(exportFolder, ENTITY_EXPORT_FILENAMES.phones),
    }
}

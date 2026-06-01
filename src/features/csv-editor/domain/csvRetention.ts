export const MAX_BACKUP_CSV_FILES = 10

export type CsvFileInfo = {
    filename: string
    fullPath: string
    mtimeMs: number
}

export function getBackupFilesToDelete(input: {
    files: CsvFileInfo[]
    maxFiles: number
}): CsvFileInfo[] {
    const csvFilesByOldestFirst = input.files
        .filter((file) => file.filename.toLowerCase().endsWith('.csv'))
        .sort((a, b) => a.mtimeMs - b.mtimeMs)

    if (input.maxFiles <= 0) {
        return csvFilesByOldestFirst
    }

    const deleteCount = csvFilesByOldestFirst.length - input.maxFiles

    if (deleteCount <= 0) {
        return []
    }

    return csvFilesByOldestFirst.slice(0, deleteCount)
}

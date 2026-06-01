export function createCsvBackupFilename(input: {
    workingCsvPath: string
    now: Date
}): string {
    const timestamp = formatTimestamp(input.now)
    const originalName = getFilenameWithoutExtension(input.workingCsvPath)
    const safeName = sanitizeFilenamePart(originalName || 'backup')

    return `${safeName}_${timestamp}.csv`
}

function formatTimestamp(date: Date): string {
    const year = date.getFullYear()
    const month = pad2(date.getMonth() + 1)
    const day = pad2(date.getDate())
    const hours = pad2(date.getHours())
    const minutes = pad2(date.getMinutes())
    const seconds = pad2(date.getSeconds())

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
}

function pad2(value: number): string {
    return String(value).padStart(2, '0')
}

function getFilenameWithoutExtension(filePath: string): string {
    const filename = filePath.trim().split(/[\\/]/).pop() ?? ''
    const extensionStart = filename.lastIndexOf('.')

    return extensionStart > 0
        ? filename.slice(0, extensionStart)
        : filename
}

function sanitizeFilenamePart(value: string): string {
    return value.replace(/[<>:"/\\|?*]/g, '_')
}

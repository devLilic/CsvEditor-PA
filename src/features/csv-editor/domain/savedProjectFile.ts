const FALLBACK_SAVED_PROJECT_FILENAME = 'proiect_salvat'

export function sanitizeSavedProjectName(input: string): string {
    return input
        .trim()
        .replace(/\.csv$/i, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
}

export function ensureCsvExtension(filename: string): string {
    return filename.toLowerCase().endsWith('.csv')
        ? filename
        : `${filename}.csv`
}

export function createSavedProjectFilename(input: string): string {
    const sanitized = sanitizeSavedProjectName(input)
    return ensureCsvExtension(sanitized || FALLBACK_SAVED_PROJECT_FILENAME)
}

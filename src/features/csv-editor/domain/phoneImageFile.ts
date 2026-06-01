const JPG_EXTENSION_PATTERN = /\.[^.\\/]+$/
const PROBLEMATIC_CHARS_PATTERN = /[^a-z0-9._-]+/g

export function ensureJpgExtension(filename: string): string {
    const trimmed = filename.trim()
    const withoutExtension = trimmed.replace(JPG_EXTENSION_PATTERN, '')
    return `${withoutExtension}.jpg`
}

export function sanitizeJpegFilename(input: string): string {
    const normalized = input
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase()
        .trim()
        .replace(JPG_EXTENSION_PATTERN, '')
        .replace(PROBLEMATIC_CHARS_PATTERN, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')

    return ensureJpgExtension(normalized || 'image')
}

export function buildSuggestedPhoneImageFilename(name: string): string {
    return sanitizeJpegFilename(name.trim() || 'phone_call')
}


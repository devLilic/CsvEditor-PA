const WORK_PATH_PREFIX = 'WORK_PATH/'
const IMAGE_FILENAME_PATTERN = /\.(jpe?g|png|webp)$/i
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[a-z]:[\\/]/i

function pathToFileSrc(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/')
    const withLeadingSlash = normalized.startsWith('/')
        ? normalized
        : `/${normalized}`

    return `file://${encodeURI(withLeadingSlash)}`
}

function joinWorkPath(workPath: string, filename: string): string {
    const cleanWorkPath = workPath.replace(/[\\/]+$/, '')
    const cleanFilename = filename.replace(/^[\\/]+/, '')
    const separator = cleanWorkPath.includes('\\') ? '\\' : '/'

    return `${cleanWorkPath}${separator}${cleanFilename}`
}

export function isWorkPathImageRef(value: string): boolean {
    return value.startsWith(WORK_PATH_PREFIX)
}

export function isAbsolutePhoneImagePath(value: string): boolean {
    const trimmed = value.trim()
    if (!trimmed) return false
    return (
        WINDOWS_ABSOLUTE_PATH_PATTERN.test(trimmed) ||
        trimmed.startsWith('\\\\')
    ) && IMAGE_FILENAME_PATTERN.test(trimmed)
}

export function isBarePhoneImageFilename(value: string): boolean {
    const trimmed = value.trim()
    if (!trimmed) return false
    if (isWorkPathImageRef(trimmed)) return false
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false
    if (trimmed.startsWith('/') || trimmed.startsWith('\\')) return false
    return IMAGE_FILENAME_PATTERN.test(trimmed)
}

export function isWorkPathResolvableImageRef(value: string): boolean {
    return isWorkPathImageRef(value) || isBarePhoneImageFilename(value) || isAbsolutePhoneImagePath(value)
}

export function getFilenameFromWorkPathRef(value: string): string {
    if (!isWorkPathImageRef(value)) {
        return ''
    }

    return value.slice(WORK_PATH_PREFIX.length)
}

export function getPhoneImageDisplayFilename(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (isWorkPathImageRef(trimmed)) return getFilenameFromWorkPathRef(trimmed)

    const normalized = trimmed.replace(/\\/g, '/')
    return normalized.split('/').filter(Boolean).pop() ?? trimmed
}

export function resolveWorkPathImageCsvValue(value: string, workPath: string): string {
    if (!isWorkPathImageRef(value)) {
        return value
    }

    const filename = getFilenameFromWorkPathRef(value)
    if (!filename.trim() || !workPath.trim()) {
        return value
    }

    return joinWorkPath(workPath, filename)
}

export function resolveWorkPathImageRef(value: string, workPath: string): string {
    if (!isWorkPathResolvableImageRef(value)) {
        return value
    }

    if (isAbsolutePhoneImagePath(value)) {
        return pathToFileSrc(value)
    }

    if (!workPath.trim()) {
        return ''
    }

    const filename = isWorkPathImageRef(value)
        ? getFilenameFromWorkPathRef(value)
        : value.trim()
    if (!filename.trim()) {
        return ''
    }

    return pathToFileSrc(joinWorkPath(workPath, filename))
}

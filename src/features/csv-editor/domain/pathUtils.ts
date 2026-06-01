export function getFilenameFromPath(path: string): string {
    if (typeof path !== 'string') {
        return ''
    }

    return path.trim().split(/[\\/]/).pop() || ''
}

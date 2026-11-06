const ASSET_REFERENCE_PATTERN = /^asset:([0-9a-f-]{36})$/i

export function collectTemplateAssetIds(document: unknown): string[] {
    const ids = new Set<string>()

    const visit = (value: unknown): void => {
        if (typeof value === 'string') {
            const match = value.trim().match(ASSET_REFERENCE_PATTERN)
            if (match) ids.add(match[1].toLowerCase())
            return
        }
        if (Array.isArray(value)) {
            value.forEach(visit)
            return
        }
        if (value && typeof value === 'object') Object.values(value).forEach(visit)
    }

    visit(document)
    return [...ids]
}

export function rewriteTemplateAssetReferences<T>(document: T, assetPaths: ReadonlyMap<string, string>): T {
    const rewrite = (value: unknown): unknown => {
        if (typeof value === 'string') {
            const match = value.trim().match(ASSET_REFERENCE_PATTERN)
            return match ? assetPaths.get(match[1].toLowerCase()) ?? value : value
        }
        if (Array.isArray(value)) return value.map(rewrite)
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, rewrite(nested)]))
        }
        return value
    }

    return rewrite(document) as T
}

export function normalizeQuickTitle(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) {
        return ''
    }

    const withoutTrailingColon = trimmed.replace(/:\s*$/, '').trimEnd()
    return withoutTrailingColon ? `${withoutTrailingColon}: ` : ''
}

export function normalizeAndDeduplicateQuickTitles(values: string[]): string[] {
    const seen = new Set<string>()
    const result: string[] = []

    for (const value of values) {
        const normalized = normalizeQuickTitle(value)
        if (!normalized || seen.has(normalized)) {
            continue
        }

        seen.add(normalized)
        result.push(normalized)
    }

    return result
}

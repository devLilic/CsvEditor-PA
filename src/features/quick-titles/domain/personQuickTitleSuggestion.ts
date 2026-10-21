function getNameSegments(personName: string): string[] {
    return personName.trim().split(/\s+/).filter(Boolean)
}

export function getLastNameSegment(personName: string): string {
    const segments = getNameSegments(personName)
    return segments[segments.length - 1] ?? ''
}

export function getFirstNameInitial(personName: string): string {
    return getNameSegments(personName)[0]?.charAt(0) ?? ''
}

export function buildPersonQuickTitleSuggestion(input: {
    personName: string
    existingQuickTitles: string[]
}): string {
    void input.existingQuickTitles
    return input.personName.trim().replace(/\s+/g, ' ')
}

import { normalizeQuickTitle } from './quickTitle'

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
    const lastName = getLastNameSegment(input.personName)
    if (!lastName) {
        return ''
    }

    const normalizedLastName = normalizeQuickTitle(lastName)
    const lastNameExists = input.existingQuickTitles.some(
        (quickTitle) => normalizeQuickTitle(quickTitle) === normalizedLastName
    )

    if (!lastNameExists) {
        return lastName
    }

    const firstNameInitial = getFirstNameInitial(input.personName)
    return firstNameInitial ? `${firstNameInitial}. ${lastName}` : lastName
}

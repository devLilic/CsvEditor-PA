// src/features/csv-editor/domain/csv.schema.ts
export const CSV_SECTION_MARKERS = {
    INVITED: '--- INVITATI ---',
} as const

export const BETA_MARKER_REGEX =
    /^---\s*beta\s*(\d+)\s*-\s*(.*?)\s*---$/i

export function isInvitedMarker(titleCell: string): boolean {
    return titleCell.trim().toUpperCase() === CSV_SECTION_MARKERS.INVITED
}

export function parseBetaMarker(titleCell: string): { betaIndex: number; betaTitle: string } | null {
    const m = titleCell.trim().match(BETA_MARKER_REGEX)
    if (!m) return null
    const betaIndex = Number(m[1])
    const betaTitle = (m[2] ?? '').trim()
    if (!Number.isFinite(betaIndex)) return null
    return { betaIndex, betaTitle }
}

export function buildBetaMarker(betaIndex: number, betaTitle: string): string {
    return `--- beta ${betaIndex} - ${betaTitle} ---`
}
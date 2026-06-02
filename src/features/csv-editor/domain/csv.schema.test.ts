import { describe, expect, it } from 'vitest'
import {
    BETA_MARKER_REGEX,
    CSV_SECTION_MARKERS,
    buildBetaMarker,
    isInvitedMarker,
    parseBetaMarker,
} from './csv.schema'

describe('PA CSV section markers', () => {
    it('defines the common INVITATI marker', () => {
        expect(CSV_SECTION_MARKERS).toEqual({
            INVITED: '--- INVITATI ---',
        })
        expect(isInvitedMarker('--- INVITATI ---')).toBe(true)
    })

    it('parses a beta marker with index and title', () => {
        expect(parseBetaMarker('--- beta 1 - Consiliu UE ---')).toEqual({
            betaIndex: 1,
            betaTitle: 'Consiliu UE',
        })
    })

    it('parses beta markers case-insensitively', () => {
        expect(parseBetaMarker('--- BETA 3 - Externe ---')).toEqual({
            betaIndex: 3,
            betaTitle: 'Externe',
        })
    })

    it('rejects invalid or simplified beta markers', () => {
        expect(parseBetaMarker('--BETA 1--')).toBeNull()
        expect(parseBetaMarker('beta 1 - Consiliu UE')).toBeNull()
        expect(BETA_MARKER_REGEX.test('--BETA 1--')).toBe(false)
    })

    it('builds the common beta marker format exactly', () => {
        expect(buildBetaMarker(2, 'Titlu')).toBe('--- beta 2 - Titlu ---')
    })
})

import { describe, expect, it } from 'vitest'
import { normalizeQuickTitle } from './QuickTitlesBar'

describe('normalizeQuickTitle', () => {
    it('adds a trailing colon when the operator omitted it', () => {
        expect(normalizeQuickTitle('BREAKING')).toBe('BREAKING: ')
    })

    it('keeps an existing trailing colon and trims surrounding spaces', () => {
        expect(normalizeQuickTitle('  BREAKING:  ')).toBe('BREAKING: ')
    })

    it('does not create an empty quick title', () => {
        expect(normalizeQuickTitle('   ')).toBe('')
    })
})

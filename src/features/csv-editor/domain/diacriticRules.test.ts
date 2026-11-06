import { describe, expect, it } from 'vitest'
import { applyDiacriticRules, getDiacriticRules } from './diacriticRules'

describe('diacritic conversion rules', () => {
    it('uses the legacy Romanian comma to cedilla rule only when unset', () => {
        expect(getDiacriticRules(undefined)).toEqual([{ from: 'Ț', to: 'Ţ' }])
        expect(getDiacriticRules({ diacriticConversionRules: [] })).toEqual([])
    })

    it('filters malformed and duplicate source rules while preserving order', () => {
        expect(getDiacriticRules({ diacriticConversionRules: [
            { from: 'Ț', to: 'Ţ' }, { from: 'Ț', to: 't' }, { from: 'ab', to: 'x' }, { from: 'ș', to: 'ş' },
        ] })).toEqual([{ from: 'Ț', to: 'Ţ' }, { from: 'ș', to: 'ş' }])
    })

    it('applies mappings simultaneously without cascading', () => {
        expect(applyDiacriticRules('ȚţX', [{ from: 'Ț', to: 'Ţ' }, { from: 'Ţ', to: 'X' }])).toBe('ŢţX')
        expect(applyDiacriticRules('𝟘Ț', [{ from: '𝟘', to: '0' }, { from: 'Ț', to: 'Ţ' }])).toBe('0Ţ')
    })
})

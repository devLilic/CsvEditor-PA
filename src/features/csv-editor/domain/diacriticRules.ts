import type { AppConfig } from '@/shared/ipc-types'

export type DiacriticRule = { from: string; to: string }

export const DIACRITIC_RULES_CONFIG_KEY = 'diacriticConversionRules' as const
export const DEFAULT_DIACRITIC_RULES: DiacriticRule[] = [{ from: 'Ț', to: 'Ţ' }]

export function isSingleUnicodeCharacter(value: unknown): value is string {
    return typeof value === 'string' && Array.from(value).length === 1
}

export function getDiacriticRules(config: AppConfig | null | undefined): DiacriticRule[] {
    const value = config?.[DIACRITIC_RULES_CONFIG_KEY]
    if (!Array.isArray(value)) return DEFAULT_DIACRITIC_RULES.map((rule) => ({ ...rule }))
    const rules: DiacriticRule[] = []
    const seen = new Set<string>()
    for (const item of value) {
        if (!item || typeof item !== 'object') continue
        const { from, to } = item as Record<string, unknown>
        if (!isSingleUnicodeCharacter(from) || !isSingleUnicodeCharacter(to) || seen.has(from)) continue
        seen.add(from)
        rules.push({ from, to })
    }
    return rules
}

/** Replaces each input code point once; replacement values are never processed again. */
export function applyDiacriticRules(text: string, rules: readonly DiacriticRule[]): string {
    const replacements = new Map<string, string>()
    for (const rule of rules) {
        if (isSingleUnicodeCharacter(rule.from) && isSingleUnicodeCharacter(rule.to) && !replacements.has(rule.from)) {
            replacements.set(rule.from, rule.to)
        }
    }
    return Array.from(text, (character) => replacements.get(character) ?? character).join('')
}

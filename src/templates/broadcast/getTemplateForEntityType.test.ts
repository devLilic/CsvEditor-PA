import { describe, expect, it } from 'vitest'
import { getTemplateForEntityType } from './getTemplateForEntityType'
import { broadcastTemplates } from './templates'
import { titleTemplate } from './titleTemplate'
import { personTemplate } from './personTemplate'
import { locationTemplate } from './locationTemplate'
import { phoneCallTemplate } from './phoneCallTemplate'

describe('getTemplateForEntityType', () => {
    const registry = broadcastTemplates as Record<string, unknown>

    it('maps titles to titleTemplate', () => {
        expect(getTemplateForEntityType('titles')).toBe(titleTemplate)
    })

    it('maps persons to personTemplate', () => {
        expect(getTemplateForEntityType('persons')).toBe(personTemplate)
    })

    it('maps locations to locationTemplate', () => {
        expect(getTemplateForEntityType('locations')).toBe(locationTemplate)
    })

    it('maps phoneCalls to phoneCallTemplate', () => {
        expect(getTemplateForEntityType('phoneCalls')).toBe(phoneCallTemplate)
    })

    it('does not expose dedicated hot or wait templates', () => {
        expect(registry.hotTitles).toBeUndefined()
        expect(registry.waitTitles).toBeUndefined()
        expect(registry.waitLocations).toBeUndefined()
        expect(getTemplateForEntityType('hotTitles')).toBe(broadcastTemplates.titles)
        expect(getTemplateForEntityType('waitTitles')).toBe(broadcastTemplates.titles)
        expect(getTemplateForEntityType('waitLocations')).toBe(broadcastTemplates.titles)
    })

    it('uses titleTemplate as the explicit fallback for unknown entity types', () => {
        expect(getTemplateForEntityType('unknown')).toBe(broadcastTemplates.titles)
    })
})

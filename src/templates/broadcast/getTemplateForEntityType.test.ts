import { describe, expect, it } from 'vitest'
import { getTemplateForEntityType } from './getTemplateForEntityType'
import { broadcastTemplates } from './templates'
import { titleTemplate } from './titleTemplate'
import { personTemplate } from './personTemplate'
import { locationTemplate } from './locationTemplate'
import { phoneCallTemplate } from './phoneCallTemplate'
import { hotTitleTemplate } from './hotTitleTemplate'
import { waitTitleTemplate } from './waitTitleTemplate'
import { waitLocationTemplate } from './waitLocationTemplate'

describe('getTemplateForEntityType', () => {
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

    it('maps PA hot and wait types to dedicated templates', () => {
        expect(getTemplateForEntityType('hotTitles')).toBe(hotTitleTemplate)
        expect(getTemplateForEntityType('waitTitles')).toBe(waitTitleTemplate)
        expect(getTemplateForEntityType('waitLocations')).toBe(waitLocationTemplate)
    })

    it('uses titleTemplate as the explicit fallback for unknown entity types', () => {
        expect(getTemplateForEntityType('unknown')).toBe(broadcastTemplates.titles)
    })
})

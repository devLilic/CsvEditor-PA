import { describe, expect, it } from 'vitest'
import { supportedBroadcastEntityTypes } from './supportedEntityTypes'

describe('supportedBroadcastEntityTypes', () => {
    it('contains only the entity types supported in the current version', () => {
        expect(supportedBroadcastEntityTypes).toContain('titles')
        expect(supportedBroadcastEntityTypes).toContain('persons')
        expect(supportedBroadcastEntityTypes).toContain('locations')

        expect(supportedBroadcastEntityTypes).not.toContain('hotTitles')
        expect(supportedBroadcastEntityTypes).not.toContain('waitTitles')
        expect(supportedBroadcastEntityTypes).not.toContain('waitLocations')
    })
})

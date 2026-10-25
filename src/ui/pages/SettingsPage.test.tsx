import { describe, expect, it } from 'vitest'
import { SettingsPage } from './SettingsPage'
import { ShowProjectsPage } from './ShowProjectsPage'

describe('Legacy settings entry point', () => {
    it('aliases the consolidated show administration page', () => {
        expect(SettingsPage).toBe(ShowProjectsPage)
    })
})

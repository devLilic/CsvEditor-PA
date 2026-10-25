import { describe, expect, it } from 'vitest'
import {
    createConfigWithShowProjectSelectorEnabled,
    DEFAULT_SHOW_PROJECT_SELECTOR_ENABLED,
    getShowProjectSelectorEnabled,
} from './showProjectSelectorSetting'

describe('show project selector setting', () => {
    it('defaults to visible for existing installations', () => {
        expect(getShowProjectSelectorEnabled(undefined)).toBe(DEFAULT_SHOW_PROJECT_SELECTOR_ENABLED)
        expect(getShowProjectSelectorEnabled({})).toBe(true)
    })

    it('reads the persisted visibility preference', () => {
        expect(getShowProjectSelectorEnabled({ showProjectSelectorEnabled: false })).toBe(false)
    })

    it('updates only this preference and preserves the other app config', () => {
        expect(createConfigWithShowProjectSelectorEnabled({ theme: 'dark' }, false)).toEqual({
            theme: 'dark',
            showProjectSelectorEnabled: false,
        })
    })
})

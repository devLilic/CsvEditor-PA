// src/features/csv-editor/services/settingsService.test.ts
import { describe, it, expect, vi } from 'vitest'
import { settingsService } from './settingsService'

describe('settingsService', () => {
    it('getQuickTitles returns empty array when IPC returns empty', async () => {
        const api = (window as any).electronAPI
        api.getQuickTitles.mockResolvedValueOnce([])

        const result = await settingsService.getQuickTitles()

        expect(result).toEqual([])
        expect(api.getQuickTitles).toHaveBeenCalledOnce()
    })

    it('getQuickTitles NEVER throws even if IPC misbehaves', async () => {
        const api = (window as any).electronAPI
        api.getQuickTitles.mockRejectedValueOnce(new Error('store corrupted'))

        const result = await settingsService.getQuickTitles()

        expect(result).toEqual([])
    })

    it('setQuickTitles does not throw on valid input', async () => {
        const api = (window as any).electronAPI
        api.setQuickTitles.mockResolvedValueOnce(undefined)

        await expect(
            settingsService.setQuickTitles(['Title 1', 'Title 2'])
        ).resolves.not.toThrow()

        expect(api.setQuickTitles).toHaveBeenCalledOnce()
    })

    it('passes an explicit show ID through Quick Titles settings calls and scoped notifications', async () => {
        const api = (window as any).electronAPI
        api.setQuickTitles.mockResolvedValueOnce(['Scoped title'])
        const listener = vi.fn()
        const unsubscribe = settingsService.subscribeQuickTitles(listener)

        await settingsService.setQuickTitles(['Scoped title'], 'show-a')

        expect(api.setQuickTitles).toHaveBeenCalledWith(['Scoped title'], 'show-a')
        expect(listener).toHaveBeenCalledWith(['Scoped title'], 'show-a')
        unsubscribe()
    })

    it('getAppConfig returns empty object on IPC failure', async () => {
        const api = (window as any).electronAPI
        api.getAppConfig.mockRejectedValueOnce(new Error('fs error'))

        const result = await settingsService.getConfig()

        expect(result).toEqual({})
    })

    it('setAppConfig returns saved config when IPC succeeds', async () => {
        const api = (window as any).electronAPI
        const cfg = { theme: 'dark', autosave: true }

        api.setAppConfig.mockResolvedValueOnce(cfg)

        const result = await settingsService.setConfig(cfg)

        expect(result).toEqual(cfg)
        expect(api.setAppConfig).toHaveBeenCalledOnce()
    })

    it('setAppConfig returns empty object on IPC failure', async () => {
        const api = (window as any).electronAPI
        api.setAppConfig.mockRejectedValueOnce(new Error('write error'))

        const result = await settingsService.setConfig({ foo: 'bar' })

        expect(result).toEqual({})
    })
})

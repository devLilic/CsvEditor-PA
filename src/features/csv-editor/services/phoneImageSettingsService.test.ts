import { describe, expect, it } from 'vitest'
import { FALLBACK_PHONE_IMAGE_SETTINGS } from '../domain/phoneImageSettings'
import { phoneImageSettingsService } from './phoneImageSettingsService'

describe('phoneImageSettingsService', () => {
    it('returns normalized phone image settings from IPC', async () => {
        const api = (window as any).electronAPI
        const settings = {
            workPath: 'WORK_PATH',
            width: 320,
            height: 480,
        }
        api.getPhoneImageSettings.mockResolvedValueOnce(settings)

        const result = await phoneImageSettingsService.getPhoneImageSettings()

        expect(result).toEqual(settings)
        expect(api.getPhoneImageSettings).toHaveBeenCalledOnce()
    })

    it('returns fallback when get IPC fails', async () => {
        const api = (window as any).electronAPI
        api.getPhoneImageSettings.mockRejectedValueOnce(new Error('store error'))

        const result = await phoneImageSettingsService.getPhoneImageSettings()

        expect(result).toEqual(FALLBACK_PHONE_IMAGE_SETTINGS)
    })

    it('saves normalized settings through IPC', async () => {
        const api = (window as any).electronAPI
        const settings = {
            workPath: 'WORK_PATH',
            width: 320,
            height: 480,
        }
        api.setPhoneImageSettings.mockResolvedValueOnce(settings)

        const result = await phoneImageSettingsService.setPhoneImageSettings(settings)

        expect(result).toEqual(settings)
        expect(api.setPhoneImageSettings).toHaveBeenCalledWith(settings)
    })

    it('returns fallback when set IPC fails', async () => {
        const api = (window as any).electronAPI
        api.setPhoneImageSettings.mockRejectedValueOnce(new Error('write error'))

        const result = await phoneImageSettingsService.setPhoneImageSettings({
            workPath: 'WORK_PATH',
            width: 320,
            height: 480,
        })

        expect(result).toEqual(FALLBACK_PHONE_IMAGE_SETTINGS)
    })

    it('returns selected work path from IPC', async () => {
        const api = (window as any).electronAPI
        api.selectWorkPath.mockResolvedValueOnce('C:\\Work')

        const result = await phoneImageSettingsService.selectWorkPath()

        expect(result).toBe('C:\\Work')
        expect(api.selectWorkPath).toHaveBeenCalledOnce()
    })

    it('returns null when selectWorkPath IPC fails', async () => {
        const api = (window as any).electronAPI
        api.selectWorkPath.mockRejectedValueOnce(new Error('dialog error'))

        const result = await phoneImageSettingsService.selectWorkPath()

        expect(result).toBeNull()
    })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RendererApi } from '../../../shared/ipc-types'
import { appUpdateService } from './appUpdateService'

function createAppUpdateApiMock() {
    return {
        getCurrentVersion: vi.fn(),
        checkForUpdates: vi.fn(),
        downloadUpdate: vi.fn(),
        installUpdate: vi.fn(),
        onStatus: vi.fn(),
    }
}

describe('appUpdateService', () => {
    let originalElectronApi: RendererApi | undefined

    beforeEach(() => {
        originalElectronApi = window.electronAPI
    })

    afterEach(() => {
        window.electronAPI = originalElectronApi as RendererApi
        vi.restoreAllMocks()
    })

    it('getCurrentVersion returns the version from electronAPI', async () => {
        const appUpdate = createAppUpdateApiMock()
        appUpdate.getCurrentVersion.mockResolvedValueOnce('3.0.0')
        window.electronAPI = {
            ...window.electronAPI,
            appUpdate,
        }

        await expect(appUpdateService.getCurrentVersion()).resolves.toBe('3.0.0')
        expect(appUpdate.getCurrentVersion).toHaveBeenCalledOnce()
    })

    it('checkForUpdates returns the result from electronAPI', async () => {
        const appUpdate = createAppUpdateApiMock()
        const result = {
            ok: true,
            status: 'available',
            currentVersion: '3.0.0',
            newVersion: '3.1.0',
        } as const
        appUpdate.checkForUpdates.mockResolvedValueOnce(result)
        window.electronAPI = {
            ...window.electronAPI,
            appUpdate,
        }

        await expect(appUpdateService.checkForUpdates()).resolves.toEqual(result)
        expect(appUpdate.checkForUpdates).toHaveBeenCalledOnce()
    })

    it('downloadUpdate returns the result from electronAPI', async () => {
        const appUpdate = createAppUpdateApiMock()
        const result = { ok: true } as const
        appUpdate.downloadUpdate.mockResolvedValueOnce(result)
        window.electronAPI = {
            ...window.electronAPI,
            appUpdate,
        }

        await expect(appUpdateService.downloadUpdate()).resolves.toEqual(result)
        expect(appUpdate.downloadUpdate).toHaveBeenCalledOnce()
    })

    it('installUpdate calls electronAPI', async () => {
        const appUpdate = createAppUpdateApiMock()
        appUpdate.installUpdate.mockResolvedValueOnce(undefined)
        window.electronAPI = {
            ...window.electronAPI,
            appUpdate,
        }

        await expect(appUpdateService.installUpdate()).resolves.toBeUndefined()
        expect(appUpdate.installUpdate).toHaveBeenCalledOnce()
    })

    it('returns controlled errors when electronAPI is missing', async () => {
        window.electronAPI = undefined as unknown as RendererApi

        await expect(appUpdateService.checkForUpdates()).resolves.toEqual({
            ok: false,
            error: 'ELECTRON_UPDATE_API_UNAVAILABLE',
        })
        await expect(appUpdateService.downloadUpdate()).resolves.toEqual({
            ok: false,
            error: 'ELECTRON_UPDATE_API_UNAVAILABLE',
        })
        await expect(appUpdateService.getCurrentVersion()).rejects.toThrow('ELECTRON_UPDATE_API_UNAVAILABLE')
        await expect(appUpdateService.installUpdate()).rejects.toThrow('ELECTRON_UPDATE_API_UNAVAILABLE')
    })

    it('onUpdateStatus returns unsubscribe', () => {
        const unsubscribe = vi.fn()
        const callback = vi.fn()
        const appUpdate = createAppUpdateApiMock()
        appUpdate.onStatus.mockReturnValueOnce(unsubscribe)
        window.electronAPI = {
            ...window.electronAPI,
            appUpdate,
        }

        expect(appUpdateService.onUpdateStatus(callback)).toBe(unsubscribe)
        expect(appUpdate.onStatus).toHaveBeenCalledWith(callback)
    })
})

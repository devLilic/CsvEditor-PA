import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UpdateStatus } from '../../../shared/ipc-types'
import { appUpdateService } from '../services/appUpdateService'
import { useAppUpdate } from './useAppUpdate'

vi.mock('../services/appUpdateService', () => ({
    appUpdateService: {
        getCurrentVersion: vi.fn(),
        checkForUpdates: vi.fn(),
        downloadUpdate: vi.fn(),
        installUpdate: vi.fn(),
        onUpdateStatus: vi.fn(),
    },
}))

describe('useAppUpdate', () => {
    let statusCallback: ((status: UpdateStatus) => void) | undefined
    let unsubscribe: ReturnType<typeof vi.fn>

    beforeEach(() => {
        statusCallback = undefined
        unsubscribe = vi.fn()

        vi.mocked(appUpdateService.getCurrentVersion).mockResolvedValue('3.0.0')
        vi.mocked(appUpdateService.checkForUpdates).mockResolvedValue({
            ok: true,
            status: 'not-available',
            currentVersion: '3.0.0',
        })
        vi.mocked(appUpdateService.downloadUpdate).mockResolvedValue({ ok: true })
        vi.mocked(appUpdateService.installUpdate).mockResolvedValue(undefined)
        vi.mocked(appUpdateService.onUpdateStatus).mockImplementation((callback) => {
            statusCallback = callback
            return unsubscribe
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('reads current version on mount', async () => {
        const { result } = renderHook(() => useAppUpdate())

        await waitFor(() => {
            expect(result.current.currentVersion).toBe('3.0.0')
        })
        expect(result.current.status).toEqual({
            type: 'idle',
            currentVersion: '3.0.0',
        })
        expect(appUpdateService.getCurrentVersion).toHaveBeenCalledOnce()
    })

    it('checkForUpdates sets checking status', async () => {
        let resolveCheck: (value: Awaited<ReturnType<typeof appUpdateService.checkForUpdates>>) => void
        let checkPromise: Promise<void>
        vi.mocked(appUpdateService.checkForUpdates).mockReturnValueOnce(new Promise((resolve) => {
            resolveCheck = resolve
        }))

        const { result } = renderHook(() => useAppUpdate())

        await waitFor(() => {
            expect(result.current.currentVersion).toBe('3.0.0')
        })

        act(() => {
            checkPromise = result.current.checkForUpdates()
        })

        expect(result.current.status).toEqual({
            type: 'checking',
            currentVersion: '3.0.0',
        })

        await act(async () => {
            resolveCheck({
                ok: true,
                status: 'not-available',
                currentVersion: '3.0.0',
            })
            await checkPromise
        })
    })

    it('available status sets availableVersion', async () => {
        const { result } = renderHook(() => useAppUpdate())

        act(() => {
            statusCallback?.({
                type: 'available',
                currentVersion: '3.0.0',
                newVersion: '3.1.0',
            })
        })

        expect(result.current.availableVersion).toBe('3.1.0')
        expect(result.current.status.type).toBe('available')
    })

    it('downloading status sets progress', () => {
        const { result } = renderHook(() => useAppUpdate())

        act(() => {
            statusCallback?.({
                type: 'downloading',
                percent: 42,
                transferred: 420,
                total: 1000,
            })
        })

        expect(result.current.progress).toEqual({
            percent: 42,
            transferred: 420,
            total: 1000,
        })
        expect(result.current.status.type).toBe('downloading')
    })

    it('downloaded status allows install', async () => {
        const { result } = renderHook(() => useAppUpdate())

        act(() => {
            statusCallback?.({
                type: 'downloaded',
                newVersion: '3.1.0',
            })
        })

        await act(async () => {
            await result.current.installUpdate()
        })

        expect(result.current.availableVersion).toBe('3.1.0')
        expect(appUpdateService.installUpdate).toHaveBeenCalledOnce()
    })

    it('error status sets error', () => {
        const { result } = renderHook(() => useAppUpdate())

        act(() => {
            statusCallback?.({
                type: 'error',
                message: 'Network error',
            })
        })

        expect(result.current.error).toBe('Network error')
        expect(result.current.status.type).toBe('error')
    })

    it('calls unsubscribe on unmount', () => {
        const { unmount } = renderHook(() => useAppUpdate())

        unmount()

        expect(unsubscribe).toHaveBeenCalledOnce()
    })
})

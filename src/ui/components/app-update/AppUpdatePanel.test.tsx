import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UseAppUpdateResult } from '@/features/app-update/hooks/useAppUpdate'
import { useAppUpdate } from '@/features/app-update/hooks/useAppUpdate'
import { AppUpdatePanel } from './AppUpdatePanel'

vi.mock('@/features/app-update/hooks/useAppUpdate', () => ({
    useAppUpdate: vi.fn(),
}))

const checkForUpdates = vi.fn()
const downloadUpdate = vi.fn()
const installUpdate = vi.fn()

function mockUseAppUpdate(overrides: Partial<UseAppUpdateResult> = {}) {
    vi.mocked(useAppUpdate).mockReturnValue({
        currentVersion: '3.0.0',
        status: {
            type: 'idle',
            currentVersion: '3.0.0',
        },
        availableVersion: undefined,
        error: undefined,
        progress: undefined,
        checkForUpdates,
        downloadUpdate,
        installUpdate,
        ...overrides,
    })
}

describe('AppUpdatePanel', () => {
    beforeEach(() => {
        mockUseAppUpdate()
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('displays current version', () => {
        render(<AppUpdatePanel />)

        expect(screen.getByText('Versiune curenta: 3.0.0')).toBeInTheDocument()
    })

    it('displays check updates button', () => {
        render(<AppUpdatePanel />)

        expect(screen.getByRole('button', { name: 'Verifica actualizari' })).toBeInTheDocument()
    })

    it('clicking check updates calls the hook action', async () => {
        const user = userEvent.setup()
        render(<AppUpdatePanel />)

        await user.click(screen.getByRole('button', { name: 'Verifica actualizari' }))

        expect(checkForUpdates).toHaveBeenCalledOnce()
    })

    it('shows download button when an update is available', () => {
        mockUseAppUpdate({
            status: {
                type: 'available',
                currentVersion: '3.0.0',
                newVersion: '3.1.0',
            },
            availableVersion: '3.1.0',
        })

        render(<AppUpdatePanel />)

        expect(screen.getByText('Versiune noua disponibila: 3.1.0')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Descarca update' })).toBeInTheDocument()
    })

    it('shows download percent while downloading', () => {
        mockUseAppUpdate({
            status: {
                type: 'downloading',
                percent: 45,
            },
            progress: {
                percent: 45,
            },
        })

        render(<AppUpdatePanel />)

        expect(screen.getByText('Se descarca actualizarea: 45%')).toBeInTheDocument()
    })

    it('shows install button after download', () => {
        mockUseAppUpdate({
            status: {
                type: 'downloaded',
                newVersion: '3.1.0',
            },
            availableVersion: '3.1.0',
        })

        render(<AppUpdatePanel />)

        expect(screen.getByText('Actualizarea este descarcata.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Instaleaza si reporneste' })).toBeInTheDocument()
    })

    it('shows error message', () => {
        mockUseAppUpdate({
            status: {
                type: 'error',
                message: 'Network error',
            },
            error: 'Network error',
        })

        render(<AppUpdatePanel />)

        expect(screen.getByText('Eroare: Network error')).toBeInTheDocument()
    })

    it('shows a clear development mode message', () => {
        mockUseAppUpdate({
            status: {
                type: 'error',
                message: 'UPDATE_ONLY_AVAILABLE_IN_PACKAGED_APP',
            },
            error: 'UPDATE_ONLY_AVAILABLE_IN_PACKAGED_APP',
        })

        render(<AppUpdatePanel />)

        expect(screen.getByText(
            'Eroare: Actualizarile sunt disponibile doar in aplicatia instalata, nu in modul development.'
        )).toBeInTheDocument()
    })

    it('shows a generic installer message for signing errors', () => {
        mockUseAppUpdate({
            status: {
                type: 'error',
                message: 'publisher signature rejected',
            },
            error: 'publisher signature rejected',
        })

        render(<AppUpdatePanel />)

        expect(screen.getByText(
            'Eroare: Actualizarea nu a putut fi instalata. Verifica daca installerul poate rula pe acest calculator.'
        )).toBeInTheDocument()
    })
})

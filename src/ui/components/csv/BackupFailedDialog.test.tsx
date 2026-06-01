import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BackupFailedDialog } from './BackupFailedDialog'

describe('BackupFailedDialog', () => {
    afterEach(() => {
        cleanup()
    })

    it('does not render when open is false', () => {
        render(
            <BackupFailedDialog
                open={false}
                onCancel={vi.fn()}
                onContinueWithoutBackup={vi.fn()}
            />,
        )

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders the backup failure message when open is true', () => {
        render(
            <BackupFailedDialog
                open
                onCancel={vi.fn()}
                onContinueWithoutBackup={vi.fn()}
            />,
        )

        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Backup CSV nu a putut fi creat.')).toBeInTheDocument()
        expect(screen.getByText(/Proiectul curent nu a fost resetat/)).toBeInTheDocument()
    })

    it('renders the error when provided', () => {
        render(
            <BackupFailedDialog
                open
                error="No backup folder configured"
                onCancel={vi.fn()}
                onContinueWithoutBackup={vi.fn()}
            />,
        )

        expect(screen.getByText('No backup folder configured')).toBeInTheDocument()
    })

    it('calls onCancel when clicking Revino', async () => {
        const user = userEvent.setup()
        const onCancel = vi.fn()

        render(
            <BackupFailedDialog
                open
                onCancel={onCancel}
                onContinueWithoutBackup={vi.fn()}
            />,
        )

        await user.click(screen.getByRole('button', { name: 'Revino' }))

        expect(onCancel).toHaveBeenCalledOnce()
    })

    it('calls onContinueWithoutBackup when clicking Continue without backup', async () => {
        const user = userEvent.setup()
        const onContinueWithoutBackup = vi.fn()

        render(
            <BackupFailedDialog
                open
                onCancel={vi.fn()}
                onContinueWithoutBackup={onContinueWithoutBackup}
            />,
        )

        await user.click(screen.getByRole('button', { name: 'Continuă fără backup' }))

        expect(onContinueWithoutBackup).toHaveBeenCalledOnce()
    })
})

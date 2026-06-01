import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TedUnsavedChangesDialog } from './TedUnsavedChangesDialog'

afterEach(() => {
    cleanup()
})

describe('TedUnsavedChangesDialog', () => {
    it('does not render while closed', () => {
        render(
            <TedUnsavedChangesDialog
                open={false}
                onCancel={vi.fn()}
                onExitWithoutSaving={vi.fn()}
                onSaveAndExit={vi.fn()}
            />
        )

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows the unsaved changes message while open', () => {
        render(
            <TedUnsavedChangesDialog
                open
                onCancel={vi.fn()}
                onExitWithoutSaving={vi.fn()}
                onSaveAndExit={vi.fn()}
            />
        )

        expect(screen.getByRole('dialog')).toHaveTextContent(
            'Ai modificări nesalvate în template.'
        )
        expect(screen.getByRole('dialog')).toHaveTextContent(
            'Vrei să salvezi modificările înainte de a ieși din Template Editor?'
        )
    })

    it.each([
        ['Anulează', 'cancel'],
        ['Ieși fără salvare', 'exit'],
        ['Salvează și ieși', 'save'],
    ])('calls the %s action', async (buttonName, action) => {
        const user = userEvent.setup()
        const callbacks = {
            cancel: vi.fn(),
            exit: vi.fn(),
            save: vi.fn(),
        }
        render(
            <TedUnsavedChangesDialog
                open
                onCancel={callbacks.cancel}
                onExitWithoutSaving={callbacks.exit}
                onSaveAndExit={callbacks.save}
            />
        )

        await user.click(screen.getByRole('button', { name: buttonName }))

        expect(callbacks[action as keyof typeof callbacks]).toHaveBeenCalledOnce()
    })

    it('shows save errors and disables actions while saving', () => {
        render(
            <TedUnsavedChangesDialog
                open
                onCancel={vi.fn()}
                onExitWithoutSaving={vi.fn()}
                onSaveAndExit={vi.fn()}
                isSaving
                error="SAVE_FAILED"
            />
        )

        expect(screen.getByRole('alert')).toHaveTextContent('SAVE_FAILED')
        for (const button of screen.getAllByRole('button')) {
            expect(button).toBeDisabled()
        }
    })
})

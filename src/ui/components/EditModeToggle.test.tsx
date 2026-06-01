import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { EditModeProvider } from '@/ui/context/EditModeContext'
import { TedModeProvider, useTedMode } from '@/ui/context/TedModeContext'
import { EditModeToggle } from './EditModeToggle'

afterEach(() => {
    cleanup()
})

function TedModeToggle() {
    const { isTedMode, toggleTedMode } = useTedMode()

    return (
        <button type="button" onClick={toggleTedMode}>
            {isTedMode ? 'Exit Templates' : 'EDIT Templates'}
        </button>
    )
}

function renderHarness() {
    return render(
        <EditModeProvider>
            <TedModeProvider>
                <TedModeToggle />
                <EditModeToggle />
            </TedModeProvider>
        </EditModeProvider>
    )
}

describe('EditModeToggle', () => {
    it('is disabled and stays on while TED mode is active', async () => {
        const user = userEvent.setup()
        renderHarness()

        await user.click(screen.getByRole('button', { name: 'EDIT Templates' }))

        const editModeToggle = screen.getByRole('button', { name: /Edit Mode ON/i })
        expect(editModeToggle).toBeDisabled()

        await user.click(editModeToggle)

        expect(screen.getByRole('button', { name: /Edit Mode ON/i })).toBeDisabled()
    })

    it('becomes enabled after leaving TED mode and keeps Edit Mode on', async () => {
        const user = userEvent.setup()
        renderHarness()

        await user.click(screen.getByRole('button', { name: 'EDIT Templates' }))
        await user.click(screen.getByRole('button', { name: 'Exit Templates' }))

        const editModeToggle = screen.getByRole('button', { name: /Edit Mode ON/i })
        expect(editModeToggle).toBeEnabled()

        await user.click(editModeToggle)

        expect(screen.getByRole('button', { name: /Edit Mode OFF/i })).toBeEnabled()
    })
})

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { EditModeProvider } from '@/ui/context/EditModeContext'
import { EditModeToggle } from './EditModeToggle'

afterEach(() => {
    cleanup()
})

function renderHarness() {
    return render(
        <EditModeProvider>
            <EditModeToggle />
        </EditModeProvider>
    )
}

describe('EditModeToggle', () => {
    it('renders without the template editor provider', () => {
        renderHarness()
        expect(screen.getByRole('button', { name: /Edit Mode OFF/i })).toBeEnabled()
    })

    it('toggles production editing independently of template configuration', async () => {
        const user = userEvent.setup()
        renderHarness()

        await user.click(screen.getByRole('button', { name: /Edit Mode OFF/i }))

        const editModeToggle = screen.getByRole('button', { name: /Edit Mode ON/i })
        expect(editModeToggle).toBeEnabled()

        await user.click(editModeToggle)

        expect(screen.getByRole('button', { name: /Edit Mode OFF/i })).toBeEnabled()
    })
})

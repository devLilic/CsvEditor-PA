import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { EditModeProvider, useEditMode } from './EditModeContext'
import { TedModeProvider, useTedMode } from './TedModeContext'

afterEach(() => {
    cleanup()
})

function ContextHarness() {
    const { editMode, toggleEditMode } = useEditMode()
    const { isTedMode, toggleTedMode } = useTedMode()

    return (
        <>
            <div>Edit mode: {editMode ? 'ON' : 'OFF'}</div>
            <div>TED mode: {isTedMode ? 'ON' : 'OFF'}</div>
            <button type="button" onClick={toggleEditMode}>Toggle edit</button>
            <button type="button" onClick={toggleTedMode}>Toggle TED</button>
        </>
    )
}

function renderHarness() {
    return render(
        <EditModeProvider>
            <TedModeProvider>
                <ContextHarness />
            </TedModeProvider>
        </EditModeProvider>
    )
}

describe('TedModeContext', () => {
    it('starts disabled and can be enabled and disabled locally', async () => {
        const user = userEvent.setup()
        renderHarness()

        expect(screen.getByText('TED mode: OFF')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Toggle TED' }))
        expect(screen.getByText('TED mode: ON')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Toggle TED' }))
        expect(screen.getByText('TED mode: OFF')).toBeInTheDocument()
    })

    it('forces Edit Mode on while TED mode is enabled', async () => {
        const user = userEvent.setup()
        renderHarness()

        await user.click(screen.getByRole('button', { name: 'Toggle TED' }))
        expect(screen.getByText('Edit mode: ON')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Toggle edit' }))

        await waitFor(() => {
            expect(screen.getByText('Edit mode: ON')).toBeInTheDocument()
        })
    })
})

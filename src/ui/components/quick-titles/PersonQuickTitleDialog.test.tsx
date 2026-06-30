import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PersonQuickTitleDialog } from './PersonQuickTitleDialog'

function renderDialog(props: Partial<Parameters<typeof PersonQuickTitleDialog>[0]> = {}) {
    const defaultProps = {
        open: true,
        initialValue: 'BUJOR',
        personName: 'ANA BUJOR',
        onSave: vi.fn(),
        onCancel: vi.fn(),
    }

    return {
        props: defaultProps,
        ...render(
            <PersonQuickTitleDialog
                {...defaultProps}
                {...props}
            />
        ),
    }
}

describe('PersonQuickTitleDialog', () => {
    afterEach(() => {
        cleanup()
    })

    it('does not render when open=false', () => {
        const { container } = renderDialog({ open: false })

        expect(container).toBeEmptyDOMElement()
    })

    it('renders when open=true', () => {
        renderDialog()

        expect(screen.getByRole('dialog', { name: 'Prefix persoană' })).toBeInTheDocument()
        expect(screen.getByText('Persoana a fost salvată.')).toBeInTheDocument()
        expect(screen.getByText('Dorești să creezi și un prefix pentru această persoană?')).toBeInTheDocument()
    })

    it('sets the input initialValue', () => {
        renderDialog({ initialValue: 'POPESCU' })

        expect(screen.getByRole('textbox', { name: 'Prefix pentru ANA BUJOR' })).toHaveValue('POPESCU')
    })

    it('allows the input to be edited', async () => {
        const user = userEvent.setup()
        renderDialog()

        const input = screen.getByRole('textbox', { name: 'Prefix pentru ANA BUJOR' })
        await user.clear(input)
        await user.type(input, 'I. BUJOR')

        expect(input).toHaveValue('I. BUJOR')
    })

    it('saves the current value', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        renderDialog({ onSave })

        const input = screen.getByRole('textbox', { name: 'Prefix pentru ANA BUJOR' })
        await user.clear(input)
        await user.type(input, '  I. BUJOR  ')
        await user.click(screen.getByRole('button', { name: 'Save' }))

        expect(onSave).toHaveBeenCalledWith('I. BUJOR')
    })

    it('calls onCancel when Cancel is clicked', async () => {
        const user = userEvent.setup()
        const onCancel = vi.fn()
        renderDialog({ onCancel })

        await user.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(onCancel).toHaveBeenCalledOnce()
    })

    it('calls onCancel on Escape', async () => {
        const user = userEvent.setup()
        const onCancel = vi.fn()
        renderDialog({ onCancel })

        await user.keyboard('{Escape}')

        expect(onCancel).toHaveBeenCalledOnce()
    })

    it('does not call onCancel when the overlay is clicked', async () => {
        const user = userEvent.setup()
        const onCancel = vi.fn()
        renderDialog({ onCancel })

        await user.click(screen.getByRole('dialog', { name: 'Prefix persoană' }))

        expect(onCancel).not.toHaveBeenCalled()
    })

    it('disables Save when the input is empty', async () => {
        const user = userEvent.setup()
        renderDialog()

        await user.clear(screen.getByRole('textbox', { name: 'Prefix pentru ANA BUJOR' }))

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })

    it('shows an error when provided', () => {
        renderDialog({ error: 'Nu s-a putut salva prefixul.' })

        expect(screen.getByText('Nu s-a putut salva prefixul.')).toBeInTheDocument()
    })
})

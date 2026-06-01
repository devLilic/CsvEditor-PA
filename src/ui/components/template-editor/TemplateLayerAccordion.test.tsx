import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import { TemplateLayerAccordion } from './TemplateLayerAccordion'

afterEach(() => {
    cleanup()
})

describe('TemplateLayerAccordion', () => {
    it('shows background and all existing layers', () => {
        render(
            <TemplateLayerAccordion
                template={broadcastTemplates.persons}
                onTemplateChange={vi.fn()}
            />
        )

        expect(screen.getAllByText('Background')[0]).toBeInTheDocument()
        for (const layer of broadcastTemplates.persons.layers) {
            expect(screen.getByText(`${layer.id} (${layer.type})`)).toBeInTheDocument()
        }
    })

    it('does not expose add or delete layer actions', () => {
        render(
            <TemplateLayerAccordion
                template={broadcastTemplates.persons}
                onTemplateChange={vi.fn()}
            />
        )

        expect(screen.queryByRole('button', { name: /add layer/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /delete layer/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /remove layer/i })).not.toBeInTheDocument()
    })

    it('allows each layer to expand and collapse', async () => {
        const user = userEvent.setup()
        render(
            <TemplateLayerAccordion
                template={broadcastTemplates.persons}
                onTemplateChange={vi.fn()}
            />
        )
        const summary = screen.getByText('person-name-text (text)')
        const details = summary.closest('details')

        expect(details).not.toHaveAttribute('open')

        await user.click(summary)
        expect(details).toHaveAttribute('open')

        await user.click(summary)
        expect(details).not.toHaveAttribute('open')
    })

    it('propagates layer changes', async () => {
        const user = userEvent.setup()
        const onTemplateChange = vi.fn()
        render(
            <TemplateLayerAccordion
                template={broadcastTemplates.persons}
                onTemplateChange={onTemplateChange}
            />
        )

        const summary = screen.getByText('person-name-text (text)')
        await user.click(summary)
        const details = summary.closest('details')
        expect(details).not.toBeNull()
        const xInput = within(details as HTMLElement).getByLabelText('X')
        fireEvent.change(xInput, { target: { value: '777' } })

        expect(onTemplateChange).toHaveBeenLastCalledWith(
            expect.objectContaining({
                layers: expect.arrayContaining([
                    expect.objectContaining({
                        id: 'person-name-text',
                        x: 777,
                    }),
                ]),
            })
        )
    })
})

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import { TemplateLayerAccordion } from './TemplateLayerAccordion'

function StatefulTemplateLayerAccordion({
    initialTemplate,
    onTemplateChange,
}: {
    initialTemplate: typeof broadcastTemplates.persons
    onTemplateChange: (template: typeof broadcastTemplates.persons) => void
}) {
    const [template, setTemplate] = useState(initialTemplate)

    return (
        <TemplateLayerAccordion
            template={template}
            onTemplateChange={(nextTemplate) => {
                onTemplateChange(nextTemplate)
                setTemplate(nextTemplate)
            }}
        />
    )
}

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

    it('adds and expands a usable text layer with a unique id', async () => {
        const user = userEvent.setup()
        const onTemplateChange = vi.fn()
        render(
            <StatefulTemplateLayerAccordion
                initialTemplate={broadcastTemplates.persons}
                onTemplateChange={onTemplateChange}
            />
        )

        await user.click(screen.getByRole('button', { name: 'Add text layer' }))

        const updatedTemplate = onTemplateChange.mock.lastCall?.[0]
        expect(updatedTemplate.layers.at(-1)).toMatchObject({
            id: 'custom-text-1',
            type: 'text',
            fieldId: '',
            fallbackText: 'New text',
            fieldDefaultValue: 'New text',
            textStyle: expect.objectContaining({
                fontFamily: expect.any(String),
                fontSize: expect.any(Number),
                fontWeight: expect.any(Number),
                color: expect.any(String),
            }),
        })
        const createdSummary = screen.getByText('custom-text-1 (text)')
        expect(createdSummary.closest('details')).toHaveAttribute('open')
        expect(within(createdSummary.closest('details') as HTMLElement).getByLabelText('Field id'))
            .toHaveValue('')
    })

    it('adds shape layers behind existing content and keeps their editable properties', async () => {
        const user = userEvent.setup()
        const onTemplateChange = vi.fn()
        render(
            <StatefulTemplateLayerAccordion
                initialTemplate={broadcastTemplates.persons}
                onTemplateChange={onTemplateChange}
            />
        )

        await user.click(screen.getByRole('button', { name: 'Add shape layer' }))

        const updatedTemplate = onTemplateChange.mock.lastCall?.[0]
        const layer = updatedTemplate.layers.at(-1)
        expect(layer).toMatchObject({
            id: 'custom-shape-1',
            type: 'shape',
            shapeType: 'rect',
            fill: { type: 'solid', value: expect.any(String) },
        })
        expect(layer.zIndex).toBeLessThan(Math.min(...broadcastTemplates.persons.layers.map((item) => item.zIndex)))
        const createdSummary = screen.getByText('custom-shape-1 (shape)')
        expect(createdSummary.closest('details')).toHaveAttribute('open')
        expect(within(createdSummary.closest('details') as HTMLElement).getByLabelText('Fill'))
            .toHaveValue('#1f2937')
    })

    it('creates another text layer with a non-colliding id', async () => {
        const user = userEvent.setup()
        const onTemplateChange = vi.fn()
        render(
            <StatefulTemplateLayerAccordion
                initialTemplate={broadcastTemplates.persons}
                onTemplateChange={onTemplateChange}
            />
        )

        await user.click(screen.getByRole('button', { name: 'Add text layer' }))
        await user.click(screen.getByRole('button', { name: 'Add text layer' }))

        expect(onTemplateChange.mock.lastCall?.[0].layers.at(-1).id).toBe('custom-text-2')
    })

    it('does not expose delete layer actions', () => {
        render(
            <TemplateLayerAccordion
                template={broadcastTemplates.persons}
                onTemplateChange={vi.fn()}
            />
        )

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

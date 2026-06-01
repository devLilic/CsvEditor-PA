import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { personTemplate } from '@/templates/broadcast'
import { TextLayerFieldsEditor } from './TextLayerFieldsEditor'

afterEach(() => {
    cleanup()
})

function getTextLayer() {
    const layer = personTemplate.layers.find((item) => item.id === 'person-name-text')
    if (!layer || layer.type !== 'text') {
        throw new Error('Expected person-name-text layer')
    }

    return layer
}

describe('TextLayerFieldsEditor', () => {
    it('renders text layer fields', () => {
        render(<TextLayerFieldsEditor layer={getTextLayer()} onChange={vi.fn()} />)

        expect(screen.getByLabelText('Field id')).toBeInTheDocument()
        expect(screen.getByLabelText('Fallback')).toBeInTheDocument()
        expect(screen.getByLabelText('Default value')).toBeInTheDocument()
        expect(screen.getByLabelText('Min scale X')).toBeInTheDocument()
        expect(screen.getByLabelText('Font family')).toBeInTheDocument()
        expect(screen.getByLabelText('Font size')).toBeInTheDocument()
        expect(screen.getByLabelText('Font weight')).toBeInTheDocument()
        expect(screen.getByLabelText('Color')).toBeInTheDocument()
        expect(screen.getByLabelText('Color picker')).toHaveAttribute('type', 'color')
        expect(screen.getByLabelText('Align')).toBeInTheDocument()
        expect(screen.getByLabelText('Transform')).toBeInTheDocument()
        expect(screen.getByLabelText('Line height')).toBeInTheDocument()
        expect(screen.getByLabelText('Letter spacing')).toBeInTheDocument()
    })

    it('updates text style live without changing layer type or other properties', () => {
        const layer = getTextLayer()
        const onChange = vi.fn()
        render(<TextLayerFieldsEditor layer={layer} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('Font size'), {
            target: { value: '42' },
        })

        expect(onChange).toHaveBeenCalledWith({
            ...layer,
            type: 'text',
            textStyle: {
                ...layer.textStyle,
                fontSize: 42,
            },
        })
    })

    it('updates layer-level text properties and keeps existing properties', () => {
        const layer = getTextLayer()
        const onChange = vi.fn()
        render(<TextLayerFieldsEditor layer={layer} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('Default value'), {
            target: { value: 'DEFAULT' },
        })

        expect(onChange).toHaveBeenCalledWith({
            ...layer,
            type: 'text',
            fieldDefaultValue: 'DEFAULT',
        })
    })

    it('ignores invalid numeric values', () => {
        const onChange = vi.fn()
        render(<TextLayerFieldsEditor layer={getTextLayer()} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('Min scale X'), {
            target: { value: 'invalid' },
        })

        expect(onChange).not.toHaveBeenCalled()
    })

})

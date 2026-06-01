import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { phoneCallTemplate } from '@/templates/broadcast'
import { ShapeLayerFieldsEditor } from './ShapeLayerFieldsEditor'

afterEach(() => {
    cleanup()
})

function getShapeLayer() {
    const layer = phoneCallTemplate.layers.find((item) => item.id === 'phone-call-label-panel')
    if (!layer || layer.type !== 'shape') {
        throw new Error('Expected phone-call-label-panel layer')
    }

    return layer
}

describe('ShapeLayerFieldsEditor', () => {
    it('renders the fixed shape type and editable fields', () => {
        render(<ShapeLayerFieldsEditor layer={getShapeLayer()} onChange={vi.fn()} />)

        expect(screen.getByLabelText('Shape type')).toBeDisabled()
        expect(screen.getByLabelText('Shape type')).toHaveValue('rect')
        expect(screen.getByLabelText('Fill')).toBeInTheDocument()
        expect(screen.getByLabelText('Fill picker')).toHaveAttribute('type', 'color')
        expect(screen.getByLabelText('Border radius')).toBeInTheDocument()
    })

    it('updates fill live without changing layer type or other properties', () => {
        const layer = getShapeLayer()
        const onChange = vi.fn()
        render(<ShapeLayerFieldsEditor layer={layer} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('Fill'), {
            target: { value: '#123456' },
        })

        expect(onChange).toHaveBeenCalledWith({
            ...layer,
            type: 'shape',
            shapeType: 'rect',
            fill: {
                ...layer.fill,
                value: '#123456',
            },
        })
    })

    it('updates border radius live without changing layer type or other properties', () => {
        const layer = getShapeLayer()
        const onChange = vi.fn()
        render(<ShapeLayerFieldsEditor layer={layer} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('Border radius'), {
            target: { value: '12' },
        })

        expect(onChange).toHaveBeenCalledWith({
            ...layer,
            type: 'shape',
            shapeType: 'rect',
            borderRadius: 12,
        })
    })

    it('ignores invalid border radius values', () => {
        const onChange = vi.fn()
        render(<ShapeLayerFieldsEditor layer={getShapeLayer()} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('Border radius'), {
            target: { value: 'invalid' },
        })

        expect(onChange).not.toHaveBeenCalled()
    })
})

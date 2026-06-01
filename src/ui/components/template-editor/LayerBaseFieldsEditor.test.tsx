import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { personTemplate } from '@/templates/broadcast'
import { LayerBaseFieldsEditor } from './LayerBaseFieldsEditor'

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

describe('LayerBaseFieldsEditor', () => {
    it('renders all editable base fields', () => {
        render(<LayerBaseFieldsEditor layer={getTextLayer()} onChange={vi.fn()} />)

        expect(screen.getByLabelText('X')).toBeInTheDocument()
        expect(screen.getByLabelText('Y')).toBeInTheDocument()
        expect(screen.getByLabelText('Width')).toBeInTheDocument()
        expect(screen.getByLabelText('Height')).toBeInTheDocument()
        expect(screen.getByLabelText('Z index')).toBeInTheDocument()
        expect(screen.getByLabelText('Visible')).toBeInTheDocument()
        expect(screen.getByLabelText('Fit in box')).toBeInTheDocument()
        expect(screen.getByLabelText('Border 1px')).toBeInTheDocument()
        expect(screen.getByLabelText('Opacity')).toBeInTheDocument()
        expect(screen.getByLabelText('Rotation')).toBeInTheDocument()
        expect(screen.getByLabelText('Rotation origin')).toHaveValue('center center')
    })

    it('updates only the current field and preserves layer type and other properties', () => {
        const layer = getTextLayer()
        const onChange = vi.fn()
        render(<LayerBaseFieldsEditor layer={layer} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('X'), { target: { value: '777' } })

        expect(onChange).toHaveBeenCalledWith({
            ...layer,
            x: 777,
        })
        expect(onChange.mock.calls[0][0].type).toBe('text')
        expect(onChange.mock.calls[0][0].textStyle).toEqual(layer.textStyle)
    })

    it('updates visible through a checkbox', () => {
        const layer = getTextLayer()
        const onChange = vi.fn()
        render(<LayerBaseFieldsEditor layer={layer} onChange={onChange} />)

        fireEvent.click(screen.getByLabelText('Visible'))

        expect(onChange).toHaveBeenCalledWith({
            ...layer,
            visible: false,
        })
    })

    it('updates fit in box through the text layer checkbox group', () => {
        const layer = getTextLayer()
        const onChange = vi.fn()
        render(<LayerBaseFieldsEditor layer={layer} onChange={onChange} />)

        fireEvent.click(screen.getByLabelText('Fit in box'))

        expect(onChange).toHaveBeenCalledWith({
            ...layer,
            fitInBox: false,
        })
    })

    it('toggles a visible 1px border for checking the text block dimensions', () => {
        const layer = getTextLayer()
        const onChange = vi.fn()
        const { rerender } = render(<LayerBaseFieldsEditor layer={layer} onChange={onChange} />)

        fireEvent.click(screen.getByLabelText('Border 1px'))

        expect(onChange).toHaveBeenCalledWith({
            ...layer,
            border: {
                color: '#ff00ff',
                width: 1,
                style: 'solid',
            },
        })

        rerender(
            <LayerBaseFieldsEditor
                layer={{
                    ...layer,
                    border: {
                        color: '#ff00ff',
                        width: 1,
                        style: 'solid',
                    },
                }}
                onChange={onChange}
            />
        )
        fireEvent.click(screen.getByLabelText('Border 1px'))

        expect(onChange).toHaveBeenLastCalledWith({
            ...layer,
            border: undefined,
        })
    })

    it('ignores invalid numeric values', () => {
        const onChange = vi.fn()
        render(<LayerBaseFieldsEditor layer={getTextLayer()} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('Rotation'), {
            target: { value: 'not-a-number' },
        })

        expect(onChange).not.toHaveBeenCalled()
    })

    it('updates numeric values quickly through a slider', () => {
        const layer = getTextLayer()
        const onChange = vi.fn()
        render(<LayerBaseFieldsEditor layer={layer} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('X slider'), {
            target: { value: '888' },
        })

        expect(onChange).toHaveBeenCalledWith({
            ...layer,
            x: 888,
        })
    })

    it('updates the point used to rotate the layer', () => {
        const layer = getTextLayer()
        const onChange = vi.fn()
        render(<LayerBaseFieldsEditor layer={layer} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('Rotation origin'), {
            target: { value: 'top left' },
        })

        expect(onChange).toHaveBeenCalledWith({
            ...layer,
            rotationOrigin: 'top left',
        })
    })
})

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { phoneCallTemplate } from '@/templates/broadcast'
import { ImageLayerFieldsEditor } from './ImageLayerFieldsEditor'

afterEach(() => {
    cleanup()
})

function getImageLayer() {
    const layer = phoneCallTemplate.layers.find((item) => item.id === 'phone-call-person-image')
    if (!layer || layer.type !== 'image') {
        throw new Error('Expected phone-call-person-image layer')
    }

    return layer
}

describe('ImageLayerFieldsEditor', () => {
    it('shows the fixed phone image source without an editable selector', () => {
        render(<ImageLayerFieldsEditor layer={getImageLayer()} onChange={vi.fn()} />)

        expect(screen.getByText('{image} (fix)')).toBeInTheDocument()
        expect(screen.queryByLabelText('Source path')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Source selector')).not.toBeInTheDocument()
        expect(screen.getByLabelText('Object fit')).toHaveValue('cover')
        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
            'contain',
            'cover',
            'fill',
        ])
    })

    it('updates source live without changing layer type or other properties', () => {
        const layer = {
            ...getImageLayer(),
            id: 'custom-image',
            src: 'initial.png',
        }
        const onChange = vi.fn()
        render(<ImageLayerFieldsEditor layer={layer} onChange={onChange} />)

        const file = new File(['image'], 'new-photo.png', { type: 'image/png' })
        Object.defineProperty(file, 'path', { value: 'C:\\Images\\new-photo.png' })
        fireEvent.change(screen.getByLabelText('Source selector'), {
            target: { files: [file] },
        })

        expect(onChange).toHaveBeenCalledWith({
            ...layer,
            type: 'image',
            src: 'C:\\Images\\new-photo.png',
        })
    })

    it('allows an empty source so the preview can render its placeholder', () => {
        const layer = {
            ...getImageLayer(),
            id: 'custom-image',
            src: 'initial.png',
        }
        const onChange = vi.fn()
        render(<ImageLayerFieldsEditor layer={layer} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('Source selector'), {
            target: { files: [] },
        })

        expect(onChange).toHaveBeenCalledWith({
            ...layer,
            type: 'image',
            src: '',
        })
    })

    it('updates object fit live without changing layer type or other properties', () => {
        const layer = getImageLayer()
        const onChange = vi.fn()
        render(<ImageLayerFieldsEditor layer={layer} onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('Object fit'), {
            target: { value: 'fill' },
        })

        expect(onChange).toHaveBeenCalledWith({
            ...layer,
            type: 'image',
            objectFit: 'fill',
        })
    })
})

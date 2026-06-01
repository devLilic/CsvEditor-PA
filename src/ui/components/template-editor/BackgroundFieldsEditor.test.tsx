import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BackgroundFieldsEditor } from './BackgroundFieldsEditor'

afterEach(() => {
    cleanup()
})

describe('BackgroundFieldsEditor', () => {
    it('updates a color background live', () => {
        const onChange = vi.fn()
        render(
            <BackgroundFieldsEditor
                background={{ type: 'color', value: '#000000' }}
                onChange={onChange}
            />
        )

        expect(screen.getByLabelText('Background type')).toHaveValue('color')
        expect(screen.getByLabelText('Color picker')).toHaveAttribute('type', 'color')
        fireEvent.change(screen.getByLabelText('Color'), {
            target: { value: '#123456' },
        })

        expect(onChange).toHaveBeenCalledWith({
            type: 'color',
            value: '#123456',
        })
    })

    it('updates an image path and object fit live', () => {
        const background = {
            type: 'image' as const,
            value: '/background.png',
            objectFit: 'contain' as const,
        }
        const onChange = vi.fn()
        render(<BackgroundFieldsEditor background={background} onChange={onChange} />)

        const file = new File(['image'], 'new-background.png', { type: 'image/png' })
        Object.defineProperty(file, 'path', { value: 'C:\\Images\\new-background.png' })
        fireEvent.change(screen.getByLabelText('Image path selector'), {
            target: { files: [file] },
        })
        fireEvent.change(screen.getByLabelText('Object fit'), {
            target: { value: 'fill' },
        })

        expect(onChange).toHaveBeenNthCalledWith(1, {
            ...background,
            value: 'C:\\Images\\new-background.png',
        })
        expect(onChange).toHaveBeenNthCalledWith(2, {
            ...background,
            objectFit: 'fill',
        })
    })

    it('switches background type with safe empty defaults', () => {
        const onChange = vi.fn()
        render(
            <BackgroundFieldsEditor
                background={{ type: 'color', value: '#ffffff' }}
                onChange={onChange}
            />
        )

        fireEvent.change(screen.getByLabelText('Background type'), {
            target: { value: 'image' },
        })

        expect(onChange).toHaveBeenCalledWith({
            type: 'image',
            value: '',
            objectFit: 'cover',
        })
    })
})

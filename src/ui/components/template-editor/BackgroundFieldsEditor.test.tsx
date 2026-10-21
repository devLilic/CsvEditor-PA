import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BroadcastBackground } from '@/shared/preview/templateContract'
import { BackgroundRenderer } from '@/ui/components/preview16x9/BackgroundRenderer'
import { BackgroundFieldsEditor } from './BackgroundFieldsEditor'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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

    it('updates an image path and object fit live', async () => {
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

        await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2))
        expect(onChange.mock.calls).toContainEqual([{
            ...background,
            value: 'C:\\Images\\new-background.png',
        }])
        expect(onChange.mock.calls).toContainEqual([{
            ...background,
            objectFit: 'fill',
        }])
    })

    it('persists selected file contents when the browser does not expose a filesystem path', async () => {
        const onChange = vi.fn()
        render(
            <BackgroundFieldsEditor
                background={{ type: 'image', value: '', objectFit: 'cover' }}
                onChange={onChange}
            />
        )

        const file = new File(['png contents'], 'background.png', { type: 'image/png' })
        fireEvent.change(screen.getByLabelText('Image path selector'), {
            target: { files: [file] },
        })

        await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
        const [nextBackground] = onChange.mock.calls[0]
        expect(nextBackground.value).toMatch(/^data:image\/png;base64,/)
    })

    it('shows a selected PNG in preview when the browser does not expose a file path', async () => {
        function BackgroundSelectionPreview() {
            const [background, setBackground] = useState<BroadcastBackground>({
                type: 'image',
                value: '',
                objectFit: 'cover',
            })

            return (
                <>
                    <BackgroundFieldsEditor background={background} onChange={setBackground} />
                    <BackgroundRenderer background={background} />
                </>
            )
        }

        const { container } = render(<BackgroundSelectionPreview />)
        fireEvent.change(screen.getByLabelText('Image path selector'), {
            target: { files: [new File(['a'.repeat(2_100_000)], 'background.png', { type: 'image/png' })] },
        })

        await waitFor(() => {
            expect(container.querySelector('[data-preview-background="image"]'))
                .toHaveAttribute('src', expect.stringMatching(/^data:image\/png;base64,/))
        })
        expect(screen.getByLabelText('Image path path')).toHaveValue('Embedded image')
        expect(container.querySelector('[data-preview-background="image"]')?.getAttribute('src')?.length).toBeGreaterThan(2_000_000)
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

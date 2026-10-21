import { fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    BackgroundRenderer,
    resolveBackgroundImageSrc,
    resolvePublicBackgroundAsset,
} from './BackgroundRenderer'

describe('BackgroundRenderer', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('renders a color background', () => {
        const { container } = render(
            <BackgroundRenderer background={{ type: 'color', value: '#ff0000' }} />
        )

        expect(container.firstElementChild).toHaveStyle({ backgroundColor: '#ff0000' })
    })

    it('renders an image background visually', () => {
        const { container } = render(
            <BackgroundRenderer
                background={{ type: 'image', value: '/background.png', objectFit: 'contain' }}
            />
        )

        const image = container.querySelector('img')

        expect(image).toHaveAttribute('src', new URL('background.png', new URL(import.meta.env.BASE_URL, document.baseURI)).href)
        expect(image).toHaveStyle({ objectFit: 'contain' })
    })

    it('renders a selected Windows image path as a file URL', async () => {
        const { container } = render(
            <BackgroundRenderer
                background={{ type: 'image', value: 'C:\\Images\\new-background.png' }}
            />
        )

        await waitFor(() => expect(container.querySelector('img')).toHaveAttribute(
                'src',
                'file:///C:/Images/new-background.png',
            ))
    })

    it('encodes reserved characters in generic Windows image paths', () => {
        expect(resolveBackgroundImageSrc('C:\\Images\\frame #1.png'))
            .toBe('file:///C:/Images/frame%20%231.png')
    })

    it('resolves any public filename through the app base URL', () => {
        const { container } = render(
            <BackgroundRenderer background={{ type: 'image', value: 'videoframe_1748095.png' }} />
        )

        expect(container.querySelector('img')).toHaveAttribute(
            'src',
            new URL('videoframe_1748095.png', new URL(import.meta.env.BASE_URL, document.baseURI)).href,
        )
    })

    it('resolves public references in dev and packaged desktop locations', () => {
        expect(resolvePublicBackgroundAsset('public/background.png', './', 'http://localhost:3000/')).toBe(
            'http://localhost:3000/background.png',
        )
        expect(resolvePublicBackgroundAsset('./public/background.png', './', 'http://localhost:3000/')).toBe(
            'http://localhost:3000/background.png',
        )
        expect(resolvePublicBackgroundAsset(
            './background.png',
            './',
            'file:///C:/Program%20Files/CsvEditor/dist/index.html',
        )).toBe('file:///C:/Program%20Files/CsvEditor/dist/background.png')
    })

    it('keeps an embedded image source unchanged for full quality preview', () => {
        const source = `data:image/png;base64,${'a'.repeat(2_100_000)}`
        const { container } = render(
            <BackgroundRenderer background={{ type: 'image', value: source }} />
        )

        expect(container.querySelector('img')).toHaveAttribute('src', source)
    })

    it('falls back to black when background is missing', () => {
        const { container } = render(<BackgroundRenderer />)

        expect(container.firstElementChild).toHaveStyle({ backgroundColor: '#000000' })
    })

    it('falls back to black when an image path is empty', () => {
        const { container } = render(
            <BackgroundRenderer background={{ type: 'image', value: '' }} />
        )

        expect(container.querySelector('img')).toBeNull()
        expect(container.firstElementChild).toHaveStyle({ backgroundColor: '#000000' })
    })

    it('falls back to black when a background image cannot load', () => {
        const { container } = render(
            <BackgroundRenderer background={{ type: 'image', value: '/missing.png' }} />
        )
        const image = container.querySelector('img')

        expect(image).not.toBeNull()
        fireEvent.error(image as HTMLImageElement)

        expect(container.querySelector('img')).toBeNull()
        expect(container.firstElementChild).toHaveStyle({ backgroundColor: '#000000' })
    })

    it('allows retrying a previously failed image after switching to another background', () => {
        const backgroundA = { type: 'image' as const, value: '/first.png' }
        const backgroundB = { type: 'image' as const, value: '/second.png' }
        const { container, rerender } = render(<BackgroundRenderer background={backgroundA} />)

        fireEvent.error(container.querySelector('img') as HTMLImageElement)
        expect(container.querySelector('img')).toBeNull()

        rerender(<BackgroundRenderer background={backgroundB} />)
        const secondImage = container.querySelector('img') as HTMLImageElement
        expect(secondImage).not.toBeNull()
        fireEvent.error(secondImage)
        expect(container.querySelector('img')).toBeNull()

        rerender(<BackgroundRenderer background={backgroundA} />)
        expect(container.querySelector('img')).toHaveAttribute(
            'src',
            new URL('first.png', new URL(import.meta.env.BASE_URL, document.baseURI)).href,
        )
    })
})

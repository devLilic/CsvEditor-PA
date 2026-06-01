import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BackgroundRenderer } from './BackgroundRenderer'

describe('BackgroundRenderer', () => {
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

        expect(image).toHaveAttribute('src', '/background.png')
        expect(image).toHaveStyle({ objectFit: 'contain' })
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
})

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NumericInputWithSlider } from './NumericInputWithSlider'

afterEach(() => {
    cleanup()
})

describe('NumericInputWithSlider', () => {
    it('keeps the compact numeric input and slider next to each other', () => {
        render(<NumericInputWithSlider label="Width" value={1920} onChange={vi.fn()} />)

        const input = screen.getByLabelText('Width')
        const slider = screen.getByLabelText('Width slider')

        expect(input).toHaveClass('w-[8ch]')
        expect(input.parentElement).toBe(slider.parentElement)
        expect(input.parentElement).toHaveClass('flex')
    })
})

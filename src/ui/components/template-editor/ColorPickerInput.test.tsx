import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorPickerInput } from './ColorPickerInput'

afterEach(() => {
    cleanup()
})

describe('ColorPickerInput', () => {
    it('updates the color through the visual picker', () => {
        const onChange = vi.fn()
        render(<ColorPickerInput label="Color" value="#000000" onChange={onChange} />)

        fireEvent.change(screen.getByLabelText('Color picker'), {
            target: { value: '#123456' },
        })

        expect(onChange).toHaveBeenCalledWith('#123456')
    })

    it('keeps non-hex text values editable and uses a safe picker swatch', () => {
        const onChange = vi.fn()
        render(<ColorPickerInput label="Fill" value="transparent" onChange={onChange} />)

        expect(screen.getByLabelText('Fill')).toHaveValue('transparent')
        expect(screen.getByLabelText('Fill picker')).toHaveValue('#000000')

        fireEvent.change(screen.getByLabelText('Fill'), {
            target: { value: '#ffffff' },
        })

        expect(onChange).toHaveBeenCalledWith('#ffffff')
    })
})

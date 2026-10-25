import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageFileSelector } from './ImageFileSelector'

describe('ImageFileSelector', () => {
    it('allows selecting the same image again for another template variant', async () => {
        const onChange = vi.fn()
        const image = new File(['png-data'], 'background.png', { type: 'image/png' })
        render(<ImageFileSelector label="Image path" value="" onChange={onChange} />)
        const input = screen.getByLabelText('Image path selector') as HTMLInputElement

        fireEvent.change(input, { target: { files: [image] } })
        await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
        expect(input.value).toBe('')

        fireEvent.change(input, { target: { files: [image] } })
        await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2))
        expect(onChange).toHaveBeenLastCalledWith(expect.stringMatching(/^data:image\/png;base64,/))
    })
})

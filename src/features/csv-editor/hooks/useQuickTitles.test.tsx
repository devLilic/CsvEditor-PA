import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { useQuickTitles } from './useQuickTitles'

function Harness() {
    const { quickTitles, setAllQuickTitles } = useQuickTitles()

    return (
        <div>
            <div data-testid="quick-titles">{quickTitles.join('|')}</div>
            <button onClick={() => setAllQuickTitles(['BREAKING', 'LIVE'])}>
                seed quick titles
            </button>
        </div>
    )
}

describe('useQuickTitles', () => {
    afterEach(() => {
        cleanup()
    })

    it('keeps quick titles available across remounts', async () => {
        const user = userEvent.setup()
        const api = (window as any).electronAPI
        api.getQuickTitles.mockResolvedValueOnce([])
        api.setQuickTitles.mockResolvedValue(undefined)

        const first = render(<Harness />)

        await user.click(screen.getByRole('button', { name: 'seed quick titles' }))
        expect(screen.getByTestId('quick-titles')).toHaveTextContent('BREAKING|LIVE')

        first.unmount()
        api.getQuickTitles.mockReturnValueOnce(new Promise(() => {}))

        render(<Harness />)

        expect(screen.getByTestId('quick-titles')).toHaveTextContent('BREAKING|LIVE')
    })
})

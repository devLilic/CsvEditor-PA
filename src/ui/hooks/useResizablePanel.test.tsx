import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useResizablePanel } from './useResizablePanel'

const DEFAULT_WIDTH = 700
const MIN_WIDTH = 420
const MAX_WIDTH = 1100

function ResizablePanelHarness({
    onResizeEnd,
}: {
    onResizeEnd?: (width: number) => void
}) {
    const {
        width,
        isResizing,
        setWidth,
        startResize,
        resetWidth,
    } = useResizablePanel({
        defaultWidth: DEFAULT_WIDTH,
        minWidth: MIN_WIDTH,
        maxWidth: MAX_WIDTH,
        onResizeEnd,
    })

    return (
        <div>
            <div data-testid="width">{width}</div>
            <div data-testid="is-resizing">{String(isResizing)}</div>
            <button onClick={() => setWidth(MIN_WIDTH - 100)}>set below min</button>
            <button onClick={() => setWidth(MAX_WIDTH + 100)}>set above max</button>
            <button onClick={resetWidth}>reset</button>
            <div
                role="separator"
                onPointerDown={startResize}
            />
        </div>
    )
}

describe('useResizablePanel', () => {
    afterEach(() => {
        cleanup()
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
    })

    it('starts with defaultWidth', () => {
        render(<ResizablePanelHarness />)

        expect(screen.getByTestId('width')).toHaveTextContent(String(DEFAULT_WIDTH))
    })

    it('does not allow width below minWidth', async () => {
        const user = userEvent.setup()
        render(<ResizablePanelHarness />)

        await user.click(screen.getByRole('button', { name: 'set below min' }))

        expect(screen.getByTestId('width')).toHaveTextContent(String(MIN_WIDTH))
    })

    it('does not allow width above maxWidth', async () => {
        const user = userEvent.setup()
        render(<ResizablePanelHarness />)

        await user.click(screen.getByRole('button', { name: 'set above max' }))

        expect(screen.getByTestId('width')).toHaveTextContent(String(MAX_WIDTH))
    })

    it('resetWidth returns to defaultWidth', async () => {
        const user = userEvent.setup()
        render(<ResizablePanelHarness />)

        await user.click(screen.getByRole('button', { name: 'set above max' }))
        await user.click(screen.getByRole('button', { name: 'reset' }))

        expect(screen.getByTestId('width')).toHaveTextContent(String(DEFAULT_WIDTH))
    })

    it('calls onResizeEnd at the end of resize', () => {
        const onResizeEnd = vi.fn()
        render(<ResizablePanelHarness onResizeEnd={onResizeEnd} />)

        act(() => {
            screen.getByRole('separator').dispatchEvent(
                new PointerEvent('pointerdown', {
                    bubbles: true,
                    clientX: 100,
                }),
            )
        })

        expect(screen.getByTestId('is-resizing')).toHaveTextContent('true')

        act(() => {
            window.dispatchEvent(
                new PointerEvent('pointermove', {
                    bubbles: true,
                    clientX: 250,
                }),
            )
        })

        expect(screen.getByTestId('width')).toHaveTextContent('850')

        act(() => {
            window.dispatchEvent(
                new PointerEvent('pointerup', {
                    bubbles: true,
                    clientX: 250,
                }),
            )
        })

        expect(screen.getByTestId('is-resizing')).toHaveTextContent('false')
        expect(onResizeEnd).toHaveBeenCalledWith(850)
    })
})

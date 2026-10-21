import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useResizablePanel } from './useResizablePanel'

const DEFAULT_WIDTH = 700
const MIN_WIDTH = 420
const MAX_WIDTH = 1100

function ResizablePanelHarness({
    onResizeEnd,
    axis,
    maxWidth = MAX_WIDTH,
}: {
    onResizeEnd?: (width: number) => void
    axis?: 'x' | 'y'
    maxWidth?: number
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
        maxWidth,
        axis,
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
                    clientY: 100,
                }),
            )
        })

        expect(screen.getByTestId('is-resizing')).toHaveTextContent('true')

        act(() => {
            window.dispatchEvent(
                new PointerEvent('pointermove', {
                    bubbles: true,
                    clientX: 250,
                    clientY: 250,
                }),
            )
        })

        expect(screen.getByTestId('width')).toHaveTextContent('850')

        act(() => {
            window.dispatchEvent(
                new PointerEvent('pointerup', {
                    bubbles: true,
                    clientX: 250,
                    clientY: 250,
                }),
            )
        })

        expect(screen.getByTestId('is-resizing')).toHaveTextContent('false')
        expect(onResizeEnd).toHaveBeenCalledWith(850)
    })

    it('uses vertical pointer movement for a horizontal splitter and clamps the result', () => {
        const onResizeEnd = vi.fn()
        render(<ResizablePanelHarness axis="y" onResizeEnd={onResizeEnd} />)

        act(() => {
            screen.getByRole('separator').dispatchEvent(new PointerEvent('pointerdown', {
                bubbles: true,
                clientX: 100,
                clientY: 300,
            }))
        })
        expect(document.body.style.cursor).toBe('row-resize')

        act(() => {
            window.dispatchEvent(new PointerEvent('pointermove', {
                bubbles: true,
                clientX: 100,
                clientY: 0,
            }))
        })
        expect(screen.getByTestId('width')).toHaveTextContent(String(MIN_WIDTH))

        act(() => {
            window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
        })
        expect(onResizeEnd).toHaveBeenCalledWith(MIN_WIDTH)
    })

    it('clamps resetWidth to a dynamic maximum', async () => {
        const user = userEvent.setup()
        const onResizeEnd = vi.fn()
        render(<ResizablePanelHarness axis="y" maxWidth={500} onResizeEnd={onResizeEnd} />)

        await user.click(screen.getByRole('button', { name: 'reset' }))

        expect(screen.getByTestId('width')).toHaveTextContent('500')
        expect(onResizeEnd).toHaveBeenCalledWith(500)
    })
})

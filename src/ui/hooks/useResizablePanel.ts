import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

type UseResizablePanelOptions = {
    defaultWidth: number
    minWidth: number
    maxWidth: number
    axis?: 'x' | 'y'
    onResizeEnd?: (width: number) => void
}

type UseResizablePanelResult = {
    width: number
    isResizing: boolean
    setWidth: (width: number) => void
    startResize: (event: ReactPointerEvent) => void
    resetWidth: () => void
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

export function useResizablePanel({
    defaultWidth,
    minWidth,
    maxWidth,
    axis = 'x',
    onResizeEnd,
}: UseResizablePanelOptions): UseResizablePanelResult {
    const [width, setWidthState] = useState(defaultWidth)
    const [isResizing, setIsResizing] = useState(false)
    const cleanupRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        return () => {
            cleanupRef.current?.()
        }
    }, [])

    useEffect(() => {
        setWidthState((currentWidth) => clamp(currentWidth, minWidth, maxWidth))
    }, [maxWidth, minWidth])

    const setWidth = useCallback(
        (nextWidth: number) => {
            setWidthState(clamp(nextWidth, minWidth, maxWidth))
        },
        [maxWidth, minWidth],
    )

    const resetWidth = useCallback(() => {
        const resetValue = clamp(defaultWidth, minWidth, maxWidth)
        setWidthState(resetValue)
        onResizeEnd?.(resetValue)
    }, [defaultWidth, maxWidth, minWidth, onResizeEnd])

    const startResize = useCallback(
        (event: ReactPointerEvent) => {
            event.preventDefault()
            cleanupRef.current?.()

            const startPosition = axis === 'x' ? event.clientX : event.clientY
            const startWidth = width
            let nextWidth = startWidth
            const previousCursor = document.body.style.cursor
            const previousUserSelect = document.body.style.userSelect

            setIsResizing(true)
            document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
            document.body.style.userSelect = 'none'

            const handlePointerMove = (moveEvent: PointerEvent) => {
                const nextPosition = axis === 'x' ? moveEvent.clientX : moveEvent.clientY
                const deltaX = nextPosition - startPosition
                nextWidth = clamp(
                    startWidth + deltaX,
                    minWidth,
                    maxWidth,
                )
                setWidthState(nextWidth)
            }

            const cleanup = () => {
                window.removeEventListener('pointermove', handlePointerMove)
                window.removeEventListener('pointerup', handlePointerEnd)
                window.removeEventListener('pointercancel', handlePointerEnd)
                document.body.style.cursor = previousCursor
                document.body.style.userSelect = previousUserSelect
                setIsResizing(false)
                cleanupRef.current = null
            }

            const handlePointerEnd = () => {
                cleanup()
                onResizeEnd?.(nextWidth)
            }

            cleanupRef.current = cleanup
            window.addEventListener('pointermove', handlePointerMove)
            window.addEventListener('pointerup', handlePointerEnd)
            window.addEventListener('pointercancel', handlePointerEnd)
        },
        [axis, maxWidth, minWidth, onResizeEnd, width],
    )

    return {
        width,
        isResizing,
        setWidth,
        startResize,
        resetWidth,
    }
}

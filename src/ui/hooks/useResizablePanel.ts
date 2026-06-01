import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

type UseResizablePanelOptions = {
    defaultWidth: number
    minWidth: number
    maxWidth: number
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

    const setWidth = useCallback(
        (nextWidth: number) => {
            setWidthState(clamp(nextWidth, minWidth, maxWidth))
        },
        [maxWidth, minWidth],
    )

    const resetWidth = useCallback(() => {
        setWidthState(defaultWidth)
        onResizeEnd?.(defaultWidth)
    }, [defaultWidth, onResizeEnd])

    const startResize = useCallback(
        (event: ReactPointerEvent) => {
            event.preventDefault()
            cleanupRef.current?.()

            const startX = event.clientX
            const startWidth = width
            let nextWidth = startWidth
            const previousCursor = document.body.style.cursor
            const previousUserSelect = document.body.style.userSelect

            setIsResizing(true)
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'

            const handlePointerMove = (moveEvent: PointerEvent) => {
                const deltaX = moveEvent.clientX - startX
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
        [maxWidth, minWidth, onResizeEnd, width],
    )

    return {
        width,
        isResizing,
        setWidth,
        startResize,
        resetWidth,
    }
}

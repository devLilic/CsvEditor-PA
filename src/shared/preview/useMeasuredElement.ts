import { useCallback, useLayoutEffect, useRef, useState } from 'react'

type ElementSize = {
    width: number
    height: number
}

const EMPTY_SIZE: ElementSize = {
    width: 0,
    height: 0,
}

function changedEnough(prev: ElementSize, next: ElementSize): boolean {
    return (
        Math.abs(prev.width - next.width) >= 0.5 ||
        Math.abs(prev.height - next.height) >= 0.5
    )
}

export function useMeasuredElement<T extends HTMLElement>() {
    const ref = useRef<T | null>(null)
    const [size, setSize] = useState<ElementSize>(EMPTY_SIZE)

    const updateSize = useCallback((next: ElementSize) => {
        setSize((prev) => (changedEnough(prev, next) ? next : prev))
    }, [])

    useLayoutEffect(() => {
        const element = ref.current
        if (!element) return

        const observer = new ResizeObserver(([entry]) => {
            if (!entry) return

            updateSize({
                width: entry.contentRect.width,
                height: entry.contentRect.height,
            })
        })

        observer.observe(element)

        return () => {
            observer.disconnect()
        }
    }, [updateSize])

    return { ref, size }
}

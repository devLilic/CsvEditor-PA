import { useEffect, useState } from 'react'
import type { BroadcastBackground } from '@/shared/preview/templateContract'

type BackgroundRendererProps = {
    background?: BroadcastBackground
}

export function BackgroundRenderer({ background }: BackgroundRendererProps) {
    const [hasImageError, setHasImageError] = useState(false)

    useEffect(() => {
        setHasImageError(false)
    }, [background])

    if (!background || (background.type === 'image' && (!background.value.trim() || hasImageError))) {
        return (
            <div
                aria-hidden="true"
                data-preview-background="fallback"
                className="absolute inset-0"
                style={{ backgroundColor: '#000000' }}
            />
        )
    }

    if (background.type === 'color') {
        return (
            <div
                aria-hidden="true"
                data-preview-background="color"
                className="absolute inset-0"
                style={{ backgroundColor: background.value || '#000000' }}
            />
        )
    }

    return (
        <img
            aria-hidden="true"
            data-preview-background="image"
            className="absolute inset-0 h-full w-full"
            src={background.value}
            onError={() => setHasImageError(true)}
            style={{ objectFit: background.objectFit ?? 'cover' }}
            alt=""
        />
    )
}

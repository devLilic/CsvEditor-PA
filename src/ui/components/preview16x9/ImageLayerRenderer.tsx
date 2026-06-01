import { useEffect, useMemo, useState } from 'react'
import { phoneImageService } from '@/features/csv-editor/services/phoneImageService'
import {
    isWorkPathResolvableImageRef,
    resolveWorkPathImageRef,
} from '@/features/csv-editor/domain/phoneImagePath'
import type { BroadcastImageLayer } from '@/shared/preview/templateContract'

type ImageLayerRendererProps = {
    layer: BroadcastImageLayer
    data?: Record<string, unknown>
    sampleData?: Record<string, unknown>
}

function valueFromDataToken(
    src: string,
    data?: Record<string, unknown>,
    sampleData?: Record<string, unknown>
): string {
    const match = src.match(/^\{([^}]+)\}$/)
    if (!match) return src

    const fieldId = match[1]
    const value = data?.[fieldId] ?? sampleData?.[fieldId]

    return typeof value === 'string' ? value : ''
}

export function resolveImageLayerSrc(
    src: string,
    workPath: string
): string {
    return resolveWorkPathImageRef(src, workPath)
}

export function ImageLayerRenderer({ layer, data, sampleData }: ImageLayerRendererProps) {
    const objectFit = layer.objectFit ?? 'contain'
    const rawSrc = useMemo(
        () => valueFromDataToken(layer.src, data, sampleData),
        [data, layer.src, sampleData]
    )
    const [resolvedSrc, setResolvedSrc] = useState(() => resolveImageLayerSrc(rawSrc, ''))

    useEffect(() => {
        let isMounted = true

        if (!isWorkPathResolvableImageRef(rawSrc)) {
            setResolvedSrc(rawSrc)
            return
        }

        phoneImageService.loadPhoneImageDataUrl({ imageRef: rawSrc })
            .then((response) => {
                if (isMounted) {
                    setResolvedSrc(response.ok ? response.dataUrl ?? '' : '')
                }
            })
            .catch(() => {
                if (isMounted) {
                    setResolvedSrc('')
                }
            })

        return () => {
            isMounted = false
        }
    }, [rawSrc])

    if (!resolvedSrc.trim()) {
        return (
            <div
                data-layer-id={layer.id}
                data-empty-image-layer="true"
                style={{
                    position: 'absolute',
                    left: layer.x,
                    top: layer.y,
                    width: layer.width,
                    height: layer.height,
                    opacity: layer.opacity,
                    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                    transformOrigin: layer.rotationOrigin ?? 'center center',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                }}
            />
        )
    }

    return (
        <img
            data-layer-id={layer.id}
            src={resolvedSrc}
            alt=""
            style={{
                position: 'absolute',
                left: layer.x,
                top: layer.y,
                width: layer.width,
                height: layer.height,
                opacity: layer.opacity,
                transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                transformOrigin: layer.rotationOrigin ?? 'center center',
                objectFit,
                display: 'block',
                overflow: 'hidden',
            }}
        />
    )
}

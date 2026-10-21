import { useEffect, useState } from 'react'
import type { BroadcastBackground } from '@/shared/preview/templateContract'

type BackgroundRendererProps = {
    background?: BroadcastBackground
}

export function resolvePublicBackgroundAsset(
    value: string,
    baseUrl: string,
    documentBaseUri: string,
): string {
    const relativePath = value
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/^\/+/, '')
        .replace(/^public\//i, '')
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')
    return new URL(relativePath, new URL(baseUrl, documentBaseUri)).href
}

function windowsPathToFileUrl(value: string): string {
    const normalized = value.replace(/\\/g, '/')
    if (normalized.startsWith('//')) {
        const [host, ...segments] = normalized.slice(2).split('/')
        return `file://${host}/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`
    }

    const [drive, ...segments] = normalized.split('/')
    return `file:///${drive}/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`
}

export function resolveBackgroundImageSrc(value: string): string {
    const source = value.trim()
    if (!source) return ''
    if (/^(?:data:|https?:|blob:|file:)/i.test(source)) return source
    if (/^[a-z]:[\\/]/i.test(source) || source.startsWith('\\\\')) {
        return windowsPathToFileUrl(source)
    }

    // Public asset references are app-relative in both Vite and packaged builds.
    return resolvePublicBackgroundAsset(source, import.meta.env.BASE_URL, document.baseURI)
}

export function BackgroundRenderer({ background }: BackgroundRendererProps) {
    const [errorSource, setErrorSource] = useState('')
    const backgroundValue = background?.type === 'image' ? background.value : ''
    const resolvedImageSrc = resolveBackgroundImageSrc(backgroundValue)

    useEffect(() => {
        setErrorSource('')
    }, [backgroundValue])

    if (!background || (background.type === 'image' && (!background.value.trim() || errorSource === resolvedImageSrc || !resolvedImageSrc))) {
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
            src={resolvedImageSrc}
            onError={() => setErrorSource(resolvedImageSrc)}
            style={{ objectFit: background.objectFit ?? 'cover' }}
            alt=""
        />
    )
}

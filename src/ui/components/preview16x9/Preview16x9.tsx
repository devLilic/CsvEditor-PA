import type { BroadcastTemplate } from '@/shared/preview/templateContract'
import type { LowerThirdTypeDefinition } from '@/features/lower-thirds/domain/lowerThirdTypes'
import type { BroadcastLayer, BroadcastShapeLayer, BroadcastTextLayer } from '@/shared/preview/templateContract'
import {
    calculatePreviewFrame,
    calculatePreviewFrameByWidth,
    sortVisibleLayers,
} from '@/shared/preview/previewMath'
import { useMeasuredElement } from '@/shared/preview/useMeasuredElement'
import { BackgroundRenderer } from './BackgroundRenderer'
import { LayerRenderer } from './LayerRenderer'

type Preview16x9Props = {
    template: BroadcastTemplate
    data?: Record<string, string>
    sampleData?: Record<string, string>
    fitMode?: 'contain' | 'width'
    maxHeight?: number
    className?: string
    /** The configured name identifies a selected lower-third variant for preview styling. */
    templateVariant?: string
    lowerThirdPalette?: LowerThirdTypeDefinition['palette']
}

export function Preview16x9({
    template,
    data,
    sampleData,
    fitMode = 'contain',
    maxHeight,
    className,
    templateVariant,
    lowerThirdPalette,
}: Preview16x9Props) {
    const { ref, size } = useMeasuredElement<HTMLDivElement>()
    const designWidth = template.canvas.width
    const designHeight = template.canvas.height
    const measuredWidth = size.width > 0 ? size.width : designWidth
    const measuredHeight = size.height > 0 ? size.height : designHeight
    const boundedHeight = maxHeight ? Math.min(measuredHeight, maxHeight) : measuredHeight

    const frame = fitMode === 'width'
        ? calculatePreviewFrameByWidth({
            designWidth,
            designHeight,
            width: measuredWidth,
        })
        : calculatePreviewFrame({
            designWidth,
            designHeight,
            containerWidth: measuredWidth,
            containerHeight: boundedHeight,
        })

    const visibleLayers = sortVisibleLayers(template.layers).filter((layer) => {
        if (!layer.visibleWhenField) return true

        const liveValue = data?.[layer.visibleWhenField]
        const sampleValue = sampleData?.[layer.visibleWhenField]
        const value = liveValue === undefined || liveValue === null || String(liveValue).trim() === ''
            ? sampleValue
            : liveValue

        return value !== undefined && value !== null && String(value).trim() !== ''
    }).map((layer): BroadcastLayer => {
        if (!templateVariant || !lowerThirdPalette) return layer
        if (layer.type === 'text') {
            return {
                ...layer,
                textStyle: { ...layer.textStyle, color: lowerThirdPalette.textColor },
            } satisfies BroadcastTextLayer
        }
        if (layer.type === 'shape' && layer.visible !== false) {
            return {
                ...layer,
                fill: { ...layer.fill, value: lowerThirdPalette.backgroundColor },
                opacity: lowerThirdPalette.opacity,
            } satisfies BroadcastShapeLayer
        }
        return layer
    })

    return (
        <div
            ref={ref}
            data-testid="preview16x9-root"
            className={className}
            style={{
                width: '100%',
                maxHeight,
                overflow: 'hidden',
            }}
        >
            <div
                data-preview-frame="true"
                style={{
                    position: 'relative',
                    width: frame.width,
                    height: frame.height,
                    marginInline: 'auto',
                    overflow: 'hidden',
                    backgroundColor: '#000000',
                }}
            >
                <div
                    data-design-canvas="true"
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: designWidth,
                        height: designHeight,
                        overflow: 'hidden',
                        transform: `scale(${frame.scale})`,
                        transformOrigin: 'top left',
                    }}
                >
                    <BackgroundRenderer
                        background={template.canvas.background}
                    />
                    {visibleLayers.map((layer) => (
                        <LayerRenderer
                            key={layer.id}
                            layer={layer}
                            data={data}
                            sampleData={sampleData}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

import type { BroadcastTemplate } from '@/shared/preview/templateContract'
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
}

export function Preview16x9({
    template,
    data,
    sampleData,
    fitMode = 'contain',
    maxHeight,
    className,
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

    const visibleLayers = sortVisibleLayers(template.layers)

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
                    <BackgroundRenderer background={template.canvas.background} />
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

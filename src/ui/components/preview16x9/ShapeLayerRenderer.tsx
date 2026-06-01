import type { BroadcastShapeLayer } from '@/shared/preview/templateContract'

type ShapeLayerRendererProps = {
    layer: BroadcastShapeLayer
}

export function ShapeLayerRenderer({ layer }: ShapeLayerRendererProps) {
    if (layer.shapeType !== 'rect') return null

    return (
        <div
            data-layer-id={layer.id}
            style={{
                position: 'absolute',
                left: layer.x,
                top: layer.y,
                width: layer.width,
                height: layer.height,
                opacity: layer.opacity,
                transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                transformOrigin: layer.rotationOrigin ?? 'center center',
                backgroundColor: layer.fill.value,
                borderRadius: layer.borderRadius ?? 0,
            }}
        />
    )
}

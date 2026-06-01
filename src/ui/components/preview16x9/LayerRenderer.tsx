import type { BroadcastLayer } from '@/shared/preview/templateContract'
import { ImageLayerRenderer } from './ImageLayerRenderer'
import { ShapeLayerRenderer } from './ShapeLayerRenderer'
import { TextLayerRenderer } from './TextLayerRenderer'

type LayerRendererProps = {
    layer: BroadcastLayer
    data?: Record<string, unknown>
    sampleData?: Record<string, unknown>
}

const layerRenderers = {
    text: TextLayerRenderer,
    image: ImageLayerRenderer,
    shape: ShapeLayerRenderer,
}

export function LayerRenderer({ layer, data, sampleData }: LayerRendererProps) {
    switch (layer.type) {
        case 'text':
            return <layerRenderers.text layer={layer} data={data} sampleData={sampleData} />
        case 'image':
            return <layerRenderers.image layer={layer} data={data} sampleData={sampleData} />
        case 'shape':
            return <layerRenderers.shape layer={layer} />
        default:
            return null
    }
}

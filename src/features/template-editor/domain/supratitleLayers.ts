import type { BroadcastLayer, BroadcastTemplate } from '@/shared/preview/templateContract'

export const SUPRATITLE_SHAPE_LAYER_ID = 'supratitle-config-shape'
export const SUPRATITLE_TEXT_LAYER_ID = 'supratitle-text'

export function hasTitlesSupratitleLayers(template: BroadcastTemplate): boolean {
    const layerIds = new Set(template.layers.map((layer) => layer.id))
    const mainTitle = template.layers.find((layer) => layer.id === 'title-main-text')
    const mainTitleIsSentenceCase = mainTitle?.type !== 'text'
        || (mainTitle.textStyle.transform !== 'uppercase' && mainTitle.fallbackText !== 'TITLU')
    return layerIds.has(SUPRATITLE_SHAPE_LAYER_ID)
        && layerIds.has(SUPRATITLE_TEXT_LAYER_ID)
        && mainTitleIsSentenceCase
}

function createSupratitleLayers(template: BroadcastTemplate): BroadcastLayer[] {
    const mainTitle = template.layers.find((layer) => layer.id === 'title-main-text')
    const x = mainTitle?.x ?? 102
    const y = (mainTitle?.y ?? 877) - 56
    const width = mainTitle?.width ?? 1401

    return [
        {
            id: SUPRATITLE_SHAPE_LAYER_ID,
            type: 'shape',
            shapeType: 'rect',
            x: x - 3,
            y,
            width: width + 4,
            height: 48,
            zIndex: 64,
            visibleWhenField: 'supratitle',
            fill: {
                type: 'solid',
                value: '#333333',
            },
        },
        {
            id: SUPRATITLE_TEXT_LAYER_ID,
            type: 'text',
            x,
            y: y + 5,
            width,
            height: 38,
            zIndex: 66,
            fieldId: 'supratitle',
            inputLabel: 'Supratitlu',
            fallbackText: 'SUPRATITLU',
            visibleWhenField: 'supratitle',
            fitInBox: true,
            fitMode: 'scaleX',
            minScaleX: 1,
            textStyle: {
                fontFamily: 'inherit',
                fontSize: 32,
                fontWeight: 700,
                color: '#f0f0f0',
                align: 'left',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                transform: 'uppercase',
            },
        },
    ]
}

/** Add the built-in title supratitle pair to older templates without changing saved layers. */
export function ensureTitlesSupratitleLayers(template: BroadcastTemplate): BroadcastTemplate {
    const layerIds = new Set(template.layers.map((layer) => layer.id))
    const defaults = createSupratitleLayers(template)
    const missingLayers = defaults.filter((layer) => !layerIds.has(layer.id))
    const mainTitle = template.layers.find((layer) => layer.id === 'title-main-text')
    const mainTitleNeedsSentenceCase = mainTitle?.type === 'text'
        && (mainTitle.textStyle.transform === 'uppercase' || mainTitle.fallbackText === 'TITLU')

    if (missingLayers.length === 0 && !mainTitleNeedsSentenceCase) return template

    const layers = template.layers.map((layer) => {
        if (layer.id !== 'title-main-text' || layer.type !== 'text' || !mainTitleNeedsSentenceCase) return layer
        const { transform: _transform, ...textStyle } = layer.textStyle
        return {
            ...layer,
            fallbackText: layer.fallbackText === 'TITLU' ? 'Titlu' : layer.fallbackText,
            textStyle,
        }
    })

    return {
        ...template,
        layers: [...layers, ...missingLayers],
    }
}

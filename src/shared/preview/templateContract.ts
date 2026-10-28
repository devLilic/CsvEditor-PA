export type BroadcastTemplate = {
    id: string
    name: string
    canvas: {
        width: number
        height: number
        background: BroadcastBackground
    }
    inputOrder?: string[]
    layers: BroadcastLayer[]
}

export type BroadcastBackground =
    | { type: 'color'; value: string }
    | { type: 'image'; value: string; objectFit?: 'contain' | 'cover' | 'fill' }

export type BaseLayer = {
    id: string
    type: string
    x: number
    y: number
    width: number
    height: number
    zIndex: number
    visible?: boolean
    /** Render this layer only when the named data or sample-data field has content. */
    visibleWhenField?: string
    opacity?: number
    rotation?: number
    rotationOrigin?:
        | 'top left'
        | 'top center'
        | 'top right'
        | 'center left'
        | 'center center'
        | 'center right'
        | 'bottom left'
        | 'bottom center'
        | 'bottom right'
}

export type BroadcastTextLayer = BaseLayer & {
    type: 'text'
    fieldId: string
    /** When present, this bound field is editable on the entity form with this label. */
    inputLabel?: string
    textParts?: Array<{
        fieldId: string
        prefix?: string
        fieldDefaultValue?: string
        fallbackText?: string
        transform?: 'uppercase'
    }>
    fallbackText?: string
    fieldDefaultValue?: string
    fitInBox?: boolean
    fitMode?: 'scaleX'
    minScaleX?: number
    border?: {
        color: string
        width?: number
        style?: 'solid' | 'dashed' | 'dotted'
    }
    textStyle: {
        fontFamily: string
        fontSize: number
        fontWeight: number
        color: string
        align: 'left' | 'center' | 'right'
        lineHeight?: number
        letterSpacing?: string
        transform?: 'uppercase'
    }
}

export type BroadcastImageLayer = BaseLayer & {
    type: 'image'
    src: string
    objectFit?: 'contain' | 'cover' | 'fill'
}

export type BroadcastShapeLayer = BaseLayer & {
    type: 'shape'
    shapeType: 'rect'
    fill: {
        type: 'solid'
        value: string
    }
    borderRadius?: number
}

export type BroadcastLayer =
    | BroadcastTextLayer
    | BroadcastImageLayer
    | BroadcastShapeLayer

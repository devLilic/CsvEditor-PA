export type BroadcastTemplate = {
    id: string
    name: string
    canvas: {
        width: number
        height: number
        background: BroadcastBackground
    }
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

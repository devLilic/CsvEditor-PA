type PreviewFrameInput = {
    designWidth: number
    designHeight: number
    containerWidth: number
    containerHeight: number
}

type PreviewFrameByWidthInput = {
    designWidth: number
    designHeight: number
    width: number
}

type PreviewFrame = {
    width: number
    height: number
    scale: number
}

type TextScaleInput = {
    textWidth: number
    boxWidth: number
    fitPaddingPx?: number
}

type ResolveLayerTextInput = {
    fieldId?: string
    data?: Record<string, unknown>
    sampleData?: Record<string, unknown>
    fieldDefaultValue?: unknown
    fallbackText?: unknown
}

type SortableLayer = {
    visible?: boolean
    zIndex: number
}

function valueToText(value: unknown): string {
    if (value === null || value === undefined) return ''
    return String(value)
}

function hasTextValue(value: unknown): boolean {
    return valueToText(value).trim() !== ''
}

export function calculatePreviewFrame(input: PreviewFrameInput): PreviewFrame {
    const scaleX = input.containerWidth / input.designWidth
    const scaleY = input.containerHeight / input.designHeight
    const scale = Math.min(scaleX, scaleY)

    return {
        width: input.designWidth * scale,
        height: input.designHeight * scale,
        scale,
    }
}

export function calculatePreviewFrameByWidth(input: PreviewFrameByWidthInput): PreviewFrame {
    const scale = input.width / input.designWidth

    return {
        width: input.width,
        height: input.designHeight * scale,
        scale,
    }
}

export function calculateTextScale(input: TextScaleInput): number {
    const availableBoxWidth = Math.max(0, input.boxWidth - (input.fitPaddingPx ?? 0))

    if (input.textWidth <= 0 || input.boxWidth <= 0) return 1
    if (input.textWidth <= availableBoxWidth) return 1

    return availableBoxWidth / input.textWidth
}

export function resolveLayerText(input: ResolveLayerTextInput): string {
    const fieldId = input.fieldId

    if (fieldId && hasTextValue(input.data?.[fieldId])) {
        return valueToText(input.data?.[fieldId])
    }

    if (fieldId && hasTextValue(input.sampleData?.[fieldId])) {
        return valueToText(input.sampleData?.[fieldId])
    }

    if (hasTextValue(input.fieldDefaultValue)) {
        return valueToText(input.fieldDefaultValue)
    }

    if (hasTextValue(input.fallbackText)) {
        return valueToText(input.fallbackText)
    }

    return ''
}

export function sortVisibleLayers<TLayer extends SortableLayer>(layers: TLayer[]): TLayer[] {
    return layers
        .filter((layer) => layer.visible !== false)
        .sort((a, b) => a.zIndex - b.zIndex)
}

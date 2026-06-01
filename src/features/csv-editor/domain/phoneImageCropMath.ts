export type ImageSize = {
    width: number
    height: number
}

export type FrameSize = {
    width: number
    height: number
}

export type ImageTransform = {
    x: number
    y: number
    scale: number
}

export type RenderedImageRect = {
    x: number
    y: number
    width: number
    height: number
}

export type SourceCropRect = {
    sx: number
    sy: number
    sWidth: number
    sHeight: number
}

function isPositiveFinite(value: number): boolean {
    return Number.isFinite(value) && value > 0
}

function safeDimension(value: number): number {
    return isPositiveFinite(value) ? value : 1
}

function safeTransform(transform: ImageTransform): ImageTransform {
    return {
        x: Number.isFinite(transform.x) ? transform.x : 0,
        y: Number.isFinite(transform.y) ? transform.y : 0,
        scale: isPositiveFinite(transform.scale) ? transform.scale : 1,
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

export function getAspectRatio(size: FrameSize): number {
    if (!isPositiveFinite(size.width) || !isPositiveFinite(size.height)) {
        return 1
    }

    return size.width / size.height
}

export function calculateInitialCoverTransform(input: {
    imageSize: ImageSize
    frameSize: FrameSize
}): ImageTransform {
    const imageWidth = safeDimension(input.imageSize.width)
    const imageHeight = safeDimension(input.imageSize.height)
    const frameWidth = safeDimension(input.frameSize.width)
    const frameHeight = safeDimension(input.frameSize.height)
    const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight)
    const renderedWidth = imageWidth * scale
    const renderedHeight = imageHeight * scale

    return {
        x: (frameWidth - renderedWidth) / 2,
        y: (frameHeight - renderedHeight) / 2,
        scale,
    }
}

export function calculateRenderedImageRect(input: {
    imageSize: ImageSize
    transform: ImageTransform
}): RenderedImageRect {
    const imageWidth = safeDimension(input.imageSize.width)
    const imageHeight = safeDimension(input.imageSize.height)
    const transform = safeTransform(input.transform)

    return {
        x: transform.x,
        y: transform.y,
        width: imageWidth * transform.scale,
        height: imageHeight * transform.scale,
    }
}

export function clampImageTransformToFrame(input: {
    imageSize: ImageSize
    frameSize: FrameSize
    transform: ImageTransform
}): ImageTransform {
    const imageWidth = safeDimension(input.imageSize.width)
    const imageHeight = safeDimension(input.imageSize.height)
    const frameWidth = safeDimension(input.frameSize.width)
    const frameHeight = safeDimension(input.frameSize.height)
    const minScale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight)
    const transform = safeTransform(input.transform)
    const scale = Math.max(transform.scale, minScale)
    const renderedWidth = imageWidth * scale
    const renderedHeight = imageHeight * scale

    const x = renderedWidth <= frameWidth
        ? (frameWidth - renderedWidth) / 2
        : clamp(transform.x, frameWidth - renderedWidth, 0)
    const y = renderedHeight <= frameHeight
        ? (frameHeight - renderedHeight) / 2
        : clamp(transform.y, frameHeight - renderedHeight, 0)

    return { x, y, scale }
}

export function calculateSourceCropRect(input: {
    imageSize: ImageSize
    frameSize: FrameSize
    transform: ImageTransform
}): SourceCropRect {
    const imageWidth = safeDimension(input.imageSize.width)
    const imageHeight = safeDimension(input.imageSize.height)
    const frameWidth = safeDimension(input.frameSize.width)
    const frameHeight = safeDimension(input.frameSize.height)
    const transform = clampImageTransformToFrame({
        imageSize: { width: imageWidth, height: imageHeight },
        frameSize: { width: frameWidth, height: frameHeight },
        transform: input.transform,
    })

    const rawSx = -transform.x / transform.scale
    const rawSy = -transform.y / transform.scale
    const rawWidth = frameWidth / transform.scale
    const rawHeight = frameHeight / transform.scale

    const sx = clamp(rawSx, 0, imageWidth)
    const sy = clamp(rawSy, 0, imageHeight)
    const sWidth = Math.min(rawWidth, imageWidth - sx)
    const sHeight = Math.min(rawHeight, imageHeight - sy)

    return {
        sx,
        sy,
        sWidth: Math.max(1, sWidth),
        sHeight: Math.max(1, sHeight),
    }
}

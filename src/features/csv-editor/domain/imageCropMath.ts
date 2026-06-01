export type CropBox = {
    x: number
    y: number
    width: number
    height: number
}

function isPositiveFiniteNumber(value: number): boolean {
    return Number.isFinite(value) && value > 0
}

function safePositive(value: number): number {
    return isPositiveFiniteNumber(value) ? value : 1
}

export function getAspectRatio(width: number, height: number): number {
    if (!isPositiveFiniteNumber(width) || !isPositiveFiniteNumber(height)) {
        return 1
    }

    return width / height
}

export function calculateCenteredCropBox(
    imageWidth: number,
    imageHeight: number,
    targetAspectRatio: number
): CropBox {
    const safeImageWidth = safePositive(imageWidth)
    const safeImageHeight = safePositive(imageHeight)
    const safeTargetAspectRatio = safePositive(targetAspectRatio)
    const imageAspectRatio = getAspectRatio(safeImageWidth, safeImageHeight)

    let width = safeImageWidth
    let height = safeImageHeight

    if (imageAspectRatio > safeTargetAspectRatio) {
        width = safeImageHeight * safeTargetAspectRatio
    } else if (imageAspectRatio < safeTargetAspectRatio) {
        height = safeImageWidth / safeTargetAspectRatio
    }

    return clampCropBoxToImage({
        x: (safeImageWidth - width) / 2,
        y: (safeImageHeight - height) / 2,
        width,
        height,
    }, safeImageWidth, safeImageHeight)
}

export function clampCropBoxToImage(
    cropBox: CropBox,
    imageWidth: number,
    imageHeight: number
): CropBox {
    const safeImageWidth = safePositive(imageWidth)
    const safeImageHeight = safePositive(imageHeight)
    const width = Math.min(safePositive(cropBox.width), safeImageWidth)
    const height = Math.min(safePositive(cropBox.height), safeImageHeight)
    const maxX = Math.max(0, safeImageWidth - width)
    const maxY = Math.max(0, safeImageHeight - height)

    return {
        x: Math.min(Math.max(Number.isFinite(cropBox.x) ? cropBox.x : 0, 0), maxX),
        y: Math.min(Math.max(Number.isFinite(cropBox.y) ? cropBox.y : 0, 0), maxY),
        width,
        height,
    }
}

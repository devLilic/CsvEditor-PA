import { describe, expect, it } from 'vitest'
import {
    calculateInitialCoverTransform,
    calculateRenderedImageRect,
    calculateSourceCropRect,
    clampImageTransformToFrame,
    getAspectRatio,
} from './phoneImageCropMath'

describe('phoneImageCropMath', () => {
    it('returns aspect ratio for 420x540', () => {
        expect(getAspectRatio({ width: 420, height: 540 })).toBeCloseTo(420 / 540)
    })

    it('initial cover transform scales image so the frame is fully covered', () => {
        const transform = calculateInitialCoverTransform({
            imageSize: { width: 1000, height: 500 },
            frameSize: { width: 420, height: 540 },
        })
        const rect = calculateRenderedImageRect({
            imageSize: { width: 1000, height: 500 },
            transform,
        })

        expect(rect.width).toBeGreaterThanOrEqual(420)
        expect(rect.height).toBeGreaterThanOrEqual(540)
    })

    it('centers a landscape image in the fixed frame', () => {
        const transform = calculateInitialCoverTransform({
            imageSize: { width: 1000, height: 500 },
            frameSize: { width: 420, height: 540 },
        })

        expect(transform.scale).toBeCloseTo(540 / 500)
        expect(transform.x).toBeCloseTo((420 - 1000 * transform.scale) / 2)
        expect(transform.y).toBeCloseTo(0)
    })

    it('centers a portrait image in the fixed frame', () => {
        const transform = calculateInitialCoverTransform({
            imageSize: { width: 500, height: 1000 },
            frameSize: { width: 420, height: 540 },
        })

        expect(transform.scale).toBeCloseTo(420 / 500)
        expect(transform.x).toBeCloseTo(0)
        expect(transform.y).toBeCloseTo((540 - 1000 * transform.scale) / 2)
    })

    it('clamps transform so the fixed frame has no empty space', () => {
        const clamped = clampImageTransformToFrame({
            imageSize: { width: 1000, height: 500 },
            frameSize: { width: 420, height: 540 },
            transform: { x: 120, y: -200, scale: 1.2 },
        })
        const rect = calculateRenderedImageRect({
            imageSize: { width: 1000, height: 500 },
            transform: clamped,
        })

        expect(rect.x).toBeLessThanOrEqual(0)
        expect(rect.y).toBeLessThanOrEqual(0)
        expect(rect.x + rect.width).toBeGreaterThanOrEqual(420)
        expect(rect.y + rect.height).toBeGreaterThanOrEqual(540)
    })

    it('calculates source crop rect corresponding to the fixed frame', () => {
        const crop = calculateSourceCropRect({
            imageSize: { width: 1000, height: 500 },
            frameSize: { width: 420, height: 540 },
            transform: { x: -330, y: 0, scale: 1.08 },
        })

        expect(crop).toEqual({
            sx: 330 / 1.08,
            sy: 0,
            sWidth: 420 / 1.08,
            sHeight: 540 / 1.08,
        })
    })

    it('source crop rect does not produce negative values', () => {
        const crop = calculateSourceCropRect({
            imageSize: { width: 1000, height: 500 },
            frameSize: { width: 420, height: 540 },
            transform: { x: 100, y: 100, scale: 1 },
        })

        expect(crop.sx).toBeGreaterThanOrEqual(0)
        expect(crop.sy).toBeGreaterThanOrEqual(0)
    })

    it('source crop rect does not exceed original image dimensions', () => {
        const imageSize = { width: 1000, height: 500 }
        const crop = calculateSourceCropRect({
            imageSize,
            frameSize: { width: 420, height: 540 },
            transform: { x: -900, y: -400, scale: 1 },
        })

        expect(crop.sx + crop.sWidth).toBeLessThanOrEqual(imageSize.width)
        expect(crop.sy + crop.sHeight).toBeLessThanOrEqual(imageSize.height)
    })

    it('uses safe fallback for invalid values', () => {
        expect(getAspectRatio({ width: 0, height: -1 })).toBe(1)
        expect(calculateInitialCoverTransform({
            imageSize: { width: 0, height: 0 },
            frameSize: { width: 0, height: 0 },
        })).toEqual({ x: 0, y: 0, scale: 1 })
        expect(calculateSourceCropRect({
            imageSize: { width: 0, height: 0 },
            frameSize: { width: 0, height: 0 },
            transform: { x: Number.NaN, y: Number.NaN, scale: 0 },
        })).toEqual({ sx: 0, sy: 0, sWidth: 1, sHeight: 1 })
    })
})

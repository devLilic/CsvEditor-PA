import { describe, expect, it } from 'vitest'
import {
    calculateCenteredCropBox,
    clampCropBoxToImage,
    getAspectRatio,
} from './imageCropMath'

describe('imageCropMath', () => {
    it('calculates aspect ratio for 420x540', () => {
        expect(getAspectRatio(420, 540)).toBeCloseTo(420 / 540)
    })

    it('calculates centered crop box for landscape image', () => {
        expect(calculateCenteredCropBox(1000, 500, 1)).toEqual({
            x: 250,
            y: 0,
            width: 500,
            height: 500,
        })
    })

    it('calculates centered crop box for portrait image', () => {
        expect(calculateCenteredCropBox(500, 1000, 1)).toEqual({
            x: 0,
            y: 250,
            width: 500,
            height: 500,
        })
    })

    it('clamps crop box so it does not exceed image bounds', () => {
        expect(clampCropBoxToImage(
            { x: -10, y: 80, width: 200, height: 50 },
            100,
            100
        )).toEqual({
            x: 0,
            y: 50,
            width: 100,
            height: 50,
        })
    })

    it('returns safe crop for invalid image values', () => {
        expect(calculateCenteredCropBox(0, -10, 1)).toEqual({
            x: 0,
            y: 0,
            width: 1,
            height: 1,
        })
    })

    it('returns safe aspect ratio for invalid values', () => {
        expect(getAspectRatio(0, 540)).toBe(1)
        expect(getAspectRatio(420, 0)).toBe(1)
    })
})

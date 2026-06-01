import { describe, expect, it } from 'vitest'
import {
    calculatePreviewFrame,
    calculatePreviewFrameByWidth,
    calculateTextScale,
    resolveLayerText,
    sortVisibleLayers,
} from './previewMath'

describe('previewMath - frame calculations', () => {
    it('calculatePreviewFrame fits 1920x1080 into 960x500 with uniform scale', () => {
        const frame = calculatePreviewFrame({
            designWidth: 1920,
            designHeight: 1080,
            containerWidth: 960,
            containerHeight: 500,
        })

        expect(frame.scale).toBeCloseTo(0.462, 2)
        expect(frame.width).toBeCloseTo(889, 0)
        expect(frame.height).toBeCloseTo(500, 0)
    })

    it('calculatePreviewFrame uses one uniform scale for width and height', () => {
        const frame = calculatePreviewFrame({
            designWidth: 1920,
            designHeight: 1080,
            containerWidth: 960,
            containerHeight: 500,
        })

        expect(frame.width / 1920).toBeCloseTo(frame.scale)
        expect(frame.height / 1080).toBeCloseTo(frame.scale)
    })

    it('calculatePreviewFrameByWidth returns a 16:9 frame for width 960', () => {
        const frame = calculatePreviewFrameByWidth({
            designWidth: 1920,
            designHeight: 1080,
            width: 960,
        })

        expect(frame.width).toBe(960)
        expect(frame.height).toBe(540)
        expect(frame.scale).toBe(0.5)
    })
})

describe('previewMath - text scale', () => {
    it('calculateTextScale returns 1 when text fits', () => {
        expect(calculateTextScale({ textWidth: 300, boxWidth: 500 })).toBe(1)
    })

    it('calculateTextScale shrinks text when it does not fit', () => {
        expect(calculateTextScale({ textWidth: 1000, boxWidth: 500 })).toBe(0.5)
    })

    it('calculateTextScale keeps shrinking for very long text without a character-length floor', () => {
        expect(calculateTextScale({ textWidth: 5000, boxWidth: 500 })).toBe(0.1)
    })

    it('calculateTextScale can reserve padding so scaled text does not touch the box edge', () => {
        expect(
            calculateTextScale({
                textWidth: 1000,
                boxWidth: 500,
                fitPaddingPx: 8,
            })
        ).toBe(0.492)
    })
})

describe('previewMath - text resolution', () => {
    it('resolveLayerText uses data[fieldId] before fallback', () => {
        const text = resolveLayerText({
            fieldId: 'title',
            data: { title: 'Live title' },
            sampleData: { title: 'Sample title' },
            fieldDefaultValue: 'Default title',
            fallbackText: 'Fallback title',
        })

        expect(text).toBe('Live title')
    })

    it('resolveLayerText uses sampleData[fieldId] when data has no value', () => {
        const text = resolveLayerText({
            fieldId: 'title',
            data: {},
            sampleData: { title: 'Sample title' },
            fieldDefaultValue: 'Default title',
            fallbackText: 'Fallback title',
        })

        expect(text).toBe('Sample title')
    })

    it('resolveLayerText uses fieldDefaultValue', () => {
        const text = resolveLayerText({
            fieldId: 'title',
            data: {},
            sampleData: {},
            fieldDefaultValue: 'Default title',
            fallbackText: 'Fallback title',
        })

        expect(text).toBe('Default title')
    })

    it('resolveLayerText uses fallbackText', () => {
        const text = resolveLayerText({
            fieldId: 'title',
            data: {},
            sampleData: {},
            fallbackText: 'Fallback title',
        })

        expect(text).toBe('Fallback title')
    })

    it('resolveLayerText returns an empty string when nothing exists', () => {
        const text = resolveLayerText({
            fieldId: 'title',
            data: {},
            sampleData: {},
        })

        expect(text).toBe('')
    })
})

describe('previewMath - layer sorting', () => {
    it('sortVisibleLayers excludes visible === false', () => {
        const layers = sortVisibleLayers([
            { id: 'visible', visible: true, zIndex: 1 },
            { id: 'hidden', visible: false, zIndex: 2 },
            { id: 'implicit-visible', zIndex: 3 },
        ])

        expect(layers.map((layer) => layer.id)).toEqual(['visible', 'implicit-visible'])
    })

    it('sortVisibleLayers sorts by zIndex', () => {
        const layers = sortVisibleLayers([
            { id: 'top', visible: true, zIndex: 30 },
            { id: 'bottom', visible: true, zIndex: 10 },
            { id: 'middle', visible: true, zIndex: 20 },
        ])

        expect(layers.map((layer) => layer.id)).toEqual(['bottom', 'middle', 'top'])
    })
})

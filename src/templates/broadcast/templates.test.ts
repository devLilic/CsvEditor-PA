import { describe, expect, it } from 'vitest'
import { broadcastTemplates } from './templates'

const allowedLayerTypes = ['text', 'image', 'shape']
const registry = broadcastTemplates as Record<string, unknown>

describe('broadcastTemplates', () => {
    const templates = Object.values(broadcastTemplates)

    it('has at least one template', () => {
        expect(templates.length).toBeGreaterThan(0)
    })

    it('exposes only the current static template registry keys', () => {
        expect(broadcastTemplates.titles).toBeDefined()
        expect(broadcastTemplates.persons).toBeDefined()
        expect(broadcastTemplates.locations).toBeDefined()
        expect(broadcastTemplates.phoneCalls).toBeDefined()
        expect(registry.hotTitles).toBeUndefined()
        expect(registry.waitTitles).toBeUndefined()
        expect(registry.waitLocations).toBeUndefined()
        expect(Object.keys(broadcastTemplates)).toEqual(['titles', 'persons', 'locations', 'phoneCalls'])
    })

    it('each template has a valid minimal contract', () => {
        for (const template of templates) {
            expect(template.id).toBeTruthy()
            expect(template.canvas.width).toBe(1920)
            expect(template.canvas.height).toBe(1080)
            expect(template.canvas.width / template.canvas.height).toBeCloseTo(16 / 9)

            for (const layer of template.layers) {
                expect(layer.id).toBeTruthy()
                expect(typeof layer.zIndex).toBe('number')
                expect(allowedLayerTypes).toContain(layer.type)
            }
        }
    })

    it('exports a static title template for the current broadcast scope', () => {
        const template = broadcastTemplates.titles

        expect(template.id).toBe('title')
        expect(template.canvas.width).toBe(1920)
        expect(template.canvas.height).toBe(1080)
        expect(['color', 'image']).toContain(template.canvas.background.type)
        expect(template.layers.some((layer) => layer.type === 'shape')).toBe(true)
        expect(
            template.layers.some((layer) => layer.type === 'text' && layer.fieldId === 'title')
        ).toBe(true)
        expect(template.id).not.toMatch(/hot|wait/i)
        expect(template.layers.map((layer) => layer.id).join(' ')).not.toMatch(/hot|wait/i)
    })

    it('exports a static person template for name and occupation', () => {
        const template = broadcastTemplates.persons
        const textLayers = template.layers.filter((layer) => layer.type === 'text')

        expect(template.id).toBe('person')
        expect(template.canvas.width).toBe(1920)
        expect(template.canvas.height).toBe(1080)
        expect(['color', 'image']).toContain(template.canvas.background.type)
        expect(template.layers.filter((layer) => layer.type === 'shape').length).toBeGreaterThanOrEqual(2)
        expect(textLayers.some((layer) => layer.fieldId === 'name')).toBe(true)
        expect(textLayers.some((layer) => layer.fieldId === 'occupation')).toBe(true)

        const nameLayer = textLayers.find((layer) => layer.fieldId === 'name')
        const occupationLayer = textLayers.find((layer) => layer.fieldId === 'occupation')

        expect(nameLayer?.textStyle.transform).toBe('uppercase')
        expect(occupationLayer?.textStyle.transform).toBeUndefined()
        expect(template.id).not.toMatch(/hot|wait/i)
        expect(template.layers.map((layer) => layer.id).join(' ')).not.toMatch(/hot|wait/i)
    })

    it('exports a static location template for the current broadcast scope', () => {
        const template = broadcastTemplates.locations
        const locationLayer = template.layers.find(
            (layer) => layer.type === 'text' && layer.fieldId === 'location'
        )

        expect(template.id).toBe('location')
        expect(template.canvas.width).toBe(1920)
        expect(template.canvas.height).toBe(1080)
        expect(['color', 'image']).toContain(template.canvas.background.type)
        expect(template.layers.some((layer) => layer.type === 'shape')).toBe(true)
        expect(locationLayer).toBeDefined()
        expect(locationLayer?.x).toBeGreaterThanOrEqual(0)
        expect(locationLayer?.y).toBeGreaterThanOrEqual(0)
        expect(locationLayer?.width).toBeGreaterThan(0)
        expect(locationLayer?.height).toBeGreaterThan(0)
        expect(template.id).not.toMatch(/hot|wait/i)
        expect(template.layers.map((layer) => layer.id).join(' ')).not.toMatch(/hot|wait/i)
    })

    it('exports a static phone call template with an image layer and 16:9 canvas', () => {
        const template = broadcastTemplates.phoneCalls
        const imageLayers = template.layers.filter((layer) => layer.type === 'image')

        expect(template).toBeDefined()
        expect(template.canvas.width).toBe(1920)
        expect(template.canvas.height).toBe(1080)
        expect(template.canvas.width / template.canvas.height).toBeCloseTo(16 / 9)
        expect(imageLayers.length).toBeGreaterThanOrEqual(1)
        expect(imageLayers.some((layer) => layer.x < template.canvas.width / 2)).toBe(true)
    })
})

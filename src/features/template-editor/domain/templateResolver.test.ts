import { describe, expect, it } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import {
    createTemplateDocumentFromTemplates,
    type TemplateDocument,
    type TemplateDocumentTemplates,
} from './templateDocument'
import { resolveTemplateDocument } from './templateResolver'
import {
    ensureTitlesSupratitleLayers,
    hasTitlesSupratitleLayers,
    SUPRATITLE_SHAPE_LAYER_ID,
    SUPRATITLE_TEXT_LAYER_ID,
} from './supratitleLayers'

const requiredTemplateKeys = ['titles', 'persons', 'locations', 'phoneCalls', 'hotTitles', 'waitTitles', 'waitLocations']

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

function createTemplates(prefix: string): TemplateDocumentTemplates {
    const templates = clone(broadcastTemplates)

    return {
        titles: { ...templates.titles, id: `${prefix}-titles` },
        persons: { ...templates.persons, id: `${prefix}-persons` },
        locations: { ...templates.locations, id: `${prefix}-locations` },
        phoneCalls: { ...templates.phoneCalls, id: `${prefix}-phoneCalls` },
        hotTitles: { ...templates.hotTitles, id: `${prefix}-hotTitles` },
        waitTitles: { ...templates.waitTitles, id: `${prefix}-waitTitles` },
        waitLocations: { ...templates.waitLocations, id: `${prefix}-waitLocations` },
    }
}

function createDocument(prefix: string): TemplateDocument {
    return createTemplateDocumentFromTemplates(createTemplates(prefix))
}

describe('templateResolver', () => {
    it('uses the user document when it is valid', () => {
        const userDocument = createDocument('user')
        const bundledDefaultDocument = createDocument('bundled')
        const hardcodedDocument = createDocument('hardcoded')

        const result = resolveTemplateDocument({
            userDocument,
            bundledDefaultDocument,
            hardcodedDocument,
        })

        expect(result.templates).toEqual({
            ...userDocument.templates,
            titles: ensureTitlesSupratitleLayers(userDocument.templates.titles),
        })
    })

    it('uses the bundled default when the user document is missing', () => {
        const bundledDefaultDocument = createDocument('bundled')
        const hardcodedDocument = createDocument('hardcoded')

        const result = resolveTemplateDocument({
            bundledDefaultDocument,
            hardcodedDocument,
        })

        expect(result.templates).toEqual({
            ...bundledDefaultDocument.templates,
            titles: ensureTitlesSupratitleLayers(bundledDefaultDocument.templates.titles),
        })
    })

    it('uses the bundled default when the user document is invalid', () => {
        const bundledDefaultDocument = createDocument('bundled')
        const hardcodedDocument = createDocument('hardcoded')

        const result = resolveTemplateDocument({
            userDocument: { version: 2 },
            bundledDefaultDocument,
            hardcodedDocument,
        })

        expect(result.templates).toEqual({
            ...bundledDefaultDocument.templates,
            titles: ensureTitlesSupratitleLayers(bundledDefaultDocument.templates.titles),
        })
    })

    it('uses hardcoded templates when the bundled default is invalid', () => {
        const hardcodedDocument = createDocument('hardcoded')

        const result = resolveTemplateDocument({
            userDocument: { show: 'invalid' },
            bundledDefaultDocument: { version: 1 },
            hardcodedDocument,
        })

        expect(result.templates).toEqual({
            ...hardcodedDocument.templates,
            titles: ensureTitlesSupratitleLayers(hardcodedDocument.templates.titles),
        })
    })

    it('falls back from invalid user data through invalid bundled PA default to hardcoded PA templates', () => {
        const hardcodedDocument = createDocument('hardcoded-pa')

        const result = resolveTemplateDocument({
            userDocument: { show: 'obiectiv-comun' },
            bundledDefaultDocument: { show: 'punctul-pe-azi', templates: {} },
            hardcodedDocument,
        })

        expect(result.templates).toEqual({
            ...hardcodedDocument.templates,
            titles: ensureTitlesSupratitleLayers(hardcodedDocument.templates.titles),
        })
    })

    it('returns all required template keys', () => {
        const result = resolveTemplateDocument({
            userDocument: createDocument('user'),
            bundledDefaultDocument: createDocument('bundled'),
            hardcodedDocument: createDocument('hardcoded'),
        })

        expect(Object.keys(result.templates)).toEqual(requiredTemplateKeys)
    })

    it('does not mutate inputs', () => {
        const userDocument = createDocument('user')
        const bundledDefaultDocument = createDocument('bundled')
        const hardcodedDocument = createDocument('hardcoded')
        const initialUserDocument = clone(userDocument)
        const initialBundledDocument = clone(bundledDefaultDocument)
        const initialHardcodedDocument = clone(hardcodedDocument)

        resolveTemplateDocument({
            userDocument,
            bundledDefaultDocument,
            hardcodedDocument,
        })

        expect(userDocument).toEqual(initialUserDocument)
        expect(bundledDefaultDocument).toEqual(initialBundledDocument)
        expect(hardcodedDocument).toEqual(initialHardcodedDocument)
    })

    it('adds missing supratitle layers once and keeps customized built-in layer properties', () => {
        const userDocument = createDocument('user')
        const titleLayers = userDocument.templates.titles.layers
        titleLayers.push({
            id: SUPRATITLE_TEXT_LAYER_ID,
            type: 'text',
            x: 320,
            y: 744,
            width: 900,
            height: 40,
            zIndex: 91,
            fieldId: 'customSupratitle',
            inputLabel: 'Custom heading',
            fallbackText: 'CUSTOM',
            visibleWhenField: 'customSupratitle',
            textStyle: {
                fontFamily: 'Arial',
                fontSize: 28,
                fontWeight: 400,
                color: '#123456',
                align: 'center',
            },
        })

        const firstLoad = resolveTemplateDocument({ userDocument, hardcodedDocument: createDocument('fallback') })
        const secondLoad = resolveTemplateDocument({ userDocument: firstLoad, hardcodedDocument: createDocument('fallback') })
        const migratedTitleLayers = firstLoad.templates.titles.layers

        expect(migratedTitleLayers.filter((layer) => layer.id === SUPRATITLE_SHAPE_LAYER_ID)).toHaveLength(1)
        expect(migratedTitleLayers.filter((layer) => layer.id === SUPRATITLE_TEXT_LAYER_ID)).toHaveLength(1)
        expect(migratedTitleLayers.find((layer) => layer.id === SUPRATITLE_TEXT_LAYER_ID)).toMatchObject({
            x: 320,
            y: 744,
            width: 900,
            fieldId: 'customSupratitle',
            inputLabel: 'Custom heading',
            fallbackText: 'CUSTOM',
        })
        expect(secondLoad.templates.titles.layers).toEqual(migratedTitleLayers)
    })

    it('clears only the old main-title uppercase transform for sentence-case titles', () => {
        const legacyTitle = clone(broadcastTemplates.titles)
        const mainTitle = legacyTitle.layers.find((layer) => layer.id === 'title-main-text')
        if (!mainTitle || mainTitle.type !== 'text') throw new Error('Expected main title text layer')
        mainTitle.textStyle.transform = 'uppercase'

        const compatible = ensureTitlesSupratitleLayers(legacyTitle)
        const compatibleMainTitle = compatible.layers.find((layer) => layer.id === 'title-main-text')

        expect(hasTitlesSupratitleLayers(compatible)).toBe(true)
        expect(compatibleMainTitle?.type === 'text' && compatibleMainTitle.textStyle.transform).toBeUndefined()
        expect(compatibleMainTitle?.textStyle).toMatchObject({
            fontFamily: mainTitle.textStyle.fontFamily,
            fontSize: mainTitle.textStyle.fontSize,
            color: mainTitle.textStyle.color,
        })
    })
})

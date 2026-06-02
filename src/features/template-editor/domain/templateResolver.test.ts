import { describe, expect, it } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import {
    createTemplateDocumentFromTemplates,
    type TemplateDocument,
    type TemplateDocumentTemplates,
} from './templateDocument'
import { resolveTemplateDocument } from './templateResolver'

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

        expect(result.templates).toEqual(userDocument.templates)
    })

    it('uses the bundled default when the user document is missing', () => {
        const bundledDefaultDocument = createDocument('bundled')
        const hardcodedDocument = createDocument('hardcoded')

        const result = resolveTemplateDocument({
            bundledDefaultDocument,
            hardcodedDocument,
        })

        expect(result.templates).toEqual(bundledDefaultDocument.templates)
    })

    it('uses the bundled default when the user document is invalid', () => {
        const bundledDefaultDocument = createDocument('bundled')
        const hardcodedDocument = createDocument('hardcoded')

        const result = resolveTemplateDocument({
            userDocument: { version: 2 },
            bundledDefaultDocument,
            hardcodedDocument,
        })

        expect(result.templates).toEqual(bundledDefaultDocument.templates)
    })

    it('uses hardcoded templates when the bundled default is invalid', () => {
        const hardcodedDocument = createDocument('hardcoded')

        const result = resolveTemplateDocument({
            userDocument: { show: 'invalid' },
            bundledDefaultDocument: { version: 1 },
            hardcodedDocument,
        })

        expect(result.templates).toEqual(hardcodedDocument.templates)
    })

    it('falls back from invalid user data through invalid bundled PA default to hardcoded PA templates', () => {
        const hardcodedDocument = createDocument('hardcoded-pa')

        const result = resolveTemplateDocument({
            userDocument: { show: 'obiectiv-comun' },
            bundledDefaultDocument: { show: 'punctul-pe-azi', templates: {} },
            hardcodedDocument,
        })

        expect(result).toEqual(hardcodedDocument)
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
})

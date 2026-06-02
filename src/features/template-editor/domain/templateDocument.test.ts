import { describe, expect, it } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import {
    TEMPLATE_DOCUMENT_SHOW,
    TEMPLATE_DOCUMENT_VERSION,
    resolveTemplateDocumentTemplates,
    validateTemplateDocument,
} from './templateDocument'

function createValidDocument() {
    return {
        version: TEMPLATE_DOCUMENT_VERSION,
        show: TEMPLATE_DOCUMENT_SHOW,
        templates: {
            titles: broadcastTemplates.titles,
            persons: broadcastTemplates.persons,
            locations: broadcastTemplates.locations,
            phoneCalls: broadcastTemplates.phoneCalls,
            hotTitles: broadcastTemplates.hotTitles,
            waitTitles: broadcastTemplates.waitTitles,
            waitLocations: broadcastTemplates.waitLocations,
        },
    }
}

describe('TemplateDocument validation', () => {
    it('accepts a valid PA document', () => {
        expect(createValidDocument().show).toBe('punctul-pe-azi')
        expect(validateTemplateDocument(createValidDocument())).toBe(true)
    })

    it('rejects a document without templates', () => {
        const document = createValidDocument() as Record<string, unknown>
        delete document.templates

        expect(validateTemplateDocument(document)).toBe(false)
    })

    it('rejects a document without titles', () => {
        const document = createValidDocument()
        const templates = document.templates as Record<string, unknown>
        delete templates.titles

        expect(validateTemplateDocument(document)).toBe(false)
    })

    it('rejects a document without persons', () => {
        const document = createValidDocument()
        const templates = document.templates as Record<string, unknown>
        delete templates.persons

        expect(validateTemplateDocument(document)).toBe(false)
    })

    it('rejects a document without locations', () => {
        const document = createValidDocument()
        const templates = document.templates as Record<string, unknown>
        delete templates.locations

        expect(validateTemplateDocument(document)).toBe(false)
    })

    it('rejects a document without phoneCalls', () => {
        const document = createValidDocument()
        const templates = document.templates as Record<string, unknown>
        delete templates.phoneCalls

        expect(validateTemplateDocument(document)).toBe(false)
    })

    it('rejects a document without PA wait templates', () => {
        const document = createValidDocument()
        const templates = document.templates as Record<string, unknown>
        delete templates.waitTitles

        expect(validateTemplateDocument(document)).toBe(false)
    })

    it('rejects a document without hotTitles', () => {
        const document = createValidDocument()
        const templates = document.templates as Record<string, unknown>
        delete templates.hotTitles

        expect(validateTemplateDocument(document)).toBe(false)
    })

    it('rejects a document without waitLocations', () => {
        const document = createValidDocument()
        const templates = document.templates as Record<string, unknown>
        delete templates.waitLocations

        expect(validateTemplateDocument(document)).toBe(false)
    })

    it('rejects an OC document in the PA application', () => {
        expect(validateTemplateDocument({
            ...createValidDocument(),
            show: 'obiectiv-comun',
        })).toBe(false)
    })

    it('rejects a document with the wrong version', () => {
        const document = {
            ...createValidDocument(),
            version: 2,
        }

        expect(validateTemplateDocument(document)).toBe(false)
    })

    it('rejects a document with the wrong show', () => {
        const document = {
            ...createValidDocument(),
            show: 'alta-emisiune',
        }

        expect(validateTemplateDocument(document)).toBe(false)
    })

    it('falls back to hardcoded templates when the document is invalid', () => {
        const document = {
            ...createValidDocument(),
            version: 2,
        }

        expect(resolveTemplateDocumentTemplates(document, broadcastTemplates)).toBe(broadcastTemplates)
    })
})

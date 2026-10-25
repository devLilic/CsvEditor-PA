import { describe, expect, it } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import { DEFAULT_LOWER_THIRD_TYPES } from '@/features/lower-thirds/domain/lowerThirdTypes'
import {
    TEMPLATE_DOCUMENT_VERSION,
    createTemplateDocumentFromTemplates,
    migrateLegacyTemplateDocument,
    resolveTemplateDocumentTemplates,
    validateTemplateDocument,
} from './templateDocument'

function createValidDocument() {
    return createTemplateDocumentFromTemplates(broadcastTemplates)
}

describe('TemplateDocument validation', () => {
    it('accepts a valid PA document', () => {
        expect(createValidDocument().show).toBe('punctul-pe-azi')
        expect(validateTemplateDocument(createValidDocument())).toBe(true)
    })

    it('accepts additional configured lower-third variants', () => {
        const document = createValidDocument()
        document.lowerThirdVariants.titles['special-title'] = {
            ...document.lowerThirdVariants.titles.ordinary,
            id: 'custom-title-special-title',
        }

        expect(validateTemplateDocument(document)).toBe(true)
    })

    it('keeps a show valid after optional breaking and urgent types are removed', () => {
        const document = createValidDocument()
        for (const kind of ['titles', 'persons'] as const) {
            delete document.lowerThirdVariants[kind]['breaking-news']
            delete document.lowerThirdVariants[kind].urgent
        }
        expect(validateTemplateDocument(document)).toBe(true)
        delete document.lowerThirdVariants.titles.ordinary
        expect(validateTemplateDocument(document)).toBe(false)
    })

    it('migrates v1 title and person designs into ordinary and seeds the remaining variants', () => {
        const legacyTemplates = JSON.parse(JSON.stringify(broadcastTemplates))
        const legacyDocument = {
            version: 1,
            show: 'punctul-pe-azi',
            templates: legacyTemplates,
        }

        const migrated = migrateLegacyTemplateDocument(legacyDocument)
        expect(migrated?.version).toBe(TEMPLATE_DOCUMENT_VERSION)
        expect(migrated?.lowerThirdVariants.titles.ordinary.layers).toEqual(legacyTemplates.titles.layers)
        expect(migrated?.lowerThirdVariants.persons.ordinary.layers).toEqual(legacyTemplates.persons.layers)
        expect(migrated?.lowerThirdVariants.titles['breaking-news'].name)
            .toBe(DEFAULT_LOWER_THIRD_TYPES.find((type) => type.id === 'breaking-news')?.templates.titles.name)
        expect(migrated?.lowerThirdVariants.persons.urgent.id)
            .not.toBe(migrated?.lowerThirdVariants.persons.ordinary.id)
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

    it('accepts a document scoped to another show project', () => {
        expect(validateTemplateDocument({
            ...createValidDocument(),
            show: 'obiectiv-comun',
        })).toBe(true)
    })

    it('rejects a document with the wrong version', () => {
        const document = {
            ...createValidDocument(),
            version: TEMPLATE_DOCUMENT_VERSION + 1,
        }

        expect(validateTemplateDocument(document)).toBe(false)
    })

    it('rejects a document without a show id', () => {
        const document = {
            ...createValidDocument(),
            show: '  ',
        }

        expect(validateTemplateDocument(document)).toBe(false)
    })

    it('falls back to hardcoded templates when the document is invalid', () => {
        const document = {
            ...createValidDocument(),
            version: TEMPLATE_DOCUMENT_VERSION + 1,
        }

        expect(resolveTemplateDocumentTemplates(document, broadcastTemplates)).toBe(broadcastTemplates)
    })
})

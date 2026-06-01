import { describe, expect, it } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import { createTemplateDocumentFromTemplates } from '../domain/templateDocument'
import { templateEditorStorageService } from './templateEditorStorageService'

function createDocument() {
    return createTemplateDocumentFromTemplates(broadcastTemplates)
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

describe('templateEditorStorageService', () => {
    it('getUserTemplateDocument returns a valid document', async () => {
        const api = (window as any).electronAPI
        const document = createDocument()
        api.getUserTemplateDocument.mockResolvedValueOnce({
            ok: true,
            document,
        })

        const result = await templateEditorStorageService.getUserTemplateDocument()

        expect(result).toEqual({
            ok: true,
            document,
            error: undefined,
        })
        expect(api.getUserTemplateDocument).toHaveBeenCalledOnce()
    })

    it('returns a controlled error when electronAPI is missing', async () => {
        ;(globalThis as any).electronAPI = undefined
        ;(window as any).electronAPI = undefined

        const result = await templateEditorStorageService.getUserTemplateDocument()

        expect(result).toEqual({
            ok: false,
            document: null,
            error: 'electronAPI not available',
        })
    })

    it('saveUserTemplateDocument calls electronAPI', async () => {
        const api = (window as any).electronAPI
        const document = createDocument()
        api.saveUserTemplateDocument.mockResolvedValueOnce({ ok: true })

        const result = await templateEditorStorageService.saveUserTemplateDocument(document)

        expect(result).toEqual({
            ok: true,
            error: undefined,
        })
        expect(api.saveUserTemplateDocument).toHaveBeenCalledWith({ document })
    })

    it('saveDevDefaultTemplateDocument calls electronAPI', async () => {
        const api = (window as any).electronAPI
        const document = createDocument()
        api.saveDevDefaultTemplateDocument.mockResolvedValueOnce({
            ok: true,
            skipped: true,
        })

        const result = await templateEditorStorageService.saveDevDefaultTemplateDocument(document)

        expect(result).toEqual({
            ok: true,
            skipped: true,
            error: undefined,
        })
        expect(api.saveDevDefaultTemplateDocument).toHaveBeenCalledWith({ document })
    })

    it('does not mutate the received document', async () => {
        const api = (window as any).electronAPI
        const document = createDocument()
        const initialDocument = clone(document)
        api.saveUserTemplateDocument.mockResolvedValueOnce({ ok: true })
        api.saveDevDefaultTemplateDocument.mockResolvedValueOnce({ ok: true })

        await templateEditorStorageService.saveUserTemplateDocument(document)
        await templateEditorStorageService.saveDevDefaultTemplateDocument(document)

        expect(document).toEqual(initialDocument)
    })
})

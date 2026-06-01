import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import {
    createTemplateDocumentFromTemplates,
    type TemplateDocument,
    type TemplateDocumentTemplates,
} from '../domain/templateDocument'
import { templateEditorStorageService } from '../services/templateEditorStorageService'
import {
    TemplateDocumentProvider,
    useTemplateDocument,
} from './TemplateDocumentProvider'

vi.mock('../services/templateEditorStorageService', () => ({
    templateEditorStorageService: {
        getUserTemplateDocument: vi.fn(),
        saveUserTemplateDocument: vi.fn(),
        saveDevDefaultTemplateDocument: vi.fn(),
    },
}))

const serviceMock = vi.mocked(templateEditorStorageService)

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
    }
}

function createDocument(prefix: string): TemplateDocument {
    return createTemplateDocumentFromTemplates(createTemplates(prefix))
}

function renderTemplateDocumentProvider(input: {
    bundledDefaultDocument?: unknown
} = {}) {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <TemplateDocumentProvider bundledDefaultDocument={input.bundledDefaultDocument}>
            {children}
        </TemplateDocumentProvider>
    )

    return renderHook(() => useTemplateDocument(), { wrapper })
}

async function waitForLoaded(result: ReturnType<typeof renderTemplateDocumentProvider>['result']) {
    await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
    })
}

describe('TemplateDocumentProvider', () => {
    beforeEach(() => {
        serviceMock.getUserTemplateDocument.mockResolvedValue({
            ok: true,
            document: null,
        })
        serviceMock.saveUserTemplateDocument.mockResolvedValue({ ok: true })
        serviceMock.saveDevDefaultTemplateDocument.mockResolvedValue({ ok: true })
    })

    it('loads a valid user document', async () => {
        const userDocument = createDocument('user')
        serviceMock.getUserTemplateDocument.mockResolvedValueOnce({
            ok: true,
            document: userDocument,
        })

        const { result } = renderTemplateDocumentProvider({
            bundledDefaultDocument: createDocument('bundled'),
        })
        await waitForLoaded(result)

        expect(result.current.document).toEqual(userDocument)
    })

    it('falls back to bundled default when user document is missing', async () => {
        const bundledDefaultDocument = createDocument('bundled')
        serviceMock.getUserTemplateDocument.mockResolvedValueOnce({
            ok: true,
            document: null,
        })

        const { result } = renderTemplateDocumentProvider({ bundledDefaultDocument })
        await waitForLoaded(result)

        expect(result.current.document).toEqual(bundledDefaultDocument)
        expect(result.current.defaultDocument).toEqual(bundledDefaultDocument)
    })

    it('falls back to hardcoded when bundled default is invalid', async () => {
        serviceMock.getUserTemplateDocument.mockResolvedValueOnce({
            ok: true,
            document: null,
        })

        const { result } = renderTemplateDocumentProvider({
            bundledDefaultDocument: { version: 1 },
        })
        await waitForLoaded(result)

        expect(result.current.document.templates.titles.id).toBe(broadcastTemplates.titles.id)
        expect(result.current.defaultDocument.templates.titles.id).toBe(broadcastTemplates.titles.id)
    })

    it('updateTemplate sets isDirty=true', async () => {
        const { result } = renderTemplateDocumentProvider({
            bundledDefaultDocument: createDocument('bundled'),
        })
        await waitForLoaded(result)

        act(() => {
            result.current.updateTemplate('titles', createTemplates('updated').titles)
        })

        expect(result.current.document.templates.titles.id).toBe('updated-titles')
        expect(result.current.isDirty).toBe(true)
    })

    it('saveTemplates sets isDirty=false when save succeeds', async () => {
        const { result } = renderTemplateDocumentProvider({
            bundledDefaultDocument: createDocument('bundled'),
        })
        await waitForLoaded(result)

        act(() => {
            result.current.updateTemplate('titles', createTemplates('updated').titles)
        })
        expect(result.current.isDirty).toBe(true)

        await act(async () => {
            await result.current.saveTemplates()
        })

        expect(serviceMock.saveUserTemplateDocument).toHaveBeenCalledOnce()
        expect(serviceMock.saveDevDefaultTemplateDocument).toHaveBeenCalledOnce()
        expect(result.current.isDirty).toBe(false)
    })

    it('resetTemplateToDefault restores the current template to default', async () => {
        const bundledDefaultDocument = createDocument('bundled')
        const { result } = renderTemplateDocumentProvider({ bundledDefaultDocument })
        await waitForLoaded(result)

        act(() => {
            result.current.updateTemplate('titles', createTemplates('updated').titles)
        })
        expect(result.current.document.templates.titles.id).toBe('updated-titles')

        act(() => {
            result.current.resetTemplateToDefault('titles')
        })

        expect(result.current.document.templates.titles).toEqual(
            bundledDefaultDocument.templates.titles
        )
    })

    it('reset without save remains dirty', async () => {
        const { result } = renderTemplateDocumentProvider({
            bundledDefaultDocument: createDocument('bundled'),
        })
        await waitForLoaded(result)

        act(() => {
            result.current.resetTemplateToDefault('titles')
        })

        expect(result.current.isDirty).toBe(true)
    })

    it('stays dirty when save fails', async () => {
        serviceMock.saveUserTemplateDocument.mockResolvedValueOnce({
            ok: false,
            error: 'SAVE_FAILED',
        })
        const { result } = renderTemplateDocumentProvider({
            bundledDefaultDocument: createDocument('bundled'),
        })
        await waitForLoaded(result)

        act(() => {
            result.current.updateTemplate('titles', createTemplates('updated').titles)
        })

        await act(async () => {
            const saveResult = await result.current.saveTemplates()
            expect(saveResult).toEqual({
                ok: false,
                error: 'SAVE_FAILED',
            })
        })

        expect(result.current.isDirty).toBe(true)
    })

    it('discards unsaved changes and restores the last clean document', async () => {
        const bundledDefaultDocument = createDocument('bundled')
        const { result } = renderTemplateDocumentProvider({ bundledDefaultDocument })
        await waitForLoaded(result)

        act(() => {
            result.current.updateTemplate('titles', createTemplates('updated').titles)
        })
        expect(result.current.document.templates.titles.id).toBe('updated-titles')

        act(() => {
            result.current.discardUnsavedChanges()
        })

        expect(result.current.document.templates.titles.id).toBe('bundled-titles')
        expect(result.current.isDirty).toBe(false)
    })

    it('returns a warning and stays clean when local save succeeds but dev default save fails', async () => {
        serviceMock.saveDevDefaultTemplateDocument.mockResolvedValueOnce({
            ok: false,
            error: 'DEV_DEFAULT_WRITE_FAILED',
        })
        const { result } = renderTemplateDocumentProvider({
            bundledDefaultDocument: createDocument('bundled'),
        })
        await waitForLoaded(result)

        act(() => {
            result.current.updateTemplate('titles', createTemplates('updated').titles)
        })

        await act(async () => {
            const saveResult = await result.current.saveTemplates()
            expect(saveResult).toEqual({
                ok: true,
                warning: 'Template-urile au fost salvate local, dar defaultTemplates.oc.json nu a putut fi actualizat.',
            })
        })

        expect(serviceMock.saveUserTemplateDocument).toHaveBeenCalledOnce()
        expect(result.current.isDirty).toBe(false)
    })

    it('does not warn when production skips the dev default save', async () => {
        serviceMock.saveDevDefaultTemplateDocument.mockResolvedValueOnce({
            ok: true,
            skipped: true,
        })
        const { result } = renderTemplateDocumentProvider({
            bundledDefaultDocument: createDocument('bundled'),
        })
        await waitForLoaded(result)

        act(() => {
            result.current.updateTemplate('titles', createTemplates('updated').titles)
        })

        await act(async () => {
            const saveResult = await result.current.saveTemplates()
            expect(saveResult).toEqual({ ok: true })
        })
    })
})

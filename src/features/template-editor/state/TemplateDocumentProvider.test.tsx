import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import type { BroadcastLayer } from '@/shared/preview/templateContract'
import { SUPRATITLE_SHAPE_LAYER_ID, SUPRATITLE_TEXT_LAYER_ID } from '../domain/supratitleLayers'
import {
    createTemplateDocumentFromTemplates,
    type TemplateDocument,
    type TemplateDocumentTemplates,
} from '../domain/templateDocument'
import { templateEditorStorageService } from '../services/templateEditorStorageService'
import { ensureSingleLinePersonTemplate } from '../domain/personTemplateCompatibility'
import { ensureTitlesSupratitleLayers } from '../domain/supratitleLayers'
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
        hotTitles: { ...templates.hotTitles, id: `${prefix}-hotTitles` },
        waitTitles: { ...templates.waitTitles, id: `${prefix}-waitTitles` },
        waitLocations: { ...templates.waitLocations, id: `${prefix}-waitLocations` },
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

        expect(result.current.document.templates.persons).toEqual(userDocument.templates.persons)
        expect(result.current.document.templates.titles.layers).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: SUPRATITLE_SHAPE_LAYER_ID }),
            expect.objectContaining({ id: SUPRATITLE_TEXT_LAYER_ID }),
        ]))
        const migratedTitleText = result.current.document.templates.titles.layers.find((layer) => layer.id === 'title-main-text')
        expect(migratedTitleText?.type === 'text' && migratedTitleText.textStyle.transform).toBeUndefined()
        expect(result.current.isDirty).toBe(true)
    })

    it('marks legacy title migration dirty, saves it, and reloads without duplicate layers', async () => {
        const legacyDocument = createDocument('legacy')
        serviceMock.getUserTemplateDocument.mockResolvedValueOnce({
            ok: true,
            document: legacyDocument,
        })

        const first = renderTemplateDocumentProvider({ bundledDefaultDocument: createDocument('bundled') })
        await waitForLoaded(first.result)
        expect(first.result.current.isDirty).toBe(true)

        await act(async () => {
            await first.result.current.saveTemplates()
        })
        const savedDocument = serviceMock.saveUserTemplateDocument.mock.calls.at(-1)?.[0]
        expect(savedDocument?.templates.titles.layers.filter((layer) => layer.id === SUPRATITLE_SHAPE_LAYER_ID)).toHaveLength(1)
        expect(savedDocument?.templates.titles.layers.filter((layer) => layer.id === SUPRATITLE_TEXT_LAYER_ID)).toHaveLength(1)
        expect(savedDocument?.templates.persons.layers.find((layer) => layer.id === 'person-name-text')).toMatchObject({
            textParts: expect.any(Array),
        })

        serviceMock.getUserTemplateDocument.mockResolvedValueOnce({ ok: true, document: savedDocument })
        const reopened = renderTemplateDocumentProvider({ bundledDefaultDocument: createDocument('bundled') })
        await waitForLoaded(reopened.result)

        expect(reopened.result.current.isDirty).toBe(false)
        expect(reopened.result.current.document.templates.titles.layers.filter((layer) => layer.id === SUPRATITLE_SHAPE_LAYER_ID)).toHaveLength(1)
        expect(reopened.result.current.document.templates.titles.layers.filter((layer) => layer.id === SUPRATITLE_TEXT_LAYER_ID)).toHaveLength(1)
        expect(reopened.result.current.document.templates.persons.layers.find((layer) => layer.id === 'person-name-text')).toMatchObject({
            textParts: expect.any(Array),
        })
    })

    it('does not mark a current title/person document dirty on load', async () => {
        const currentDocument = createDocument('current')
        currentDocument.templates.titles = ensureTitlesSupratitleLayers(currentDocument.templates.titles)
        ensureSingleLinePersonTemplate(currentDocument)
        serviceMock.getUserTemplateDocument.mockResolvedValueOnce({ ok: true, document: currentDocument })

        const { result } = renderTemplateDocumentProvider({ bundledDefaultDocument: createDocument('bundled') })
        await waitForLoaded(result)

        expect(result.current.isDirty).toBe(false)
    })

    it('restores the fixed phone image source when loading a modified user document', async () => {
        const userDocument = createDocument('user')
        const imageLayer = userDocument.templates.phoneCalls.layers.find(
            (layer) => layer.id === 'phone-call-person-image'
        )
        if (!imageLayer || imageLayer.type !== 'image') {
            throw new Error('Expected phone-call-person-image layer')
        }
        imageLayer.src = 'manual-photo.png'
        serviceMock.getUserTemplateDocument.mockResolvedValueOnce({
            ok: true,
            document: userDocument,
        })

        const { result } = renderTemplateDocumentProvider({
            bundledDefaultDocument: createDocument('bundled'),
        })
        await waitForLoaded(result)

        expect(result.current.document.templates.phoneCalls.layers).toContainEqual(
            expect.objectContaining({
                id: 'phone-call-person-image',
                src: '{image}',
            })
        )
    })

    it('falls back to bundled default when user document is missing', async () => {
        const bundledDefaultDocument = createDocument('bundled')
        serviceMock.getUserTemplateDocument.mockResolvedValueOnce({
            ok: true,
            document: null,
        })

        const { result } = renderTemplateDocumentProvider({ bundledDefaultDocument })
        await waitForLoaded(result)

        expect(result.current.document.templates.titles).toEqual(
            ensureTitlesSupratitleLayers(bundledDefaultDocument.templates.titles),
        )
        expect(result.current.defaultDocument.templates.titles).toEqual(
            ensureTitlesSupratitleLayers(bundledDefaultDocument.templates.titles),
        )
        expect(result.current.document.templates.persons).toEqual(
            ensureSingleLinePersonTemplate(clone({ ...bundledDefaultDocument })).templates.persons,
        )
    })

    it('preserves public background filenames for the generic preview resolver', async () => {
        const bundledDefaultDocument = createDocument('bundled')
        bundledDefaultDocument.templates.titles.canvas.background = {
            type: 'image',
            value: 'another-public-background.png',
            objectFit: 'cover',
        }
        serviceMock.getUserTemplateDocument.mockResolvedValueOnce({ ok: true, document: null })

        const { result } = renderTemplateDocumentProvider({ bundledDefaultDocument })
        await waitForLoaded(result)

        expect(result.current.document.templates.titles.canvas.background.value).toBe('another-public-background.png')

        act(() => {
            result.current.updateTemplate('titles', {
                ...result.current.document.templates.titles,
                name: 'saved title template',
            })
        })
        await act(async () => {
            await result.current.saveTemplates()
        })

        const savedDocument = serviceMock.saveUserTemplateDocument.mock.calls.at(-1)?.[0]
        expect(savedDocument?.templates.titles.canvas.background.value).toBe('another-public-background.png')
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

    it('saves and reloads custom layer ids and properties', async () => {
        const { result } = renderTemplateDocumentProvider({
            bundledDefaultDocument: createDocument('bundled'),
        })
        await waitForLoaded(result)

        const titles = clone(result.current.document.templates.titles)
        const customLayers: BroadcastLayer[] = [
            {
                id: 'custom-text-1',
                type: 'text',
                x: 28,
                y: 44,
                width: 820,
                height: 104,
                zIndex: 15,
                fieldId: 'customText',
                fallbackText: 'New text',
                fieldDefaultValue: 'Saved custom copy',
                textStyle: {
                    fontFamily: 'Arial',
                    fontSize: 52,
                    fontWeight: 700,
                    color: '#ffffff',
                    align: 'left',
                },
            },
            {
                id: 'custom-shape-1',
                type: 'shape',
                x: 12,
                y: 26,
                width: 900,
                height: 140,
                zIndex: -1,
                shapeType: 'rect',
                fill: { type: 'solid', value: '#223344' },
                borderRadius: 8,
            },
        ]
        titles.layers.push(...customLayers)

        act(() => {
            result.current.updateTemplate('titles', titles)
            result.current.setTemplateEntityEnabled('hotTitles', false)
        })
        await act(async () => {
            await result.current.saveTemplates()
        })

        const savedDocument = serviceMock.saveUserTemplateDocument.mock.calls[0]?.[0]
        expect(savedDocument?.templates.titles.layers).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: 'custom-text-1',
                fieldId: 'customText',
                fieldDefaultValue: 'Saved custom copy',
                x: 28,
                width: 820,
            }),
            expect.objectContaining({
                id: 'custom-shape-1',
                fill: { type: 'solid', value: '#223344' },
                borderRadius: 8,
                zIndex: -1,
            }),
        ]))
        expect(savedDocument?.disabledEntityTypes).toEqual(['hotTitles'])

        serviceMock.getUserTemplateDocument.mockResolvedValueOnce({
            ok: true,
            document: savedDocument,
        })
        const reopened = renderTemplateDocumentProvider({
            bundledDefaultDocument: createDocument('bundled'),
        })
        await waitForLoaded(reopened.result)

        expect(reopened.result.current.document.templates.titles.layers).toEqual(
            savedDocument?.templates.titles.layers,
        )
    })

    it('writes the fixed phone image source when saving templates', async () => {
        const { result } = renderTemplateDocumentProvider({
            bundledDefaultDocument: createDocument('bundled'),
        })
        await waitForLoaded(result)
        const phoneCalls = clone(result.current.document.templates.phoneCalls)
        const imageLayer = phoneCalls.layers.find((layer) => layer.id === 'phone-call-person-image')
        if (!imageLayer || imageLayer.type !== 'image') {
            throw new Error('Expected phone-call-person-image layer')
        }
        imageLayer.src = 'manual-photo.png'

        act(() => {
            result.current.updateTemplate('phoneCalls', phoneCalls)
        })
        await act(async () => {
            await result.current.saveTemplates()
        })

        expect(serviceMock.saveUserTemplateDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                templates: expect.objectContaining({
                    phoneCalls: expect.objectContaining({
                        layers: expect.arrayContaining([
                            expect.objectContaining({
                                id: 'phone-call-person-image',
                                src: '{image}',
                            }),
                        ]),
                    }),
                }),
            })
        )
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
            ensureTitlesSupratitleLayers(bundledDefaultDocument.templates.titles),
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
                warning: 'Template-urile au fost salvate local, dar defaultTemplates.pa.json nu a putut fi actualizat.',
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

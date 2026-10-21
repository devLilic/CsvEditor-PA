import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import type { ReactNode } from 'react'
import type { BroadcastTemplate } from '@/shared/preview/templateContract'
import { broadcastTemplates } from '@/templates/broadcast'
import bundledDefaultTemplateDocument from '@/templates/broadcast/defaultTemplates.pa.json'
import paBg from '@/assets/bg/PA_bg.png'
import paPhoneBg from '@/assets/bg/PA_phone_bg.png'
import phoneCallsBackground from '@/assets/bg/phoneCalls_background.png'
import {
    createTemplateDocumentFromTemplates,
    isTemplateDocument,
    type TemplateDocument,
    type TemplateDocumentTemplates,
} from '@/features/template-editor/domain/templateDocument'
import { resolveTemplateDocument } from '@/features/template-editor/domain/templateResolver'
import { enforceFixedTemplateFields } from '@/features/template-editor/domain/fixedTemplateFields'
import {
    ensureSingleLinePersonTemplate,
    hasSingleLinePersonTemplate,
} from '@/features/template-editor/domain/personTemplateCompatibility'
import { hasTitlesSupratitleLayers } from '@/features/template-editor/domain/supratitleLayers'
import { isLegacyTemplateDocument } from '@/features/template-editor/domain/templateDocument'
import type { LowerThirdEntityKind } from '@/features/lower-thirds/domain/lowerThirdTypes'
import { templateEditorStorageService } from '@/features/template-editor/services/templateEditorStorageService'

export type EditableTemplateEntityType = keyof TemplateDocumentTemplates

type SaveTemplatesResult = {
    ok: boolean
    error?: string
    warning?: string
}

const DEV_DEFAULT_SAVE_WARNING =
    'Template-urile au fost salvate local, dar defaultTemplates.pa.json nu a putut fi actualizat.'
export type TemplateDocumentContextValue = {
    document: TemplateDocument
    defaultDocument: TemplateDocument
    isLoaded: boolean
    isDirty: boolean
    updateTemplate(entityType: EditableTemplateEntityType, template: BroadcastTemplate): void
    updateLowerThirdVariant(kind: LowerThirdEntityKind, typeId: string, template: BroadcastTemplate): void
    setTemplateEntityEnabled(entityType: EditableTemplateEntityType, enabled: boolean): void
    resetTemplateToDefault(entityType: EditableTemplateEntityType): void
    resetLowerThirdVariantToDefault(kind: LowerThirdEntityKind, typeId: string): void
    discardUnsavedChanges(): void
    saveTemplates(): Promise<SaveTemplatesResult>
    markClean(): void
}

const TemplateDocumentContext = createContext<TemplateDocumentContextValue | null>(null)

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

function hydrateRuntimeAssets(document: TemplateDocument): TemplateDocument {
    const nextDocument = ensureSingleLinePersonTemplate(enforceFixedTemplateFields(clone(document)))
    const backgroundMap: Record<string, string> = {
        'src/assets/bg/PA_bg.png': paBg,
        'src/assets/bg/PA_phone_bg.png': paPhoneBg,
        'src/assets/bg/phoneCalls_background.png': phoneCallsBackground,
    }

    const allTemplates = [
        ...Object.values(nextDocument.templates),
        ...Object.values(nextDocument.lowerThirdVariants).flatMap((variants) => Object.values(variants)),
    ]
    for (const template of allTemplates) {
        const background = template.canvas.background
        if (background.type === 'image') {
            background.value = backgroundMap[background.value] ?? background.value
        }
    }

    return nextDocument
}

function dehydrateRuntimeAssets(document: TemplateDocument): TemplateDocument {
    const nextDocument = enforceFixedTemplateFields(clone(document))
    const backgroundMap: Record<string, string> = {
        [paBg]: 'src/assets/bg/PA_bg.png',
        [paPhoneBg]: 'src/assets/bg/PA_phone_bg.png',
        [phoneCallsBackground]: 'src/assets/bg/phoneCalls_background.png',
    }

    const allTemplates = [
        ...Object.values(nextDocument.templates),
        ...Object.values(nextDocument.lowerThirdVariants).flatMap((variants) => Object.values(variants)),
    ]
    for (const template of allTemplates) {
        const background = template.canvas.background
        if (background.type === 'image') {
            background.value = backgroundMap[background.value] ?? background.value
        }
    }

    return nextDocument
}

function createHardcodedDocument() {
    return createTemplateDocumentFromTemplates(broadcastTemplates)
}

function createDefaultDocument(
    hardcodedDocument: TemplateDocument,
    bundledDefaultDocument: unknown = bundledDefaultTemplateDocument,
) {
    return hydrateRuntimeAssets(resolveTemplateDocument({
        bundledDefaultDocument,
        hardcodedDocument,
    }))
}

type TemplateDocumentProviderProps = {
    children: ReactNode
    bundledDefaultDocument?: unknown
}

export function TemplateDocumentProvider({
    children,
    bundledDefaultDocument = bundledDefaultTemplateDocument,
}: TemplateDocumentProviderProps) {
    const hardcodedDocument = useMemo(() => createHardcodedDocument(), [])
    const initialDefaultDocument = useMemo(
        () => createDefaultDocument(hardcodedDocument, bundledDefaultDocument),
        [bundledDefaultDocument, hardcodedDocument],
    )
    const [defaultDocument, setDefaultDocument] = useState<TemplateDocument>(initialDefaultDocument)
    const [document, setDocument] = useState<TemplateDocument>(initialDefaultDocument)
    const [cleanDocument, setCleanDocument] = useState<TemplateDocument>(initialDefaultDocument)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isDirty, setIsDirty] = useState(false)

    useEffect(() => {
        let isMounted = true

        async function loadTemplateDocument() {
            const nextDefaultDocument = createDefaultDocument(hardcodedDocument, bundledDefaultDocument)
            const response = await templateEditorStorageService.getUserTemplateDocument()
            const nextDocument = hydrateRuntimeAssets(resolveTemplateDocument({
                userDocument: response.ok ? response.document : null,
                bundledDefaultDocument: nextDefaultDocument,
                hardcodedDocument,
            }))
            const hasUnpersistedCompatibilityMigration = response.ok
                && (response.migrated === true
                    || isLegacyTemplateDocument(response.document)
                    || (isTemplateDocument(response.document)
                        && (!hasTitlesSupratitleLayers(response.document.templates.titles)
                            || !hasSingleLinePersonTemplate(response.document))))

            if (!isMounted) return

            setDefaultDocument(nextDefaultDocument)
            setDocument(nextDocument)
            setCleanDocument(nextDocument)
            setIsDirty(hasUnpersistedCompatibilityMigration)
            setIsLoaded(true)
        }

        void loadTemplateDocument()

        return () => {
            isMounted = false
        }
    }, [bundledDefaultDocument, hardcodedDocument])

    const updateTemplate = useCallback((
        entityType: EditableTemplateEntityType,
        template: BroadcastTemplate,
    ) => {
        setDocument((currentDocument) => ({
            ...currentDocument,
            templates: {
                ...currentDocument.templates,
                [entityType]: clone(template),
            },
            ...(entityType === 'titles' || entityType === 'persons'
                ? {
                    lowerThirdVariants: {
                        ...currentDocument.lowerThirdVariants,
                        [entityType]: {
                            ...currentDocument.lowerThirdVariants[entityType],
                            ordinary: clone(template),
                        },
                    },
                }
                : {}),
        }))
        setIsDirty(true)
    }, [])

    const updateLowerThirdVariant = useCallback((
        kind: LowerThirdEntityKind,
        typeId: string,
        template: BroadcastTemplate,
    ) => {
        setDocument((currentDocument) => ({
            ...currentDocument,
            lowerThirdVariants: {
                ...currentDocument.lowerThirdVariants,
                [kind]: {
                    ...currentDocument.lowerThirdVariants[kind],
                    [typeId]: (() => {
                        const nextTemplate = clone(template)
                        if (!currentDocument.lowerThirdVariants[kind][typeId]
                            && typeId !== 'ordinary'
                            && !nextTemplate.id.endsWith(`-${typeId}`)) {
                            nextTemplate.id = `${nextTemplate.id}-${typeId}`
                        }
                        return nextTemplate
                    })(),
                },
            },
            ...(typeId === 'ordinary'
                ? { templates: { ...currentDocument.templates, [kind]: clone(template) } }
                : {}),
        }))
        setIsDirty(true)
    }, [])

    const setTemplateEntityEnabled = useCallback((
        entityType: EditableTemplateEntityType,
        enabled: boolean,
    ) => {
        setDocument((currentDocument) => {
            const disabled = new Set(currentDocument.disabledEntityTypes ?? [])
            if (enabled) disabled.delete(entityType)
            else disabled.add(entityType)
            const disabledEntityTypes = [...disabled]
            return {
                ...currentDocument,
                disabledEntityTypes: disabledEntityTypes.length > 0
                    ? disabledEntityTypes
                    : undefined,
            }
        })
        setIsDirty(true)
    }, [])

    const resetTemplateToDefault = useCallback((entityType: EditableTemplateEntityType) => {
        setDocument((currentDocument) => ({
            ...currentDocument,
            templates: {
                ...currentDocument.templates,
                [entityType]: clone(defaultDocument.templates[entityType]),
            },
            ...(entityType === 'titles' || entityType === 'persons'
                ? {
                    lowerThirdVariants: {
                        ...currentDocument.lowerThirdVariants,
                        [entityType]: {
                            ...currentDocument.lowerThirdVariants[entityType],
                            ordinary: clone(defaultDocument.lowerThirdVariants[entityType].ordinary),
                        },
                    },
                }
                : {}),
        }))
        setIsDirty(true)
    }, [defaultDocument])

    const resetLowerThirdVariantToDefault = useCallback((kind: LowerThirdEntityKind, typeId: string) => {
        setDocument((currentDocument) => ({
            ...currentDocument,
            lowerThirdVariants: {
                ...currentDocument.lowerThirdVariants,
                [kind]: {
                    ...currentDocument.lowerThirdVariants[kind],
                    [typeId]: (() => {
                        const defaultVariant = defaultDocument.lowerThirdVariants[kind][typeId]
                            ?? defaultDocument.lowerThirdVariants[kind].ordinary
                        const nextTemplate = clone(defaultVariant)
                        if (!defaultDocument.lowerThirdVariants[kind][typeId]
                            && !nextTemplate.id.endsWith(`-${typeId}`)) {
                            nextTemplate.id = `${nextTemplate.id}-${typeId}`
                        }
                        return nextTemplate
                    })(),
                },
            },
            ...(typeId === 'ordinary'
                ? { templates: { ...currentDocument.templates, [kind]: clone(defaultDocument.lowerThirdVariants[kind][typeId]) } }
                : {}),
        }))
        setIsDirty(true)
    }, [defaultDocument])

    const markClean = useCallback(() => {
        setCleanDocument(clone(document))
        setIsDirty(false)
    }, [document])

    const discardUnsavedChanges = useCallback(() => {
        setDocument(clone(cleanDocument))
        setIsDirty(false)
    }, [cleanDocument])

    const saveTemplates = useCallback(async (): Promise<SaveTemplatesResult> => {
        const documentToSave = dehydrateRuntimeAssets(document)
        const userSaveResult = await templateEditorStorageService.saveUserTemplateDocument(documentToSave)
        if (!userSaveResult.ok) {
            return {
                ok: false,
                error: userSaveResult.error,
            }
        }

        const defaultSaveResult = await templateEditorStorageService.saveDevDefaultTemplateDocument(documentToSave)
        if (!defaultSaveResult.ok) {
            setCleanDocument(clone(document))
            setIsDirty(false)
            return {
                ok: true,
                warning: DEV_DEFAULT_SAVE_WARNING,
            }
        }

        setCleanDocument(clone(document))
        setIsDirty(false)
        return { ok: true }
    }, [document])

    const value = useMemo<TemplateDocumentContextValue>(() => ({
        document,
        defaultDocument,
        isLoaded,
        isDirty,
        updateTemplate,
        updateLowerThirdVariant,
        setTemplateEntityEnabled,
        resetTemplateToDefault,
        resetLowerThirdVariantToDefault,
        discardUnsavedChanges,
        saveTemplates,
        markClean,
    }), [
        document,
        defaultDocument,
        isLoaded,
        isDirty,
        updateTemplate,
        updateLowerThirdVariant,
        setTemplateEntityEnabled,
        resetTemplateToDefault,
        resetLowerThirdVariantToDefault,
        discardUnsavedChanges,
        saveTemplates,
        markClean,
    ])

    return (
        <TemplateDocumentContext.Provider value={value}>
            {children}
        </TemplateDocumentContext.Provider>
    )
}

export function useTemplateDocument() {
    const context = useContext(TemplateDocumentContext)
    if (!context) {
        throw new Error('useTemplateDocument must be used inside TemplateDocumentProvider')
    }

    return context
}

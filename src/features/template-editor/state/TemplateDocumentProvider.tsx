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
import bundledDefaultTemplateDocument from '@/templates/broadcast/defaultTemplates.oc.json'
import ocBg from '@/assets/bg/OC_bg.png'
import ocPhoneBg from '@/assets/bg/OC__phone_bg.png'
import {
    createTemplateDocumentFromTemplates,
    type TemplateDocument,
    type TemplateDocumentTemplates,
} from '@/features/template-editor/domain/templateDocument'
import { resolveTemplateDocument } from '@/features/template-editor/domain/templateResolver'
import { templateEditorStorageService } from '@/features/template-editor/services/templateEditorStorageService'

export type EditableTemplateEntityType = keyof TemplateDocumentTemplates

type SaveTemplatesResult = {
    ok: boolean
    error?: string
    warning?: string
}

const DEV_DEFAULT_SAVE_WARNING =
    'Template-urile au fost salvate local, dar defaultTemplates.oc.json nu a putut fi actualizat.'

export type TemplateDocumentContextValue = {
    document: TemplateDocument
    defaultDocument: TemplateDocument
    isLoaded: boolean
    isDirty: boolean
    updateTemplate(entityType: EditableTemplateEntityType, template: BroadcastTemplate): void
    resetTemplateToDefault(entityType: EditableTemplateEntityType): void
    discardUnsavedChanges(): void
    saveTemplates(): Promise<SaveTemplatesResult>
    markClean(): void
}

const TemplateDocumentContext = createContext<TemplateDocumentContextValue | null>(null)

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

function hydrateRuntimeAssets(document: TemplateDocument): TemplateDocument {
    const nextDocument = clone(document)
    const backgroundMap: Record<string, string> = {
        'src/assets/bg/OC_bg.png': ocBg,
        'src/assets/bg/OC__phone_bg.png': ocPhoneBg,
    }

    for (const template of Object.values(nextDocument.templates)) {
        const background = template.canvas.background
        if (background.type === 'image') {
            background.value = backgroundMap[background.value] ?? background.value
        }
    }

    return nextDocument
}

function dehydrateRuntimeAssets(document: TemplateDocument): TemplateDocument {
    const nextDocument = clone(document)
    const backgroundMap: Record<string, string> = {
        [ocBg]: 'src/assets/bg/OC_bg.png',
        [ocPhoneBg]: 'src/assets/bg/OC__phone_bg.png',
    }

    for (const template of Object.values(nextDocument.templates)) {
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

            if (!isMounted) return

            setDefaultDocument(nextDefaultDocument)
            setDocument(nextDocument)
            setCleanDocument(nextDocument)
            setIsDirty(false)
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
        }))
        setIsDirty(true)
    }, [])

    const resetTemplateToDefault = useCallback((entityType: EditableTemplateEntityType) => {
        setDocument((currentDocument) => ({
            ...currentDocument,
            templates: {
                ...currentDocument.templates,
                [entityType]: clone(defaultDocument.templates[entityType]),
            },
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
        resetTemplateToDefault,
        discardUnsavedChanges,
        saveTemplates,
        markClean,
    }), [
        document,
        defaultDocument,
        isLoaded,
        isDirty,
        updateTemplate,
        resetTemplateToDefault,
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

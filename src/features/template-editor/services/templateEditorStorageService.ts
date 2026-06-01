import type { TemplateDocument } from '@/features/template-editor/domain/templateDocument'

type GetUserTemplateDocumentResult = {
    ok: boolean
    document: unknown | null
    error?: string
}

type SaveTemplateDocumentResult = {
    ok: boolean
    error?: string
}

type SaveDevDefaultTemplateDocumentResult = {
    ok: boolean
    skipped?: boolean
    error?: string
}

function getApi() {
    return (window as any)?.electronAPI
}

function getError(error: unknown) {
    return error instanceof Error ? error.message : 'IPC_FAILED'
}

export const templateEditorStorageService = {
    async getUserTemplateDocument(): Promise<GetUserTemplateDocumentResult> {
        const api = getApi()
        if (!api) {
            return { ok: false, document: null, error: 'electronAPI not available' }
        }

        try {
            const response = await api.getUserTemplateDocument()
            if (!response || typeof response !== 'object') {
                return { ok: false, document: null, error: 'NO_RESPONSE' }
            }

            return {
                ok: Boolean(response.ok),
                document: 'document' in response ? response.document ?? null : null,
                error: typeof response.error === 'string' ? response.error : undefined,
            }
        } catch (error) {
            return { ok: false, document: null, error: getError(error) }
        }
    },

    async saveUserTemplateDocument(
        document: TemplateDocument
    ): Promise<SaveTemplateDocumentResult> {
        const api = getApi()
        if (!api) {
            return { ok: false, error: 'electronAPI not available' }
        }

        try {
            const response = await api.saveUserTemplateDocument({ document })
            if (!response || typeof response !== 'object') {
                return { ok: false, error: 'NO_RESPONSE' }
            }

            return {
                ok: Boolean(response.ok),
                error: typeof response.error === 'string' ? response.error : undefined,
            }
        } catch (error) {
            return { ok: false, error: getError(error) }
        }
    },

    async saveDevDefaultTemplateDocument(
        document: TemplateDocument
    ): Promise<SaveDevDefaultTemplateDocumentResult> {
        const api = getApi()
        if (!api) {
            return { ok: false, error: 'electronAPI not available' }
        }

        try {
            const response = await api.saveDevDefaultTemplateDocument({ document })
            if (!response || typeof response !== 'object') {
                return { ok: false, error: 'NO_RESPONSE' }
            }

            return {
                ok: Boolean(response.ok),
                skipped: Boolean(response.skipped),
                error: typeof response.error === 'string' ? response.error : undefined,
            }
        } catch (error) {
            return { ok: false, error: getError(error) }
        }
    },
}

export const getUserTemplateDocument = templateEditorStorageService.getUserTemplateDocument
export const saveUserTemplateDocument = templateEditorStorageService.saveUserTemplateDocument
export const saveDevDefaultTemplateDocument = templateEditorStorageService.saveDevDefaultTemplateDocument

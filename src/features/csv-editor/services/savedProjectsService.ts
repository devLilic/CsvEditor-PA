import type {
    CsvProjectDeleteResponse,
    CsvProjectListResponse,
    CsvProjectLoadIntoWorkingResponse,
    CsvProjectSaveAsResponse,
} from '@/shared/ipc-types'

function getApi() {
    const api = (window as any)?.electronAPI

    if (!api) {
        throw new Error('electronAPI not available')
    }

    return api
}

export const savedProjectsService = {
    async listSavedProjects(): Promise<CsvProjectListResponse> {
        try {
            const res = await getApi().listSavedCsvProjects()
            return res ?? { ok: false, files: [], error: 'NO_RESPONSE' }
        } catch {
            return { ok: false, files: [], error: 'IPC_FAILED' }
        }
    },

    async saveCurrentAsProject(input: {
        filename: string
        content: string
    }): Promise<CsvProjectSaveAsResponse> {
        if (typeof input.filename !== 'string' || typeof input.content !== 'string') {
            return { ok: false, error: 'INVALID_INPUT' }
        }

        try {
            const res = await getApi().saveCsvProjectAs(input)
            return res ?? { ok: false, error: 'NO_RESPONSE' }
        } catch {
            return { ok: false, error: 'IPC_FAILED' }
        }
    },

    async loadProjectIntoWorkingCsv(input: {
        filename: string
    }): Promise<CsvProjectLoadIntoWorkingResponse> {
        if (typeof input.filename !== 'string') {
            return { ok: false, error: 'INVALID_INPUT' }
        }

        try {
            const res = await getApi().loadCsvProjectIntoWorking(input)
            return res ?? { ok: false, error: 'NO_RESPONSE' }
        } catch {
            return { ok: false, error: 'IPC_FAILED' }
        }
    },

    async deleteSavedProject(input: {
        filename: string
    }): Promise<CsvProjectDeleteResponse> {
        if (typeof input.filename !== 'string') {
            return { ok: false, error: 'INVALID_INPUT' }
        }

        try {
            const res = await getApi().deleteCsvProject(input)
            return res ?? { ok: false, error: 'NO_RESPONSE' }
        } catch {
            return { ok: false, error: 'IPC_FAILED' }
        }
    },
}

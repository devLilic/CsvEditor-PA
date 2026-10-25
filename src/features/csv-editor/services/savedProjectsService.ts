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
    async listSavedProjects(projectId?: string): Promise<CsvProjectListResponse> {
        try {
            const res = projectId ? await getApi().listSavedCsvProjects(projectId) : await getApi().listSavedCsvProjects()
            return res ?? { ok: false, files: [], error: 'NO_RESPONSE' }
        } catch {
            return { ok: false, files: [], error: 'IPC_FAILED' }
        }
    },

    async saveCurrentAsProject(input: {
        filename: string
        content: string
    }, projectId?: string): Promise<CsvProjectSaveAsResponse> {
        if (typeof input.filename !== 'string' || typeof input.content !== 'string') {
            return { ok: false, error: 'INVALID_INPUT' }
        }

        try {
            const res = projectId ? await getApi().saveCsvProjectAs(input, projectId) : await getApi().saveCsvProjectAs(input)
            return res ?? { ok: false, error: 'NO_RESPONSE' }
        } catch {
            return { ok: false, error: 'IPC_FAILED' }
        }
    },

    async loadProjectIntoWorkingCsv(input: {
        filename: string
    }, projectId?: string): Promise<CsvProjectLoadIntoWorkingResponse> {
        if (typeof input.filename !== 'string') {
            return { ok: false, error: 'INVALID_INPUT' }
        }

        try {
            const res = projectId ? await getApi().loadCsvProjectIntoWorking(input, projectId) : await getApi().loadCsvProjectIntoWorking(input)
            return res ?? { ok: false, error: 'NO_RESPONSE' }
        } catch {
            return { ok: false, error: 'IPC_FAILED' }
        }
    },

    async deleteSavedProject(input: {
        filename: string
    }, projectId?: string): Promise<CsvProjectDeleteResponse> {
        if (typeof input.filename !== 'string') {
            return { ok: false, error: 'INVALID_INPUT' }
        }

        try {
            const res = projectId ? await getApi().deleteCsvProject(input, projectId) : await getApi().deleteCsvProject(input)
            return res ?? { ok: false, error: 'NO_RESPONSE' }
        } catch {
            return { ok: false, error: 'IPC_FAILED' }
        }
    },
}

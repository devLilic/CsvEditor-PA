import type { ShowProject, ShowProjectsState } from '../domain/showProject'

function getApi() { return (window as any)?.electronAPI }
function getError(error: unknown) { return error instanceof Error ? error.message : 'IPC_FAILED' }
function normalizeStateResponse(response: any) {
    return { ok: Boolean(response?.ok), state: response?.state ?? null, error: typeof response?.error === 'string' ? response.error : undefined }
}

export const showProjectStorageService = {
    async get(): Promise<{ ok: boolean; state: ShowProjectsState | null; error?: string }> {
        const api = getApi()
        if (!api) return { ok: false, state: null, error: 'electronAPI not available' }
        try { return normalizeStateResponse(await api.getShowProjects()) } catch (error) { return { ok: false, state: null, error: getError(error) } }
    },
    async save(state: ShowProjectsState): Promise<{ ok: boolean; state?: ShowProjectsState; error?: string }> {
        const api = getApi()
        if (!api) return { ok: false, error: 'electronAPI not available' }
        try {
            const response = await api.saveShowProjects({ state })
            return { ok: Boolean(response?.ok), state: response?.state ?? undefined, error: typeof response?.error === 'string' ? response.error : undefined }
        } catch (error) { return { ok: false, error: getError(error) } }
    },
    async saveProject(project: ShowProject, workspacePath?: string): Promise<{ ok: boolean; state: ShowProjectsState | null; error?: string }> {
        const api = getApi()
        if (!api) return { ok: false, state: null, error: 'electronAPI not available' }
        try { return normalizeStateResponse(await api.saveShowProject({ project, workspacePath })) } catch (error) { return { ok: false, state: null, error: getError(error) } }
    },
    async deleteProject(projectId: string): Promise<{ ok: boolean; state: ShowProjectsState | null; error?: string }> {
        const api = getApi()
        if (!api) return { ok: false, state: null, error: 'electronAPI not available' }
        try { return normalizeStateResponse(await api.deleteShowProject({ projectId })) } catch (error) { return { ok: false, state: null, error: getError(error) } }
    },
    async activate(request: { projectId: string }): Promise<{ ok: boolean; state: ShowProjectsState | null; error?: string }> {
        const api = getApi()
        if (!api) return { ok: false, state: null, error: 'electronAPI not available' }
        try { return normalizeStateResponse(await api.activateShowProject(request)) } catch (error) { return { ok: false, state: null, error: getError(error) } }
    },
    async assignLegacyWorkspace(request: { projectId: string }): Promise<{ ok: boolean; state: ShowProjectsState | null; error?: string }> {
        const api = getApi()
        if (!api) return { ok: false, state: null, error: 'electronAPI not available' }
        try { return normalizeStateResponse(await api.assignLegacyShowWorkspace(request)) } catch (error) { return { ok: false, state: null, error: getError(error) } }
    },
    async import(): Promise<{ ok: boolean; project: ShowProject | null; canceled?: boolean; error?: string }> {
        const api = getApi()
        if (!api) return { ok: false, project: null, error: 'electronAPI not available' }
        try {
            const response = await api.importShowProject()
            return { ok: Boolean(response?.ok), project: response?.project ?? null, canceled: response?.project === null, error: typeof response?.error === 'string' ? response.error : undefined }
        } catch (error) { return { ok: false, project: null, error: getError(error) } }
    },
    async export(project: ShowProject): Promise<{ ok: boolean; canceled?: boolean; path?: string; error?: string }> {
        const api = getApi()
        if (!api) return { ok: false, error: 'electronAPI not available' }
        try {
            const response = await api.exportShowProject({ project })
            return { ok: Boolean(response?.ok), canceled: Boolean(response?.canceled), path: typeof response?.path === 'string' ? response.path : undefined, error: typeof response?.error === 'string' ? response.error : undefined }
        } catch (error) { return { ok: false, error: getError(error) } }
    },
}

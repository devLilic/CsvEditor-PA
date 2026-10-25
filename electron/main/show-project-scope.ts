import { AsyncLocalStorage } from 'node:async_hooks'
import { ipcMain } from 'electron'
import type { ShowProject } from '../../src/features/show-projects/domain/showProject'
import { getActiveShowProject } from '../../src/features/show-projects/domain/showProject'
import { initializeShowProjectRepository, getShowProjectsStateSync } from './show-project-repository'
import { getLegacyShowSettingsSnapshot } from '../store'
import { ensureProjectWorkspaceFolders } from './project-workspace'

type Scope = { showProjectId?: string; showProject?: ShowProject; workspaceRoot?: string; workspaceFolders?: Awaited<ReturnType<typeof ensureProjectWorkspaceFolders>> }
const scopeStorage = new AsyncLocalStorage<Scope>()
const perShowQueues = new Map<string, Promise<unknown>>()

export function getScopedShowProject(): ShowProject | undefined { return scopeStorage.getStore()?.showProject }
export function getScopedShowProjectId(): string | undefined { return scopeStorage.getStore()?.showProjectId }
export function getScopedWorkspaceRoot(): string | undefined { return scopeStorage.getStore()?.workspaceRoot }
export function getScopedWorkspaceFolders() { return scopeStorage.getStore()?.workspaceFolders }

function needsWorkspace(channel: string) {
    return /^(csv:|csv-project:|title-backup:|phone-image:|quick-titles:)/.test(channel)
}

function isMutation(channel: string) {
    return /write|save|delete|load|create-backup|reserve|clear|set|export/i.test(channel)
        && !channel.includes('show-projects:')
}

async function resolveScope(showProjectId?: string, channel = ''): Promise<Scope> {
    const state = await initializeShowProjectRepository(getLegacyShowSettingsSnapshot())
    if (!state) {
        if (showProjectId) throw new Error('SHOW_PROJECT_NOT_FOUND')
        return {}
    }
    const id = showProjectId || state.activeProjectId
    const project = state.projects.find((candidate) => candidate.id === id)
    if (!project) throw new Error('SHOW_PROJECT_NOT_FOUND')
    const root = state.workspaces[id]
    if (!root && needsWorkspace(channel)) throw new Error('SHOW_PROJECT_WORKSPACE_REQUIRED')
    const workspaceFolders = root ? await ensureProjectWorkspaceFolders(root) : undefined
    return { showProjectId: id, showProject: project, workspaceRoot: root, workspaceFolders }
}

/** Explicit operation scope freezes project config and resolved workspace across awaits. */
export async function withShowProjectScope<T>(showProjectId: string | undefined, callback: () => T | Promise<T>, channel = 'content'): Promise<T> {
    const scope = await resolveScope(showProjectId, channel)
    return scopeStorage.run(scope, callback)
}

/** Register an IPC handler whose final optional argument carries { showProjectId }. */
export function scopedIpcHandle(channel: string, handler: (...args: any[]) => unknown) {
    ipcMain.handle(channel, async (event, ...inputArgs: unknown[]) => {
        const last = inputArgs[inputArgs.length - 1]
        const hasScope = !!last && typeof last === 'object' && !Array.isArray(last) && 'showProjectId' in last
        const scopeArg = hasScope ? last as { showProjectId?: unknown } : undefined
        const args = hasScope ? inputArgs.slice(0, -1) : inputArgs
        const id = typeof scopeArg?.showProjectId === 'string' && scopeArg.showProjectId ? scopeArg.showProjectId : undefined
        const invoke = async () => withShowProjectScope(id, () => handler(event, ...args), channel)
        try {
            if (!isMutation(channel)) return await invoke()
            // Preserve ordering of writes for one edition so autosave and explicit flushes cannot race.
            const key = id ?? getShowProjectsStateSync()?.activeProjectId ?? '__legacy__'
            const previous = perShowQueues.get(key) ?? Promise.resolve()
            const current = previous.catch(() => undefined).then(invoke)
            perShowQueues.set(key, current)
            try { return await current } finally { if (perShowQueues.get(key) === current) perShowQueues.delete(key) }
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : 'SHOW_PROJECT_SCOPE_FAILED' }
        }
    })
}

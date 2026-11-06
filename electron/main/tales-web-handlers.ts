import { app, ipcMain, safeStorage } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { writeFile as writeFileAtomically } from 'atomically'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import { collectTemplateAssetIds, rewriteTemplateAssetReferences } from '../../src/features/tales-web/domain/templateAssets'
import type {
    TalesWebApiResult,
    TalesWebEdition,
    TalesWebEditionDetail,
    TalesWebImportResult,
    TalesWebConnectionRequest,
    TalesWebSessionInfo,
    TalesWebShow,
    TalesWebTemplateConfig,
} from '../../src/shared/ipc-types'
import { getPhoneImageSettings } from '../store'
import { getScopedWorkspaceRoot, scopedIpcHandle } from './show-project-scope'

type StoredSession = { baseUrl: string; token: string }
const fsp = fs.promises
let registered = false

function sessionFilePath(): string {
    return path.join(app.getPath('userData'), 'tales-web-session.bin')
}

function safePublicSession(session: StoredSession | null): TalesWebSessionInfo {
    return session
        ? { connected: true, baseUrl: session.baseUrl }
        : { connected: false }
}

async function readSession(): Promise<StoredSession | null> {
    if (!safeStorage.isEncryptionAvailable()) return null
    try {
        const encrypted = await fsp.readFile(sessionFilePath())
        const parsed = JSON.parse(safeStorage.decryptString(encrypted)) as Partial<StoredSession>
        if (typeof parsed.baseUrl !== 'string' || typeof parsed.token !== 'string') return null
        return parsed as StoredSession
    } catch {
        return null
    }
}

async function saveSession(session: StoredSession): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Stocarea securizată nu este disponibilă pe acest calculator.')
    const encrypted = safeStorage.encryptString(JSON.stringify(session))
    await fsp.mkdir(path.dirname(sessionFilePath()), { recursive: true })
    await writeFileAtomically(sessionFilePath(), encrypted)
}

async function clearSession(): Promise<void> {
    await fsp.unlink(sessionFilePath()).catch(() => undefined)
}

function normalizeBaseUrl(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null
    try {
        const parsed = new URL(value.trim())
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== '/' && parsed.pathname !== '')) return null
        return parsed.origin
    } catch {
        return null
    }
}

function errorMessage(value: unknown, fallback: string): string {
    if (value && typeof value === 'object' && 'message' in value && typeof (value as { message?: unknown }).message === 'string') {
        return (value as { message: string }).message
    }
    return fallback
}

async function requestJson<T>(session: StoredSession, route: string, init: RequestInit = {}): Promise<TalesWebApiResult<T>> {
    try {
        const response = await fetch(`${session.baseUrl}${route}`, {
            ...init,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${session.token}`,
                ...(init.headers ?? {}),
            },
            signal: AbortSignal.timeout(30_000),
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) return { ok: false, error: errorMessage(body, `Tales Web a răspuns cu HTTP ${response.status}.`) }
        return { ok: true, data: body as T }
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Conexiunea cu Tales Web a eșuat.' }
    }
}

function isConnectionRequest(value: unknown): value is TalesWebConnectionRequest {
    if (!value || typeof value !== 'object') return false
    const item = value as Partial<TalesWebConnectionRequest>
    return typeof item.baseUrl === 'string' && typeof item.token === 'string'
}

function routeId(value: unknown): number | null {
    const id = typeof value === 'number' ? value : Number(value)
    return Number.isSafeInteger(id) && id > 0 ? id : null
}

function collectPhoneAssetIds(content: TalesWebEditionDetail['content']): string[] {
    const ids = new Set<string>()
    for (const section of content.sections ?? []) {
        for (const row of section.rows ?? []) {
            const image = row.person?.image
            const match = typeof image === 'string' ? image.trim().match(/^asset:([0-9a-f-]{36})$/i) : null
            if (match) ids.add(match[1].toLowerCase())
        }
    }
    return [...ids]
}

function imageExtension(contentType: string | null): string | null {
    const type = contentType?.split(';')[0]?.trim().toLowerCase()
    if (type === 'image/jpeg') return '.jpg'
    if (type === 'image/png') return '.png'
    if (type === 'image/webp') return '.webp'
    return null
}

async function downloadPhoneAssets(
    session: StoredSession,
    showId: number,
    editionId: number,
    content: TalesWebEditionDetail['content'],
): Promise<{ ok: true; content: TalesWebEditionDetail['content'] } | { ok: false; error: string }> {
    const assetIds = collectPhoneAssetIds(content)
    if (assetIds.length === 0) return { ok: true, content }

    const { workPath } = getPhoneImageSettings()
    if (!workPath.trim()) return { ok: false, error: 'Folderul Telefon al emisiunii nu este configurat.' }
    const stat = await fsp.stat(workPath).catch(() => null)
    if (!stat?.isDirectory()) return { ok: false, error: 'Folderul Telefon al emisiunii nu există.' }
    await fsp.access(workPath, fs.constants.W_OK).catch(() => { throw new Error('Folderul Telefon al emisiunii nu permite scriere.') })

    const paths = new Map<string, string>()
    for (const assetId of assetIds) {
        const response = await fetch(`${session.baseUrl}/api/desktop/shows/${showId}/editions/${editionId}/assets/${assetId}`, {
            headers: { Accept: 'image/*', Authorization: `Bearer ${session.token}` },
            signal: AbortSignal.timeout(60_000),
        }).catch((error) => { throw new Error(error instanceof Error ? error.message : 'Imaginea din Tales Web nu a putut fi descărcată.') })
        if (!response.ok) {
            const body = await response.json().catch(() => null)
            throw new Error(errorMessage(body, `Imaginea din Tales Web nu a putut fi descărcată (HTTP ${response.status}).`))
        }
        const extension = imageExtension(response.headers.get('content-type'))
        if (!extension) throw new Error('Tales Web a returnat un format de imagine neacceptat.')
        const filename = `${assetId}${extension}`
        const target = path.resolve(workPath, filename)
        if (path.dirname(target) !== path.resolve(workPath)) throw new Error('Calea imaginii Tales Web nu este sigură.')
        const bytes = Buffer.from(await response.arrayBuffer())
        if (bytes.length === 0) throw new Error('Imaginea din Tales Web este goală.')
        await fsp.writeFile(target, bytes)
        paths.set(assetId, target)
    }

    const rewritten = structuredClone(content)
    for (const section of rewritten.sections ?? []) {
        for (const row of section.rows ?? []) {
            const image = row.person?.image
            const match = typeof image === 'string' ? image.trim().match(/^asset:([0-9a-f-]{36})$/i) : null
            if (match && row.person) row.person.image = paths.get(match[1].toLowerCase()) ?? image
        }
    }
    return { ok: true, content: rewritten }
}

async function downloadTemplateAssets(
    session: StoredSession,
    showId: number,
    editionId: number,
    document: TalesWebTemplateConfig['document'],
): Promise<{ ok: true; document: TalesWebTemplateConfig['document'] } | { ok: false; error: string }> {
    if (!document) return { ok: true, document }
    const assetIds = collectTemplateAssetIds(document)
    if (assetIds.length === 0) return { ok: true, document }

    const phoneWorkPath = getPhoneImageSettings().workPath
    if (!phoneWorkPath.trim()) return { ok: false, error: 'Folderul Telefon al emisiunii nu este configurat.' }
    const phoneFolder = path.resolve(phoneWorkPath)
    const stat = await fsp.stat(phoneFolder).catch(() => null)
    if (!stat?.isDirectory()) return { ok: false, error: 'Folderul Telefon al emisiunii nu există.' }

    const assetFolder = path.resolve(phoneFolder, 'TalesWebTED')
    if (path.dirname(assetFolder) !== phoneFolder) return { ok: false, error: 'Folderul imaginilor TED nu este sigur.' }
    await fsp.mkdir(assetFolder, { recursive: true })
    await fsp.access(assetFolder, fs.constants.W_OK).catch(() => { throw new Error('Folderul imaginilor TED nu permite scriere.') })

    const paths = new Map<string, string>()
    for (const assetId of assetIds) {
        const response = await fetch(`${session.baseUrl}/api/desktop/shows/${showId}/editions/${editionId}/assets/${assetId}`, {
            headers: { Accept: 'image/*', Authorization: `Bearer ${session.token}` },
            signal: AbortSignal.timeout(60_000),
        }).catch((error) => { throw new Error(error instanceof Error ? error.message : 'Imaginea din template-ul TED nu a putut fi descărcată.') })
        if (!response.ok) {
            const body = await response.json().catch(() => null)
            throw new Error(errorMessage(body, `Imaginea din template-ul TED nu a putut fi descărcată (HTTP ${response.status}).`))
        }
        const extension = imageExtension(response.headers.get('content-type'))
        if (!extension) throw new Error('Tales Web a returnat un format de imagine TED neacceptat.')
        const filename = `${assetId}${extension}`
        const target = path.resolve(assetFolder, filename)
        if (path.dirname(target) !== assetFolder) throw new Error('Calea imaginii TED nu este sigură.')
        const bytes = Buffer.from(await response.arrayBuffer())
        if (bytes.length === 0) throw new Error('Imaginea din template-ul TED este goală.')
        await fsp.writeFile(target, bytes)
        paths.set(assetId, target)
    }

    return { ok: true, document: rewriteTemplateAssetReferences(document, paths) }
}

export function registerTalesWebHandlers(): void {
    if (registered) return
    registered = true

    ipcMain.handle(IPC_CHANNELS.TALES_WEB_GET_SESSION, async () => safePublicSession(await readSession()))

    ipcMain.handle(IPC_CHANNELS.TALES_WEB_CONNECT, async (_event, request: unknown): Promise<TalesWebApiResult<TalesWebSessionInfo>> => {
        if (!isConnectionRequest(request)) return { ok: false, error: 'Adresa sau secretul de integrare lipsește.' }
        const baseUrl = normalizeBaseUrl(request.baseUrl)
        if (!baseUrl) return { ok: false, error: 'Introdu o adresă Tales Web validă, de exemplu http://tales.test.' }
        if (request.token.trim().length < 24) return { ok: false, error: 'Secretul de integrare nu este valid.' }
        const candidate: StoredSession = { baseUrl, token: request.token.trim() }
        const validation = await requestJson<{ shows: TalesWebShow[] }>(candidate, '/api/desktop/shows')
        if (!validation.ok) return validation
        try {
            await saveSession(candidate)
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : 'Conexiunea nu a putut fi salvată securizat.' }
        }
        return { ok: true, data: safePublicSession(candidate) }
    })

    ipcMain.handle(IPC_CHANNELS.TALES_WEB_DISCONNECT, async (): Promise<TalesWebApiResult<void>> => {
        await clearSession()
        return { ok: true, data: undefined }
    })

    ipcMain.handle(IPC_CHANNELS.TALES_WEB_LIST_SHOWS, async (): Promise<TalesWebApiResult<TalesWebShow[]>> => {
        const session = await readSession()
        if (!session) return { ok: false, error: 'Conectează-te mai întâi la Tales Web.' }
        const response = await requestJson<{ shows: TalesWebShow[] }>(session, '/api/desktop/shows')
        return response.ok ? { ok: true, data: response.data.shows ?? [] } : response
    })

    ipcMain.handle(IPC_CHANNELS.TALES_WEB_LIST_EDITIONS, async (_event, request: unknown): Promise<TalesWebApiResult<TalesWebEdition[]>> => {
        const showId = request && typeof request === 'object' ? routeId((request as { showId?: unknown }).showId) : null
        if (!showId) return { ok: false, error: 'Emisiunea selectată nu este validă.' }
        const session = await readSession()
        if (!session) return { ok: false, error: 'Conectează-te mai întâi la Tales Web.' }
        const response = await requestJson<{ editions: TalesWebEdition[] }>(session, `/api/desktop/shows/${showId}/editions`)
        return response.ok ? { ok: true, data: response.data.editions ?? [] } : response
    })

    scopedIpcHandle(IPC_CHANNELS.TALES_WEB_IMPORT_EDITION, async (_event, request: unknown): Promise<TalesWebApiResult<TalesWebImportResult>> => {
        const value = request && typeof request === 'object' ? request as { showId?: unknown; editionId?: unknown } : {}
        const showId = routeId(value.showId)
        const editionId = routeId(value.editionId)
        if (!showId || !editionId) return { ok: false, error: 'Emisiunea sau ediția selectată nu este validă.' }
        const session = await readSession()
        if (!session) return { ok: false, error: 'Conectează-te mai întâi la Tales Web.' }
        const base = `/api/desktop/shows/${showId}/editions/${editionId}`
        const [editionResponse, templateResponse] = await Promise.all([
            requestJson<TalesWebEditionDetail>(session, base),
            requestJson<{ template: TalesWebTemplateConfig }>(session, `${base}/template`),
        ])
        if (!editionResponse.ok) return editionResponse
        if (!templateResponse.ok) return templateResponse
        const downloaded = await downloadPhoneAssets(session, showId, editionId, editionResponse.data.content).catch((error) => ({ ok: false as const, error: error instanceof Error ? error.message : 'Imaginile telefonului nu au putut fi preluate.' }))
        if (!downloaded.ok) return downloaded
        const templateAssets = await downloadTemplateAssets(session, showId, editionId, templateResponse.data.template.document).catch((error) => ({ ok: false as const, error: error instanceof Error ? error.message : 'Imaginile template-ului TED nu au putut fi preluate.' }))
        if (!templateAssets.ok) return templateAssets
        return {
            ok: true,
            data: {
                edition: editionResponse.data.edition,
                content: downloaded.content,
                quickTitles: editionResponse.data.quickTitles ?? [],
                template: { ...templateResponse.data.template, document: templateAssets.document },
            },
        }
    })
}

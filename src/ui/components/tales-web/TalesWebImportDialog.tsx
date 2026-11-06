import { useEffect, useMemo, useState } from 'react'
import type {
    TalesWebEdition,
    TalesWebImportResult,
    TalesWebSessionInfo,
    TalesWebShow,
} from '@/shared/ipc-types'

type Props = {
    open: boolean
    activeShowName: string
    onClose(): void
    onImport(result: TalesWebImportResult): Promise<void>
}

const DEFAULT_BASE_URL = 'http://tales.test'

function normalizedName(value: string): string {
    return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
}

function formatEdition(edition: TalesWebEdition): string {
    const date = edition.broadcastAt ? new Date(edition.broadcastAt).toLocaleDateString() : null
    return [edition.name, date, `rev. ${edition.revision}`, edition.archived ? 'Arhivată' : null]
        .filter(Boolean).join(' · ')
}

export function TalesWebImportDialog({ open, activeShowName, onClose, onImport }: Props) {
    const [session, setSession] = useState<TalesWebSessionInfo>({ connected: false })
    const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL)
    const [token, setToken] = useState('')
    const [shows, setShows] = useState<TalesWebShow[]>([])
    const [editions, setEditions] = useState<TalesWebEdition[]>([])
    const [showId, setShowId] = useState('')
    const [editionId, setEditionId] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [confirmImport, setConfirmImport] = useState(false)

    const matchedShowId = useMemo(() => {
        const matches = shows.filter((show) => normalizedName(show.name) === normalizedName(activeShowName))
        return matches.length === 1 ? String(matches[0].id) : ''
    }, [shows, activeShowName])

    useEffect(() => {
        if (!open) return
        let alive = true
        setError('')
        void window.electronAPI.getTalesWebSession().then(async (value) => {
            if (!alive) return
            setSession(value)
            if (value.baseUrl) setBaseUrl(value.baseUrl)
            if (!value.connected) return
            const response = await window.electronAPI.listTalesWebShows()
            if (!alive) return
            if (!response.ok) { setError(response.error); return }
            setShows(response.data)
        }).catch((reason) => { if (alive) setError(reason instanceof Error ? reason.message : 'Sesiunea Tales Web nu a putut fi citită.') })
        return () => { alive = false }
    }, [open])

    useEffect(() => {
        if (!open || !shows.length) return
        setShowId((current) => current && shows.some((show) => String(show.id) === current) ? current : matchedShowId || '')
    }, [open, shows, matchedShowId])

    useEffect(() => {
        if (!open || !showId) { setEditions([]); setEditionId(''); return }
        let alive = true
        setBusy(true)
        setError('')
        void window.electronAPI.listTalesWebEditions({ showId: Number(showId) }).then((response) => {
            if (!alive) return
            if (!response.ok) { setError(response.error); setEditions([]); return }
            setEditions(response.data)
            setEditionId('')
        }).catch((reason) => { if (alive) setError(reason instanceof Error ? reason.message : 'Edițiile nu au putut fi încărcate.') })
            .finally(() => { if (alive) setBusy(false) })
        return () => { alive = false }
    }, [open, showId])

    if (!open) return null

    const handleConnect = async (event: React.FormEvent) => {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
            const result = await window.electronAPI.connectTalesWeb({ baseUrl, token })
            if (!result.ok) { setError(result.error); return }
            setSession(result.data)
            setToken('')
            const showsResult = await window.electronAPI.listTalesWebShows()
            if (!showsResult.ok) { setError(showsResult.error); return }
            setShows(showsResult.data)
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Conectarea la Tales Web a eșuat.')
        } finally { setBusy(false) }
    }

    const handleLogout = async () => {
        setBusy(true)
        setError('')
        const result = await window.electronAPI.disconnectTalesWeb()
        setSession({ connected: false })
        setShows([])
        setEditions([])
        setShowId('')
        setEditionId('')
        setBusy(false)
        if (!result.ok) setError(result.error)
    }

    const handleImport = async () => {
        if (!showId || !editionId) return
        setBusy(true)
        setError('')
        try {
            const result = await window.electronAPI.importTalesWebEdition({ showId: Number(showId), editionId: Number(editionId) })
            if (!result.ok) { setError(result.error); return }
            await onImport(result.data)
            onClose()
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Ediția nu a putut fi importată.')
        } finally { setBusy(false) }
    }

    return (
        <div className="app-modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
            <section className="app-modal w-full max-w-xl rounded-xl bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="tales-web-import-title">
                <header className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 id="tales-web-import-title" className="text-lg font-semibold">Încarcă ediție din Tales Web</h2>
                        <p className="mt-1 text-sm text-slate-500">Conținutul ales va înlocui ediția locală curentă.</p>
                    </div>
                    <button type="button" onClick={onClose} className="app-button rounded border px-3 py-1" disabled={busy}>Închide</button>
                </header>

                {!session.connected ? (
                    <form onSubmit={(event) => void handleConnect(event)} className="grid gap-3">
                        <label className="grid gap-1 text-sm">Adresa Tales Web
                            <input className="app-input rounded border px-3 py-2" type="url" required value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder={DEFAULT_BASE_URL} />
                        </label>
                        <label className="grid gap-1 text-sm">Secret de integrare
                            <input className="app-input rounded border px-3 py-2" type="password" autoComplete="off" required value={token} onChange={(event) => setToken(event.target.value)} />
                        </label>
                        <div className="flex justify-end">
                            <button className="app-button app-button-primary rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" disabled={busy}>Conectează</button>
                        </div>
                    </form>
                ) : (
                    <div className="grid gap-3">
                        <div className="flex items-center justify-between rounded border bg-slate-50 px-3 py-2 text-sm">
                            <span>Conectat la <strong>{session.baseUrl}</strong></span>
                            <button type="button" className="app-button rounded border px-3 py-1" onClick={() => void handleLogout()} disabled={busy}>Schimbă secretul</button>
                        </div>
                        <label className="grid gap-1 text-sm">Emisiune
                            <select className="app-input rounded border px-3 py-2" value={showId} onChange={(event) => setShowId(event.target.value)} disabled={busy}>
                                <option value="">Alege emisiunea</option>
                                {shows.map((show) => <option key={show.id} value={show.id}>{show.name}</option>)}
                            </select>
                        </label>
                        {matchedShowId && showId === matchedShowId && <p className="-mt-2 text-xs text-slate-500">Emisiunea a fost selectată după numele proiectului local.</p>}
                        <label className="grid gap-1 text-sm">Ediție
                            <select className="app-input rounded border px-3 py-2" value={editionId} onChange={(event) => setEditionId(event.target.value)} disabled={busy || !showId || !editions.length}>
                                <option value="">{busy ? 'Se încarcă…' : 'Alege ediția'}</option>
                                {editions.map((edition) => <option key={edition.id} value={edition.id}>{formatEdition(edition)}</option>)}
                            </select>
                        </label>
                        <div className="flex justify-end">
                            {!confirmImport ? (
                                <button type="button" className="app-button app-button-primary rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" onClick={() => setConfirmImport(true)} disabled={busy || !showId || !editionId}>Încarcă ediția</button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="mr-2 text-xs text-slate-600">Va înlocui conținutul local; se creează backup.</span>
                                    <button type="button" className="app-button rounded border px-3 py-2" onClick={() => setConfirmImport(false)} disabled={busy}>Anulează</button>
                                    <button type="button" className="app-button app-button-primary rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" onClick={() => void handleImport()} disabled={busy}>Confirmă importul</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {error && <p role="alert" className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
            </section>
        </div>
    )
}

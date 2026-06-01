import { useEffect, useState } from 'react'
import type { PhoneImageSettings } from '@/features/csv-editor'
import { getPhoneImageDataUrl, listWorkPathImages } from '@/features/csv-editor/services/phoneImageService'
import type { PhoneImageWorkPathFile } from '@/shared/ipc-types'
import { PhoneImageEditor } from './PhoneImageEditor'

export type PhoneImageModalProps = {
    open: boolean
    settings: PhoneImageSettings
    initialFilename?: string
    suggestedFilename?: string
    onClose: () => void
    onSaved: (imageCsvValue: string) => void
}

export function PhoneImageModal({
    open,
    settings,
    initialFilename,
    suggestedFilename,
    onClose,
    onSaved,
}: PhoneImageModalProps) {
    const [error, setError] = useState<string | null>(null)
    const [existingImages, setExistingImages] = useState<PhoneImageWorkPathFile[]>([])
    const [existingImagesStatus, setExistingImagesStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
    const [existingImagesError, setExistingImagesError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing')
    const [selectedExistingImage, setSelectedExistingImage] = useState<PhoneImageWorkPathFile | null>(null)
    const [thumbnailStatus, setThumbnailStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
    const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null)
    const [thumbnailError, setThumbnailError] = useState<string | null>(null)
    const [existingImagesSearch, setExistingImagesSearch] = useState('')

    useEffect(() => {
        if (!open) return

        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
            }
        }

        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose, open])

    useEffect(() => {
        if (open) {
            setError(null)
            setActiveTab('existing')
            setSelectedExistingImage(null)
            setThumbnailStatus('idle')
            setThumbnailDataUrl(null)
            setThumbnailError(null)
            setExistingImagesSearch('')
        }
    }, [open])

    useEffect(() => {
        if (!open) return

        let isMounted = true
        setExistingImages([])
        setExistingImagesError(null)
        setExistingImagesStatus('loading')
        setSelectedExistingImage(null)
        setThumbnailStatus('idle')
        setThumbnailDataUrl(null)
        setThumbnailError(null)
        setExistingImagesSearch('')

        listWorkPathImages().then((result) => {
            if (!isMounted) return

            if (!result.ok) {
                setExistingImagesStatus('error')
                setExistingImagesError(result.error ?? 'LIST_FAILED')
                setExistingImages([])
                return
            }

            setExistingImages(result.files)
            setExistingImagesStatus('loaded')
        })

        return () => {
            isMounted = false
        }
    }, [open])

    useEffect(() => {
        if (!open || !selectedExistingImage) return

        let isMounted = true
        setThumbnailStatus('loading')
        setThumbnailDataUrl(null)
        setThumbnailError(null)

        getPhoneImageDataUrl({ filename: selectedExistingImage.filename }).then((result) => {
            if (!isMounted) return

            if (!result.ok || !result.dataUrl) {
                setThumbnailStatus('error')
                setThumbnailError(result.error ?? 'PREVIEW_FAILED')
                return
            }

            setThumbnailDataUrl(result.dataUrl)
            setThumbnailStatus('loaded')
        })

        return () => {
            isMounted = false
        }
    }, [open, selectedExistingImage])

    const existingImagesMessage = (() => {
        if (existingImagesStatus === 'loading') return 'Se încarcă pozele existente...'
        if (existingImagesStatus === 'error') {
            if (existingImagesError === 'WORK_PATH_NOT_SET') {
                return 'Folderul pentru imagini telefonice nu este setat.'
            }
            if (existingImagesError === 'WORK_PATH_NOT_FOUND') {
                return 'Folderul pentru imagini telefonice nu există.'
            }
            return 'Pozele existente nu au putut fi încărcate.'
        }
        if (existingImagesStatus === 'loaded' && existingImages.length === 0) {
            return 'Nu există poze .jpg în folderul pentru imagini telefonice.'
        }
        return null
    })()

    const normalizedExistingImagesSearch = existingImagesSearch.trim().toLocaleLowerCase()
    const visibleExistingImages = normalizedExistingImagesSearch.length >= 3
        ? existingImages.filter((file) =>
            file.filename.toLocaleLowerCase().includes(normalizedExistingImagesSearch)
        )
        : existingImages

    if (!open) {
        return null
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="phone-image-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="max-h-[96vh] w-full max-w-6xl overflow-y-auto rounded bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
                    <h2 id="phone-image-modal-title" className="text-lg font-semibold text-gray-900">
                        Adaugă poză apel telefonic
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        Închide
                    </button>
                </div>

                <div className="p-5">
                    {error && (
                        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="mb-4 grid grid-cols-2 rounded border border-gray-300 bg-gray-100 p-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('existing')}
                            className={`rounded px-3 py-2 text-sm font-medium ${
                                activeTab === 'existing'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Poze existente
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('new')}
                            className={`rounded px-3 py-2 text-sm font-medium ${
                                activeTab === 'new'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Încarcă poză nouă
                        </button>
                    </div>

                    {activeTab === 'existing' ? (
                        <section className="rounded border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Poze Existente
                                </h3>
                                <label className="w-full sm:max-w-xs">
                                    <span className="sr-only">Caută poze existente</span>
                                    <input
                                        type="search"
                                        value={existingImagesSearch}
                                        onChange={(event) => setExistingImagesSearch(event.target.value)}
                                        placeholder="Caută după minim 3 litere"
                                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </label>
                            </div>

                            {existingImagesMessage ? (
                                <div className="rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                                    {existingImagesMessage}
                                </div>
                            ) : visibleExistingImages.length === 0 ? (
                                <div className="rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                                    Nu există poze pentru această căutare.
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-[minmax(0,60%)_minmax(240px,1fr)]">
                                    <div className="flex max-h-[470px] flex-col divide-y divide-gray-200 overflow-y-auto rounded border border-gray-200 bg-white">
                                        {visibleExistingImages.map((file) => {
                                            const isSelected = selectedExistingImage?.imageCsvValue === file.imageCsvValue

                                            return (
                                                <div
                                                    key={file.imageCsvValue}
                                                    className={`flex items-center justify-between gap-3 px-3 py-2 ${
                                                        isSelected ? 'bg-blue-50' : ''
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedExistingImage(file)}
                                                        className="min-w-0 truncate text-left text-sm font-medium text-gray-800 hover:text-blue-700"
                                                    >
                                                        {file.filename}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onSaved(file.imageCsvValue)
                                                            onClose()
                                                        }}
                                                        className="shrink-0 rounded border border-blue-500 bg-white px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50"
                                                    >
                                                        Folosește
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <div className="flex min-h-[320px] items-center justify-center rounded border-2 border-blue-200 bg-white p-3 shadow-sm">
                                        {thumbnailStatus === 'idle' && (
                                            <div className="text-center text-xs text-gray-500">
                                                Selectează o poză pentru preview.
                                            </div>
                                        )}
                                        {thumbnailStatus === 'loading' && (
                                            <div className="text-center text-xs text-gray-500">
                                                Se încarcă preview-ul...
                                            </div>
                                        )}
                                        {thumbnailStatus === 'error' && (
                                            <div className="text-center text-xs text-red-600">
                                                Preview indisponibil.
                                                {thumbnailError && (
                                                    <span className="sr-only"> {thumbnailError}</span>
                                                )}
                                            </div>
                                        )}
                                        {thumbnailStatus === 'loaded' && thumbnailDataUrl && (
                                            <img
                                                src={thumbnailDataUrl}
                                                alt="Preview poză existentă"
                                                className="max-h-[300px] max-w-full rounded object-contain"
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>
                    ) : (
                        <section>
                            <h3 className="mb-3 text-sm font-semibold text-gray-900">
                                Încarcă poză nouă
                            </h3>
                            <PhoneImageEditor
                                settings={settings}
                                initialFilename={initialFilename}
                                suggestedFilename={suggestedFilename}
                                onCancel={onClose}
                                onError={setError}
                                onSaved={(imageCsvValue) => {
                                    onSaved(imageCsvValue)
                                    onClose()
                                }}
                            />
                        </section>
                    )}
                </div>
            </div>
        </div>
    )
}

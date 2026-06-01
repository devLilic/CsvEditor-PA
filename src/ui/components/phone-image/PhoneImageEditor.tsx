import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { PhoneImageSettings } from '@/features/csv-editor'
import { phoneImageService, sanitizeJpegFilename } from '@/features/csv-editor'
import {
    calculateInitialCoverTransform,
    calculateRenderedImageRect,
    calculateSourceCropRect,
    clampImageTransformToFrame,
    type ImageTransform,
} from '@/features/csv-editor/domain/phoneImageCropMath'

export type PhoneImageEditorProps = {
    settings: PhoneImageSettings
    initialFilename?: string
    suggestedFilename?: string
    onSaved: (imageCsvValue: string) => void
    onCancel: () => void
    onError: (error: string) => void
}

type LoadedImage = {
    fileUrl: string
    naturalWidth: number
    naturalHeight: number
}

type DragState = {
    pointerId: number
    startClientX: number
    startClientY: number
    startTransform: ImageTransform
}

function stripDataUrlPrefix(value: string): string {
    return value.replace(/^data:image\/jpe?g;base64,/, '')
}

function makeFilename(value: string): string {
    return sanitizeJpegFilename(value.trim() || 'phone-image')
}

export function PhoneImageEditor({
    settings,
    initialFilename,
    suggestedFilename = '',
    onSaved,
    onCancel,
    onError,
}: PhoneImageEditorProps) {
    const imageRef = useRef<HTMLImageElement>(null)
    const frameRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<DragState | null>(null)
    const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null)
    const [filename, setFilename] = useState(() => makeFilename(initialFilename ?? suggestedFilename))
    const [transform, setTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1 })
    const [isSaving, setIsSaving] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [isFlippedHorizontally, setIsFlippedHorizontally] = useState(false)

    useEffect(() => {
        setFilename(makeFilename(initialFilename ?? suggestedFilename))
    }, [initialFilename, suggestedFilename])

    useEffect(() => {
        return () => {
            if (loadedImage?.fileUrl) {
                URL.revokeObjectURL(loadedImage.fileUrl)
            }
        }
    }, [loadedImage?.fileUrl])

    const frameSize = useMemo(() => ({
        width: settings.width,
        height: settings.height,
    }), [settings.height, settings.width])

    const renderedImageRect = useMemo(() => {
        if (!loadedImage) return null

        return calculateRenderedImageRect({
            imageSize: {
                width: loadedImage.naturalWidth,
                height: loadedImage.naturalHeight,
            },
            transform,
        })
    }, [loadedImage, transform])

    const initialCoverTransform = useMemo(() => {
        if (!loadedImage) return null

        return calculateInitialCoverTransform({
            imageSize: {
                width: loadedImage.naturalWidth,
                height: loadedImage.naturalHeight,
            },
            frameSize,
        })
    }, [frameSize, loadedImage])

    const minZoom = initialCoverTransform?.scale ?? 1
    const maxZoom = minZoom * 3

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const nextUrl = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            setLoadedImage((current) => {
                if (current?.fileUrl) URL.revokeObjectURL(current.fileUrl)
                return {
                    fileUrl: nextUrl,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                }
            })
            const nextTransform = calculateInitialCoverTransform({
                imageSize: {
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                },
                frameSize,
            })
            setTransform(nextTransform)
            setIsFlippedHorizontally(false)
            if (!initialFilename?.trim() && !suggestedFilename.trim()) {
                setFilename(makeFilename(file.name))
            }
        }
        img.onerror = () => {
            URL.revokeObjectURL(nextUrl)
            onError('Imaginea nu a putut fi încărcată.')
        }
        img.src = nextUrl
    }

    const updateTransform = (nextTransform: ImageTransform) => {
        if (!loadedImage) return

        setTransform(clampImageTransformToFrame({
            imageSize: {
                width: loadedImage.naturalWidth,
                height: loadedImage.naturalHeight,
            },
            frameSize,
            transform: nextTransform,
        }))
    }

    const handleZoomChange = (value: number) => {
        if (!loadedImage) return

        const nextScale = Math.min(Math.max(value, minZoom), maxZoom)
        const frameCenterX = frameSize.width / 2
        const frameCenterY = frameSize.height / 2
        const sourceCenterX = (frameCenterX - transform.x) / transform.scale
        const sourceCenterY = (frameCenterY - transform.y) / transform.scale

        updateTransform({
            x: frameCenterX - sourceCenterX * nextScale,
            y: frameCenterY - sourceCenterY * nextScale,
            scale: nextScale,
        })
    }

    const frameDeltaFromPointer = (event: React.PointerEvent) => {
        const rect = frameRef.current?.getBoundingClientRect()
        if (!rect || rect.width <= 0 || rect.height <= 0 || !dragRef.current) {
            return { dx: 0, dy: 0 }
        }

        return {
            dx: (event.clientX - dragRef.current.startClientX) * (frameSize.width / rect.width),
            dy: (event.clientY - dragRef.current.startClientY) * (frameSize.height / rect.height),
        }
    }

    const handlePointerMove = (event: React.PointerEvent<HTMLImageElement>) => {
        if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return

        const { dx, dy } = frameDeltaFromPointer(event)
        updateTransform({
            ...dragRef.current.startTransform,
            x: dragRef.current.startTransform.x + dx,
            y: dragRef.current.startTransform.y + dy,
        })
    }

    const endDrag = (event: React.PointerEvent<HTMLImageElement>) => {
        if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
        dragRef.current = null
        setIsDragging(false)
    }

    const startDrag = (event: React.PointerEvent<HTMLImageElement>) => {
        if (!loadedImage) return

        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = {
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startTransform: transform,
        }
        setIsDragging(true)
    }

    const drawFinalImage = (): string | null => {
        const image = imageRef.current
        if (!image || !loadedImage) return null

        const canvas = document.createElement('canvas')
        canvas.width = settings.width
        canvas.height = settings.height

        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        const sourceCrop = calculateSourceCropRect({
            imageSize: {
                width: loadedImage.naturalWidth,
                height: loadedImage.naturalHeight,
            },
            frameSize,
            transform,
        })

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.save()
        if (isFlippedHorizontally) {
            ctx.translate(settings.width, 0)
            ctx.scale(-1, 1)
        }
        ctx.drawImage(
            image,
            sourceCrop.sx,
            sourceCrop.sy,
            sourceCrop.sWidth,
            sourceCrop.sHeight,
            0,
            0,
            settings.width,
            settings.height
        )
        ctx.restore()

        return stripDataUrlPrefix(canvas.toDataURL('image/jpeg', 0.92))
    }

    const handleSave = async () => {
        if (!loadedImage) {
            onError('Alege o imagine înainte de salvare.')
            return
        }

        const jpegBase64 = drawFinalImage()
        if (!jpegBase64) {
            onError('Imaginea finală nu a putut fi generată.')
            return
        }

        const finalFilename = makeFilename(filename)
        setFilename(finalFilename)
        setIsSaving(true)

        try {
            const result = await phoneImageService.saveFinalPhoneImage({
                filename: finalFilename,
                jpegBase64,
            })

            if (!result.ok || !result.imageCsvValue) {
                onError(result.error ?? 'Imaginea nu a putut fi salvată.')
                return
            }

            onSaved(result.imageCsvValue)
        } finally {
            setIsSaving(false)
        }
    }

    const previewBoxStyle = useMemo(() => {
        const maxPreviewHeight = 420

        return {
            aspectRatio: `${settings.width} / ${settings.height}`,
            maxWidth: `${(settings.width / settings.height) * maxPreviewHeight}px`,
        }
    }, [settings.width, settings.height])

    const imageStyle = renderedImageRect
        ? {
            left: `${(renderedImageRect.x / frameSize.width) * 100}%`,
            top: `${(renderedImageRect.y / frameSize.height) * 100}%`,
            width: `${(renderedImageRect.width / frameSize.width) * 100}%`,
            height: `${(renderedImageRect.height / frameSize.height) * 100}%`,
            transform: isFlippedHorizontally ? 'scaleX(-1)' : undefined,
        }
        : null

    return (
        <div className="grid gap-4 rounded border bg-white p-4 lg:grid-cols-[minmax(300px,420px)_minmax(280px,1fr)]">
            <div className="min-w-0">
                <div
                    ref={frameRef}
                    role="region"
                    aria-label="Zonă crop apel telefonic"
                    className="relative mx-auto w-full overflow-hidden rounded border-2 border-blue-600 bg-gray-100"
                    style={previewBoxStyle}
                >
                    {loadedImage ? (
                        <img
                            ref={imageRef}
                            src={loadedImage.fileUrl}
                            alt="Preview apel telefonic"
                            draggable={false}
                            className={`absolute max-w-none select-none touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                            style={imageStyle ?? undefined}
                            onPointerDown={startDrag}
                            onPointerMove={handlePointerMove}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                        />
                    ) : (
                        <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-gray-500">
                            Nicio imagine selectată
                        </div>
                    )}
                </div>
            </div>

            <div className="flex min-w-0 flex-col gap-4">
                <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Poză apel telefonic</span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Zoom</span>
                    <input
                        type="range"
                        min={minZoom}
                        max={maxZoom}
                        step="0.05"
                        value={transform.scale}
                        onChange={(event) => handleZoomChange(Number(event.target.value))}
                        disabled={!loadedImage}
                    />
                </label>

                <button
                    type="button"
                    onClick={() => setIsFlippedHorizontally((value) => !value)}
                    disabled={!loadedImage}
                    aria-pressed={isFlippedHorizontally}
                    className={`rounded border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
                        isFlippedHorizontally
                            ? 'border-blue-600 bg-blue-50 text-blue-800'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    Flip horizontal
                </button>

                <p className="text-sm text-gray-600">
                    Ajustează poza astfel încât persoana să fie încadrată în chenar.
                </p>

                <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Filename final</span>
                    <input
                        value={filename}
                        onChange={(event) => setFilename(event.target.value)}
                        onBlur={() => setFilename(makeFilename(filename))}
                        className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </label>

                <div className="mt-auto flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!loadedImage || isSaving}
                        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Salvează imaginea finală
                    </button>

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Anulează
                    </button>
                </div>
            </div>
        </div>
    )
}

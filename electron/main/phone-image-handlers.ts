import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import type {
    PhoneImageGetImageDataUrlRequest,
    PhoneImageGetImageDataUrlResponse,
    PhoneImageListWorkPathImagesResponse,
    PhoneImageLoadDataUrlRequest,
    PhoneImageLoadDataUrlResponse,
    PhoneImageSaveFinalRequest,
    PhoneImageSaveFinalResponse,
} from '../../src/shared/ipc-types'
import {
    ensureJpgExtension,
} from '../../src/features/csv-editor/domain/phoneImageFile'
import { getPhoneImageSettings } from '../store'
import { buildWorkPathImageList } from './phone-image-files'

const fsp = fs.promises

function errorResponse(error: string): PhoneImageSaveFinalResponse {
    return { ok: false, error }
}

function loadErrorResponse(error: string): PhoneImageLoadDataUrlResponse {
    return { ok: false, error }
}

function getImageDataUrlErrorResponse(error: string): PhoneImageGetImageDataUrlResponse {
    return { ok: false, error }
}

function listErrorResponse(error: string): PhoneImageListWorkPathImagesResponse {
    return { ok: false, files: [], error }
}

function isSaveFinalRequest(value: unknown): value is PhoneImageSaveFinalRequest {
    if (!value || typeof value !== 'object') return false
    const candidate = value as Partial<PhoneImageSaveFinalRequest>
    return typeof candidate.filename === 'string' && typeof candidate.jpegBase64 === 'string'
}

function isLoadDataUrlRequest(value: unknown): value is PhoneImageLoadDataUrlRequest {
    if (!value || typeof value !== 'object') return false
    const candidate = value as Partial<PhoneImageLoadDataUrlRequest>
    return typeof candidate.imageRef === 'string'
}

function isGetImageDataUrlRequest(value: unknown): value is PhoneImageGetImageDataUrlRequest {
    if (!value || typeof value !== 'object') return false
    const candidate = value as Partial<PhoneImageGetImageDataUrlRequest>
    return typeof candidate.filename === 'string'
}

function normalizeBase64Jpeg(value: string): string {
    return value.replace(/^data:image\/jpe?g;base64,/, '')
}

function resolveSafeFinalPath(workPath: string, filename: string): { finalFilename: string; finalPath: string } | null {
    const trimmed = filename.trim()
    if (!trimmed) return null
    if (trimmed.includes('/') || trimmed.includes('\\')) return null
    if (path.isAbsolute(trimmed)) return null

    const finalFilename = ensureJpgExtension(trimmed)
    if (path.basename(finalFilename) !== finalFilename) return null
    if (!/^[a-zA-Z0-9._-]+\.jpg$/.test(finalFilename)) return null

    const resolvedWorkPath = path.resolve(workPath)
    const finalPath = path.resolve(resolvedWorkPath, finalFilename)
    const relative = path.relative(resolvedWorkPath, finalPath)

    if (relative.startsWith('..') || path.isAbsolute(relative)) return null

    return { finalFilename, finalPath }
}

function getFilenameFromImageRef(imageRef: string): string {
    return imageRef.replace(/^WORK_PATH\//, '').trim()
}

function resolveSafeImagePath(workPath: string, imageRef: string): string | null {
    const filename = getFilenameFromImageRef(imageRef)
    if (!filename) return null

    const resolvedWorkPath = path.resolve(workPath)
    const finalPath = path.isAbsolute(filename)
        ? path.resolve(filename)
        : path.resolve(resolvedWorkPath, filename)
    const relative = path.relative(resolvedWorkPath, finalPath)

    if (relative.startsWith('..') || path.isAbsolute(relative)) return null

    return finalPath
}

function getImageMimeType(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
    if (ext === '.png') return 'image/png'
    if (ext === '.webp') return 'image/webp'
    return null
}

async function readImageDataUrl(workPath: string, imageRef: string): Promise<PhoneImageLoadDataUrlResponse> {
    if (!workPath.trim()) {
        return loadErrorResponse('Phone image workPath is not configured')
    }

    const imagePath = resolveSafeImagePath(workPath, imageRef)
    if (!imagePath) {
        return loadErrorResponse('Invalid image path')
    }

    const mimeType = getImageMimeType(imagePath)
    if (!mimeType) {
        return loadErrorResponse('Unsupported image type')
    }

    const buffer = await fsp.readFile(imagePath)
    return {
        ok: true,
        dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
    }
}

export function registerPhoneImageHandlers() {
    ipcMain.handle(IPC_CHANNELS.PHONE_IMAGE_SAVE_FINAL, async (_event, request: unknown) => {
        try {
            if (!isSaveFinalRequest(request)) {
                return errorResponse('Invalid payload')
            }

            const { workPath } = getPhoneImageSettings()
            if (!workPath.trim()) {
                return errorResponse('Phone image workPath is not configured')
            }

            const stat = await fsp.stat(workPath).catch(() => null)
            if (!stat?.isDirectory()) {
                return errorResponse('Phone image workPath does not exist')
            }

            await fsp.access(workPath, fs.constants.W_OK)

            const target = resolveSafeFinalPath(workPath, request.filename)
            if (!target) {
                return errorResponse('Invalid filename')
            }

            const base64 = normalizeBase64Jpeg(request.jpegBase64)
            if (!base64.trim()) {
                return errorResponse('Invalid jpegBase64')
            }

            const buffer = Buffer.from(base64, 'base64')
            if (buffer.length === 0) {
                return errorResponse('Invalid jpegBase64')
            }

            await fsp.writeFile(target.finalPath, buffer)

            return {
                ok: true,
                imageCsvValue: target.finalPath,
                finalPath: target.finalPath,
            } satisfies PhoneImageSaveFinalResponse
        } catch (error) {
            console.error('[phone-image:save-final] failed:', error)
            return errorResponse((error as Error).message)
        }
    })

    ipcMain.handle(IPC_CHANNELS.PHONE_IMAGE_LOAD_DATA_URL, async (_event, request: unknown) => {
        try {
            if (!isLoadDataUrlRequest(request)) {
                return loadErrorResponse('Invalid payload')
            }

            const { workPath } = getPhoneImageSettings()
            return await readImageDataUrl(workPath, request.imageRef)
        } catch (error) {
            console.error('[phone-image:load-data-url] failed:', error)
            return loadErrorResponse((error as Error).message)
        }
    })

    ipcMain.handle(IPC_CHANNELS.PHONE_IMAGE_GET_IMAGE_DATA_URL, async (_event, request: unknown) => {
        try {
            if (!isGetImageDataUrlRequest(request)) {
                return getImageDataUrlErrorResponse('Invalid payload')
            }

            const { workPath } = getPhoneImageSettings()
            const response = await readImageDataUrl(workPath, request.filename)
            return response satisfies PhoneImageGetImageDataUrlResponse
        } catch (error) {
            console.error('[phone-image:get-image-data-url] failed:', error)
            return getImageDataUrlErrorResponse((error as Error).message)
        }
    })

    ipcMain.handle(IPC_CHANNELS.PHONE_IMAGE_LIST_WORK_PATH_IMAGES, async () => {
        try {
            const { workPath } = getPhoneImageSettings()
            if (!workPath.trim()) {
                return listErrorResponse('WORK_PATH_NOT_SET')
            }

            const stat = await fsp.stat(workPath).catch(() => null)
            if (!stat?.isDirectory()) {
                return listErrorResponse('WORK_PATH_NOT_FOUND')
            }

            const resolvedWorkPath = path.resolve(workPath)
            const dirents = await fsp.readdir(resolvedWorkPath, { withFileTypes: true })
            const files = buildWorkPathImageList(
                dirents
                    .filter((dirent) => dirent.isFile())
                    .map((dirent) => dirent.name),
                resolvedWorkPath
            )

            return {
                ok: true,
                files,
            } satisfies PhoneImageListWorkPathImagesResponse
        } catch (error) {
            console.error('[phone-image:list-work-path-images] failed:', error)
            return listErrorResponse((error as Error).message)
        }
    })
}

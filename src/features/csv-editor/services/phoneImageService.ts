import type {
    PhoneImageGetImageDataUrlRequest,
    PhoneImageGetImageDataUrlResponse,
    PhoneImageListWorkPathImagesResponse,
    PhoneImageLoadDataUrlRequest,
    PhoneImageLoadDataUrlResponse,
    PhoneImageSaveFinalRequest,
    PhoneImageSaveFinalResponse,
} from '@/shared/ipc-types'

function getApi() {
    const api = (window as any)?.electronAPI
    if (!api) {
        throw new Error('electronAPI not available')
    }
    return api
}

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

export async function listWorkPathImages(): Promise<PhoneImageListWorkPathImagesResponse> {
    try {
        const response = await getApi().listWorkPathImages()
        if (!response || typeof response !== 'object' || !Array.isArray(response.files)) {
            return listErrorResponse('Invalid phone image response')
        }

        return {
            ok: Boolean(response.ok),
            files: response.files
                .filter((file: any) =>
                    file &&
                    typeof file.filename === 'string' &&
                    typeof file.imageCsvValue === 'string' &&
                    typeof file.finalPath === 'string'
                )
                .map((file: any) => ({
                    filename: file.filename,
                    imageCsvValue: file.imageCsvValue,
                    finalPath: file.finalPath,
                })),
            error: typeof response.error === 'string'
                ? response.error
                : undefined,
        }
    } catch {
        return listErrorResponse('IPC_FAILED')
    }
}

export async function getPhoneImageDataUrl(
    input: PhoneImageGetImageDataUrlRequest
): Promise<PhoneImageGetImageDataUrlResponse> {
    try {
        const response = await getApi().getPhoneImageDataUrl(input)
        if (!response || typeof response !== 'object') {
            return getImageDataUrlErrorResponse('Invalid phone image response')
        }

        return {
            ok: Boolean(response.ok),
            dataUrl: typeof response.dataUrl === 'string'
                ? response.dataUrl
                : undefined,
            error: typeof response.error === 'string'
                ? response.error
                : undefined,
        }
    } catch {
        return getImageDataUrlErrorResponse('IPC_FAILED')
    }
}

export const phoneImageService = {
    async saveFinalPhoneImage(
        input: PhoneImageSaveFinalRequest
    ): Promise<PhoneImageSaveFinalResponse> {
        try {
            const response = await getApi().saveFinalPhoneImage(input)
            if (!response || typeof response !== 'object') {
                return errorResponse('Invalid phone image response')
            }

            return {
                ok: Boolean(response.ok),
                imageCsvValue: typeof response.imageCsvValue === 'string'
                    ? response.imageCsvValue
                    : undefined,
                finalPath: typeof response.finalPath === 'string'
                    ? response.finalPath
                    : undefined,
                error: typeof response.error === 'string'
                    ? response.error
                    : undefined,
            }
        } catch (error) {
            return errorResponse((error as Error).message)
        }
    },

    async loadPhoneImageDataUrl(
        input: PhoneImageLoadDataUrlRequest
    ): Promise<PhoneImageLoadDataUrlResponse> {
        try {
            const response = await getApi().loadPhoneImageDataUrl(input)
            if (!response || typeof response !== 'object') {
                return loadErrorResponse('Invalid phone image response')
            }

            return {
                ok: Boolean(response.ok),
                dataUrl: typeof response.dataUrl === 'string'
                    ? response.dataUrl
                    : undefined,
                error: typeof response.error === 'string'
                    ? response.error
                    : undefined,
            }
        } catch (error) {
            return loadErrorResponse((error as Error).message)
        }
    },

    listWorkPathImages,
    getPhoneImageDataUrl,
}

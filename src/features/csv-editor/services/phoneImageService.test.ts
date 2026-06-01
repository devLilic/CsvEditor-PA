import { describe, expect, it } from 'vitest'
import { getPhoneImageDataUrl, listWorkPathImages, phoneImageService } from './phoneImageService'

describe('phoneImageService', () => {
    it('returns successful save response from IPC', async () => {
        const api = (window as any).electronAPI
        const response = {
            ok: true,
            imageCsvValue: 'C:\\Work\\ion.jpg',
            finalPath: 'C:\\Work\\ion.jpg',
        }
        api.saveFinalPhoneImage.mockResolvedValueOnce(response)

        const result = await phoneImageService.saveFinalPhoneImage({
            filename: 'ion.jpg',
            jpegBase64: 'abc',
        })

        expect(result).toEqual(response)
        expect(api.saveFinalPhoneImage).toHaveBeenCalledWith({
            filename: 'ion.jpg',
            jpegBase64: 'abc',
        })
    })

    it('returns controlled error response when IPC fails', async () => {
        const api = (window as any).electronAPI
        api.saveFinalPhoneImage.mockRejectedValueOnce(new Error('write failed'))

        const result = await phoneImageService.saveFinalPhoneImage({
            filename: 'ion.jpg',
            jpegBase64: 'abc',
        })

        expect(result).toEqual({
            ok: false,
            error: 'write failed',
        })
    })

    it('returns controlled error response for invalid IPC response', async () => {
        const api = (window as any).electronAPI
        api.saveFinalPhoneImage.mockResolvedValueOnce(null)

        const result = await phoneImageService.saveFinalPhoneImage({
            filename: 'ion.jpg',
            jpegBase64: 'abc',
        })

        expect(result).toEqual({
            ok: false,
            error: 'Invalid phone image response',
        })
    })

    it('returns phone image data URL response from IPC', async () => {
        const api = (window as any).electronAPI
        const response = {
            ok: true,
            dataUrl: 'data:image/jpeg;base64,abc123',
        }
        api.loadPhoneImageDataUrl.mockResolvedValueOnce(response)

        const result = await phoneImageService.loadPhoneImageDataUrl({
            imageRef: 'WORK_PATH/ion.jpg',
        })

        expect(result).toEqual(response)
        expect(api.loadPhoneImageDataUrl).toHaveBeenCalledWith({
            imageRef: 'WORK_PATH/ion.jpg',
        })
    })

    it('returns controlled error response when phone image data URL IPC fails', async () => {
        const api = (window as any).electronAPI
        api.loadPhoneImageDataUrl.mockRejectedValueOnce(new Error('read failed'))

        const result = await phoneImageService.loadPhoneImageDataUrl({
            imageRef: 'WORK_PATH/ion.jpg',
        })

        expect(result).toEqual({
            ok: false,
            error: 'read failed',
        })
    })

    it('returns selected WORK_PATH image data URL response from IPC', async () => {
        const api = (window as any).electronAPI
        const response = {
            ok: true,
            dataUrl: 'data:image/jpeg;base64,abc123',
        }
        api.getPhoneImageDataUrl.mockResolvedValueOnce(response)

        const result = await getPhoneImageDataUrl({
            filename: 'ion.jpg',
        })

        expect(result).toEqual(response)
        expect(api.getPhoneImageDataUrl).toHaveBeenCalledWith({
            filename: 'ion.jpg',
        })
    })

    it('returns controlled error response when selected WORK_PATH image IPC fails', async () => {
        const api = (window as any).electronAPI
        api.getPhoneImageDataUrl.mockRejectedValueOnce(new Error('read failed'))

        const result = await getPhoneImageDataUrl({
            filename: 'ion.jpg',
        })

        expect(result).toEqual({
            ok: false,
            error: 'IPC_FAILED',
        })
    })

    it('returns WORK_PATH image list response from IPC', async () => {
        const api = (window as any).electronAPI
        const response = {
            ok: true,
            files: [
                {
                    filename: 'ion.jpg',
                    imageCsvValue: 'C:\\Work\\ion.jpg',
                    finalPath: 'C:\\Work\\ion.jpg',
                },
            ],
        }
        api.listWorkPathImages.mockResolvedValueOnce(response)

        const result = await listWorkPathImages()

        expect(result).toEqual(response)
        expect(api.listWorkPathImages).toHaveBeenCalledOnce()
    })

    it('returns controlled error response when WORK_PATH image list IPC fails', async () => {
        const api = (window as any).electronAPI
        api.listWorkPathImages.mockRejectedValueOnce(new Error('WORK_PATH_NOT_FOUND'))

        const result = await listWorkPathImages()

        expect(result).toEqual({
            ok: false,
            files: [],
            error: 'IPC_FAILED',
        })
    })

    it('keeps listWorkPathImages available through phoneImageService for existing consumers', async () => {
        const api = (window as any).electronAPI
        api.listWorkPathImages.mockResolvedValueOnce({
            ok: true,
            files: [],
        })

        const result = await phoneImageService.listWorkPathImages()

        expect(result).toEqual({
            ok: true,
            files: [],
            error: undefined,
        })
    })

    it('keeps getPhoneImageDataUrl available through phoneImageService for existing consumers', async () => {
        const api = (window as any).electronAPI
        api.getPhoneImageDataUrl.mockResolvedValueOnce({
            ok: true,
            dataUrl: 'data:image/jpeg;base64,abc123',
        })

        const result = await phoneImageService.getPhoneImageDataUrl({
            filename: 'ion.jpg',
        })

        expect(result).toEqual({
            ok: true,
            dataUrl: 'data:image/jpeg;base64,abc123',
            error: undefined,
        })
    })
})

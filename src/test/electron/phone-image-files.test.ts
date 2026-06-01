import path from 'path'
import { describe, expect, it } from 'vitest'
import { buildWorkPathImageList, isJpegFilename } from '../../../electron/main/phone-image-files'

describe('phone-image-files', () => {
    it('accepts .jpg filenames', () => {
        expect(isJpegFilename('ion.jpg')).toBe(true)
    })

    it('accepts .jpeg filenames', () => {
        expect(isJpegFilename('ion.jpeg')).toBe(true)
    })

    it('accepts uppercase jpeg extensions', () => {
        expect(isJpegFilename('ion.JPG')).toBe(true)
        expect(isJpegFilename('ion.JPEG')).toBe(true)
    })

    it('ignores non-jpeg filenames', () => {
        expect(isJpegFilename('ion.png')).toBe(false)
        expect(isJpegFilename('ion.txt')).toBe(false)
    })

    it('filters jpeg files and sorts alphabetically', () => {
        const files = buildWorkPathImageList(
            ['zeta.jpg', 'notes.txt', 'Ana.JPEG', 'logo.png', 'beta.JPG'],
            'C:\\Work Images'
        )

        expect(files.map((file) => file.filename)).toEqual([
            'Ana.JPEG',
            'beta.JPG',
            'zeta.jpg',
        ])
    })

    it('builds WORK_PATH imageCsvValue and finalPath', () => {
        const [file] = buildWorkPathImageList(['filename.jpg'], 'C:\\Work Images')

        expect(file).toEqual({
            filename: 'filename.jpg',
            imageCsvValue: path.resolve('C:\\Work Images', 'filename.jpg'),
            finalPath: path.resolve('C:\\Work Images', 'filename.jpg'),
        })
    })
})

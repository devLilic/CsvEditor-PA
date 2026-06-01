import { describe, expect, it } from 'vitest'
import {
    getFilenameFromWorkPathRef,
    getPhoneImageDisplayFilename,
    isAbsolutePhoneImagePath,
    isBarePhoneImageFilename,
    isWorkPathImageRef,
    resolveWorkPathImageCsvValue,
    resolveWorkPathImageRef,
} from './phoneImagePath'

describe('phoneImagePath', () => {
    it('detects WORK_PATH image refs', () => {
        expect(isWorkPathImageRef('WORK_PATH/poza.jpg')).toBe(true)
    })

    it('extracts filename from WORK_PATH image ref', () => {
        expect(getFilenameFromWorkPathRef('WORK_PATH/poza.jpg')).toBe('poza.jpg')
    })

    it('resolves WORK_PATH image ref with real workPath', () => {
        expect(resolveWorkPathImageRef('WORK_PATH/poza.jpg', 'C:\\Work Images')).toBe(
            'file:///C:/Work%20Images/poza.jpg'
        )
    })

    it('detects and resolves full filesystem image paths', () => {
        expect(isAbsolutePhoneImagePath('C:\\Work Images\\poza.jpg')).toBe(true)
        expect(resolveWorkPathImageRef('C:\\Work Images\\poza.jpg', 'C:\\Other')).toBe(
            'file:///C:/Work%20Images/poza.jpg'
        )
    })

    it('gets display filename from WORK_PATH and full paths', () => {
        expect(getPhoneImageDisplayFilename('WORK_PATH/poza.jpg')).toBe('poza.jpg')
        expect(getPhoneImageDisplayFilename('C:\\Work Images\\poza.jpg')).toBe('poza.jpg')
    })

    it('resolves WORK_PATH image refs to full CSV paths', () => {
        expect(resolveWorkPathImageCsvValue('WORK_PATH/poza.jpg', 'C:\\Work Images')).toBe(
            'C:\\Work Images\\poza.jpg'
        )
    })

    it('detects bare phone image filenames', () => {
        expect(isBarePhoneImageFilename('andrei_curararu.jpg')).toBe(true)
        expect(isBarePhoneImageFilename('subfolder/andrei_curararu.jpg')).toBe(true)
        expect(isBarePhoneImageFilename('WORK_PATH/andrei_curararu.jpg')).toBe(false)
        expect(isBarePhoneImageFilename('/assets/andrei_curararu.jpg')).toBe(false)
        expect(isBarePhoneImageFilename('data:image/jpeg;base64,abc')).toBe(false)
    })

    it('resolves bare phone image filenames with real workPath', () => {
        expect(resolveWorkPathImageRef('andrei_curararu.jpg', 'C:\\Work Images')).toBe(
            'file:///C:/Work%20Images/andrei_curararu.jpg'
        )
    })

    it('does not change values that do not start with WORK_PATH', () => {
        expect(resolveWorkPathImageRef('/assets/poza.jpg', 'C:\\Work')).toBe('/assets/poza.jpg')
    })

    it('handles empty strings safely', () => {
        expect(isWorkPathImageRef('')).toBe(false)
        expect(getFilenameFromWorkPathRef('')).toBe('')
        expect(resolveWorkPathImageRef('', 'C:\\Work')).toBe('')
        expect(resolveWorkPathImageRef('WORK_PATH/poza.jpg', '')).toBe('')
    })
})

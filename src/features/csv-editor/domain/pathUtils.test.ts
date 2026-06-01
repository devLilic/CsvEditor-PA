import { describe, expect, it } from 'vitest'
import { getFilenameFromPath } from './pathUtils'

describe('getFilenameFromPath', () => {
    it('extracts filename from Windows paths', () => {
        expect(getFilenameFromPath('C:\\work\\emisie.csv')).toBe('emisie.csv')
    })

    it('extracts filename from POSIX paths', () => {
        expect(getFilenameFromPath('/work/emisie.csv')).toBe('emisie.csv')
    })

    it('falls back for empty strings', () => {
        expect(getFilenameFromPath('')).toBe('')
    })

    it('falls back for invalid paths', () => {
        expect(getFilenameFromPath('C:\\work\\')).toBe('')
        expect(getFilenameFromPath('/work/')).toBe('')
    })
})

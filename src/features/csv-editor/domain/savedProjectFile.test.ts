import { describe, expect, it } from 'vitest'
import {
    createSavedProjectFilename,
    ensureCsvExtension,
    sanitizeSavedProjectName,
} from './savedProjectFile'

describe('savedProjectFile', () => {
    it('turns a manual project name into a csv filename', () => {
        expect(createSavedProjectFilename('Emisiunea 1')).toBe('Emisiunea_1.csv')
    })

    it('keeps an existing csv extension', () => {
        expect(createSavedProjectFilename('test.csv')).toBe('test.csv')
        expect(ensureCsvExtension('test.csv')).toBe('test.csv')
    })

    it('removes invalid filename characters', () => {
        expect(sanitizeSavedProjectName('Proiect: final?/\\*')).toBe('Proiect_final')
    })

    it('uses fallback when the name is empty', () => {
        expect(createSavedProjectFilename('')).toBe('proiect_salvat.csv')
        expect(createSavedProjectFilename('   ')).toBe('proiect_salvat.csv')
    })

    it('always returns a csv extension', () => {
        expect(createSavedProjectFilename('proiect')).toBe('proiect.csv')
        expect(createSavedProjectFilename('proiect.txt')).toBe('proiect.txt.csv')
        expect(ensureCsvExtension('proiect')).toBe('proiect.csv')
    })
})

import { describe, expect, it } from 'vitest'
import {
    buildSuggestedPhoneImageFilename,
    ensureJpgExtension,
    sanitizeJpegFilename,
} from './phoneImageFile'

describe('phoneImageFile', () => {
    describe('sanitizeJpegFilename', () => {
        it('turns a person name into a lowercase jpg filename', () => {
            expect(sanitizeJpegFilename('Ion Popescu')).toBe('ion_popescu.jpg')
        })

        it('removes problematic characters and replaces spaces with underscores', () => {
            expect(sanitizeJpegFilename('Ion: Popescu / Expert')).toBe('ion_popescu_expert.jpg')
        })

        it('normalizes diacritics', () => {
            expect(sanitizeJpegFilename('Ștefan Țurcanu')).toBe('stefan_turcanu.jpg')
        })

        it('changes any existing extension to jpg', () => {
            expect(sanitizeJpegFilename('poza.png')).toBe('poza.jpg')
        })
    })

    describe('ensureJpgExtension', () => {
        it('keeps jpg extension', () => {
            expect(ensureJpgExtension('ion.jpg')).toBe('ion.jpg')
        })

        it('converts other extensions to jpg', () => {
            expect(ensureJpgExtension('poza.png')).toBe('poza.jpg')
        })

        it('adds jpg extension when missing', () => {
            expect(ensureJpgExtension('ion')).toBe('ion.jpg')
        })
    })

    describe('buildSuggestedPhoneImageFilename', () => {
        it('builds suggested filename from person name', () => {
            expect(buildSuggestedPhoneImageFilename('Ion Popescu')).toBe('ion_popescu.jpg')
        })

        it('uses phone_call.jpg fallback when name is empty', () => {
            expect(buildSuggestedPhoneImageFilename('')).toBe('phone_call.jpg')
            expect(buildSuggestedPhoneImageFilename('   ')).toBe('phone_call.jpg')
        })
    })
})

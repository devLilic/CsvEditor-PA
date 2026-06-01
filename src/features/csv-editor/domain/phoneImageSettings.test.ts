import { describe, expect, it } from 'vitest'
import {
    FALLBACK_PHONE_IMAGE_SETTINGS,
    normalizePhoneImageSettings,
} from './phoneImageSettings'

describe('normalizePhoneImageSettings', () => {
    it('normalizes a valid object', () => {
        expect(normalizePhoneImageSettings({
            workPath: 'WORK_PATH',
            width: 320,
            height: 480,
        })).toEqual({
            workPath: 'WORK_PATH',
            width: 320,
            height: 480,
        })
    })

    it('uses fallback settings for missing or null object', () => {
        expect(normalizePhoneImageSettings(undefined)).toEqual(FALLBACK_PHONE_IMAGE_SETTINGS)
        expect(normalizePhoneImageSettings(null)).toEqual(FALLBACK_PHONE_IMAGE_SETTINGS)
    })

    it('uses fallback for invalid workPath', () => {
        expect(normalizePhoneImageSettings({
            workPath: 12,
            width: 320,
            height: 480,
        }).workPath).toBe(FALLBACK_PHONE_IMAGE_SETTINGS.workPath)
    })

    it('uses fallback for width <= 0', () => {
        expect(normalizePhoneImageSettings({
            workPath: 'WORK_PATH',
            width: 0,
            height: 480,
        })).toEqual({
            workPath: 'WORK_PATH',
            width: FALLBACK_PHONE_IMAGE_SETTINGS.width,
            height: 480,
        })
    })

    it('uses fallback for height <= 0', () => {
        expect(normalizePhoneImageSettings({
            workPath: 'WORK_PATH',
            width: 320,
            height: -10,
        })).toEqual({
            workPath: 'WORK_PATH',
            width: 320,
            height: FALLBACK_PHONE_IMAGE_SETTINGS.height,
        })
    })
})

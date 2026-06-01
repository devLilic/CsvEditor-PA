import { describe, expect, it } from 'vitest'
import type { UpdateStatus } from '../../../shared/ipc-types'
import {
    getUpdateStatusMessage,
    isBusyUpdateStatus,
    isFinalUpdateStatus,
} from './updateStatus'

describe('update status helpers', () => {
    it('marks checking as busy', () => {
        expect(isBusyUpdateStatus({
            type: 'checking',
            currentVersion: '1.0.0',
        })).toBe(true)
    })

    it('marks downloading as busy', () => {
        expect(isBusyUpdateStatus({
            type: 'downloading',
            percent: 42,
            transferred: 420,
            total: 1000,
        })).toBe(true)
    })

    it('marks downloaded as final', () => {
        expect(isFinalUpdateStatus({
            type: 'downloaded',
            newVersion: '1.1.0',
        })).toBe(true)
    })

    it('marks error as final', () => {
        expect(isFinalUpdateStatus({
            type: 'error',
            message: 'Network error',
        })).toBe(true)
    })

    it('does not mark available as busy', () => {
        expect(isBusyUpdateStatus({
            type: 'available',
            currentVersion: '1.0.0',
            newVersion: '1.1.0',
        })).toBe(false)
    })

    it('marks not-available as final', () => {
        expect(isFinalUpdateStatus({
            type: 'not-available',
            currentVersion: '1.0.0',
        })).toBe(true)
    })

    it('returns a clear message for every status', () => {
        const statuses: UpdateStatus[] = [
            { type: 'idle', currentVersion: '1.0.0' },
            { type: 'checking', currentVersion: '1.0.0' },
            { type: 'available', currentVersion: '1.0.0', newVersion: '1.1.0' },
            { type: 'not-available', currentVersion: '1.0.0' },
            { type: 'downloading', percent: 42 },
            { type: 'downloaded', newVersion: '1.1.0' },
            { type: 'error', message: 'Network error' },
        ]

        expect(statuses.map(getUpdateStatusMessage)).toEqual([
            'Gata',
            'Se verifica actualizarile...',
            'Actualizare disponibila',
            'Ai ultima versiune',
            'Se descarca actualizarea...',
            'Actualizarea este descarcata',
            'Eroare la actualizare',
        ])
    })
})

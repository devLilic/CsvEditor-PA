// src/test/heartbeat.test.ts
import { describe, it, expect } from 'vitest'

describe('QA heartbeat', () => {
    it('window.electronAPI is available with flat preload API', () => {
        const api = (window as any).electronAPI

        expect(api).toBeDefined()

        // CSV API
        expect(api.getLastCsv).toBeTypeOf('function')
        expect(api.openCsvDialog).toBeTypeOf('function')
        expect(api.writeCsv).toBeTypeOf('function')
        expect(api.bkpCsv).toBeTypeOf('function')

        // Settings API
        expect(api.getQuickTitles).toBeTypeOf('function')
        expect(api.setQuickTitles).toBeTypeOf('function')
        expect(api.getAppConfig).toBeTypeOf('function')
        expect(api.setAppConfig).toBeTypeOf('function')
        expect(api.getDefaultProjectSettings).toBeTypeOf('function')
        expect(api.setDefaultProjectSettings).toBeTypeOf('function')

        // App menu API
        expect(api.onMenuNavigate).toBeTypeOf('function')
    })
})

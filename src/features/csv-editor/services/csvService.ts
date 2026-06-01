// src/features/csv-editor/services/csvService.ts
import type {
    CsvBackupResponse,
    CsvCreateBackupResponse,
    CsvFileDescriptor,
    CsvGetWorkingResponse,
    CsvWriteResponse,
} from '@/shared/ipc-types'

/**
 * Accessor lazy pentru preload API.
 * IMPORTANT:
 * - NU se capturează electronAPI la import-time
 * - permite injectarea de mock-uri în testare
 */
function getApi() {
    const api = (window as any)?.electronAPI

    if (!api) {
        throw new Error('electronAPI not available')
    }

    return api
}

/**
 * csvService
 *
 * Responsabilități:
 * - wrapper sigur peste IPC Electron
 * - fallback predictibil (fără throw)
 * - complet testabil fără Electron runtime
 *
 * NU face:
 * - parsing CSV
 * - validare business
 * - state management
 */
export const csvService = {
    /**
     * Încarcă ultimul CSV salvat (dacă există)
     */
    /**
     * @deprecated Legacy fallback for the old dialog-based CSV flow.
     * New code should use getWorkingCsv(), which reads workingCsvPath from Settings.
     */
    async getLast(): Promise<CsvFileDescriptor | null> {
        try {
            const res = await getApi().getLastCsv()
            return res ?? null
        } catch {
            return null
        }
    },

    async getWorkingCsv(): Promise<CsvGetWorkingResponse> {
        try {
            const res = await getApi().getWorkingCsv()
            return res ?? { ok: false, error: 'NO_RESPONSE' }
        } catch {
            return { ok: false, error: 'IPC_FAILED' }
        }
    },

    async getWorking(): Promise<CsvFileDescriptor | null> {
        const res = await this.getWorkingCsv()
        if (!res.ok || typeof res.content !== 'string' || typeof res.path !== 'string') {
            return null
        }

        return {
            path: res.path,
            content: res.content,
        }
    },

    /**
     * Deschide dialog pentru selectare CSV
     */
    /**
     * @deprecated Legacy dialog-based CSV selection.
     * The official flow is Settings -> workingCsvPath -> getWorkingCsv/write.
     */
    async openDialog(): Promise<CsvFileDescriptor | null> {
        try {
            const res = await getApi().openCsvDialog()
            return res ?? null
        } catch {
            return null
        }
    },

    /**
     * Scrie CSV-ul curent pe disc
     */
    async write(content: string): Promise<CsvWriteResponse> {
        if (typeof content !== 'string') {
            return { ok: false, error: 'INVALID_CONTENT' }
        }

        try {
            const res = await getApi().writeCsv(content)
            return res ?? { ok: false, error: 'NO_RESPONSE' }
        } catch {
            return { ok: false, error: 'IPC_FAILED' }
        }
    },

    /**
     * Creează backup pentru CSV-ul curent
     */
    async backup(content: string): Promise<CsvBackupResponse> {
        if (typeof content !== 'string') {
            return { ok: false, error: 'INVALID_CONTENT' }
        }

        try {
            const res = await getApi().bkpCsv(content)
            return res ?? { ok: false, error: 'NO_RESPONSE' }
        } catch {
            return { ok: false, error: 'IPC_FAILED' }
        }
    },

    /**
     * Creeaza backup in folderul configurat in setarile CSV.
     */
    async createBackup(content: string): Promise<CsvCreateBackupResponse> {
        if (typeof content !== 'string') {
            return { ok: false, error: 'INVALID_CONTENT' }
        }

        try {
            const res = await getApi().createCsvBackup({ content })
            return res ?? { ok: false, error: 'NO_RESPONSE' }
        } catch {
            return { ok: false, error: 'IPC_FAILED' }
        }
    },
}

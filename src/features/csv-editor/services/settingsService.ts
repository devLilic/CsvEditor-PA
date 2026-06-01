// src/features/settings/services/settingsService.ts
import type { AppConfig } from '@/shared/ipc-types'

function getApi() {
    const api = (window as any)?.electronAPI
    if (!api) {
        throw new Error('electronAPI not available')
    }
    return api
}

/**
 * Internal pub/sub pentru quickTitles
 */
type QuickTitlesListener = (titles: string[]) => void
const quickTitlesListeners = new Set<QuickTitlesListener>()

function emitQuickTitles(list: string[]) {
    for (const l of quickTitlesListeners) {
        try {
            l(list)
        } catch (e) {
            console.error('[settingsService] quickTitles listener error', e)
        }
    }
}

export const settingsService = {

    // ---- QUICK TITLES ----

    async getQuickTitles(): Promise<string[]> {
        try {
            const res = await getApi().getQuickTitles()
            const safe = Array.isArray(res) ? res : []
            emitQuickTitles(safe)
            return safe
        } catch {
            return []
        }
    },

    async setQuickTitles(list: string[]): Promise<void> {
        if (!Array.isArray(list)) return

        try {
            await getApi().setQuickTitles(list)
            emitQuickTitles(list) // 🔥 notifică UI
        } catch {
            // intentionally silent
        }
    },

    /**
     * Subscribe la schimbări quickTitles.
     * Returnează unsubscribe().
     */
    subscribeQuickTitles(listener: QuickTitlesListener): () => void {
        quickTitlesListeners.add(listener)
        return () => {
            quickTitlesListeners.delete(listener)
        }
    },

    // ---- CONFIG ----

    async getConfig(): Promise<AppConfig> {
        try {
            const res = await getApi().getAppConfig()
            return (res && typeof res === 'object') ? res : {}
        } catch {
            return {}
        }
    },

    async setConfig(cfg: AppConfig): Promise<AppConfig> {
        if (!cfg || typeof cfg !== 'object') {
            return {}
        }

        try {
            const res = await getApi().setAppConfig(cfg)
            return (res && typeof res === 'object') ? res : {}
        } catch {
            return {}
        }
    },
}
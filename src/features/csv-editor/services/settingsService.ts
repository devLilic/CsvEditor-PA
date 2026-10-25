// src/features/settings/services/settingsService.ts
import type { AppConfig } from '@/shared/ipc-types'
import {
    createConfigWithPlateauTitleDragDropSetting,
    getPlateauTitleDragDropSetting,
} from '@/features/settings/plateauTitleDragDropSetting'
import {
    createConfigWithPlateauTitleDividerCreationSetting,
    getPlateauTitleDividerCreationSetting,
} from '@/features/settings/plateauTitleDividerCreationSetting'
import {
    createConfigWithShowProjectSelectorEnabled,
    getShowProjectSelectorEnabled,
} from '@/features/settings/showProjectSelectorSetting'
import {
    getUiThemeSetting,
    persistUiThemeSetting,
    restoreUiThemeSetting,
} from '@/features/theme/themeSetting'
import type { UiTheme } from '@/features/theme/themeResolver'

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
type QuickTitlesListener = (titles: string[], showProjectId?: string) => void
const quickTitlesListeners = new Set<QuickTitlesListener>()

function emitQuickTitles(list: string[], showProjectId?: string) {
    for (const l of quickTitlesListeners) {
        try {
            l(list, showProjectId)
        } catch (e) {
            console.error('[settingsService] quickTitles listener error', e)
        }
    }
}

export const settingsService = {

    // ---- QUICK TITLES ----

    async getQuickTitles(showProjectId?: string): Promise<string[]> {
        try {
            const res = await getApi().getQuickTitles(showProjectId)
            const safe = Array.isArray(res) ? res : []
            emitQuickTitles(safe, showProjectId)
            return safe
        } catch {
            return []
        }
    },

    async setQuickTitles(list: string[], showProjectId?: string): Promise<void> {
        if (!Array.isArray(list)) return

        try {
            const res = await getApi().setQuickTitles(list, showProjectId)
            emitQuickTitles(Array.isArray(res) ? res : list, showProjectId) // notify scoped listeners
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

    async getPlateauTitleDragDropEnabled(): Promise<boolean> {
        const config = await this.getConfig()
        return getPlateauTitleDragDropSetting(config)
    },

    async getPlateauTitleDividerCreationEnabled(): Promise<boolean> {
        const config = await this.getConfig()
        return getPlateauTitleDividerCreationSetting(config)
    },

    async setPlateauTitleDragDropEnabled(enabled: boolean): Promise<boolean> {
        const currentConfig = await this.getConfig()
        const savedConfig = await this.setConfig(
            createConfigWithPlateauTitleDragDropSetting(currentConfig, enabled)
        )

        return getPlateauTitleDragDropSetting(savedConfig)
    },

    async setPlateauTitleDividerCreationEnabled(enabled: boolean): Promise<boolean> {
        const currentConfig = await this.getConfig()
        const savedConfig = await this.setConfig(
            createConfigWithPlateauTitleDividerCreationSetting(currentConfig, enabled)
        )

        return getPlateauTitleDividerCreationSetting(savedConfig)
    },

    async getShowProjectSelectorEnabled(): Promise<boolean> {
        return getShowProjectSelectorEnabled(await this.getConfig())
    },

    async setShowProjectSelectorEnabled(enabled: boolean): Promise<boolean> {
        const currentConfig = await this.getConfig()
        const savedConfig = await this.setConfig(createConfigWithShowProjectSelectorEnabled(currentConfig, enabled))
        return getShowProjectSelectorEnabled(savedConfig)
    },

    async getUiTheme(): Promise<UiTheme> {
        const config = await this.getConfig()
        return getUiThemeSetting(config)
    },

    async restoreUiTheme(target?: Pick<HTMLElement, 'dataset'>): Promise<UiTheme> {
        return restoreUiThemeSetting(
            () => this.getConfig(),
            target
        )
    },

    async setUiTheme(theme: UiTheme, target?: Pick<HTMLElement, 'dataset'>): Promise<UiTheme> {
        return persistUiThemeSetting(
            () => this.getConfig(),
            (config) => this.setConfig(config),
            theme,
            target
        )
    },
}

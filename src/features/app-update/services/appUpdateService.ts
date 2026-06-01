import type {
    UpdateCheckResult,
    UpdateDownloadResult,
    UpdateStatus,
} from '../../../shared/ipc-types'

const API_UNAVAILABLE_ERROR = 'ELECTRON_UPDATE_API_UNAVAILABLE'

function getAppUpdateApi() {
    return window.electronAPI?.appUpdate
}

function getUnavailableCheckResult(): UpdateCheckResult {
    return {
        ok: false,
        error: API_UNAVAILABLE_ERROR,
    }
}

function getUnavailableDownloadResult(): UpdateDownloadResult {
    return {
        ok: false,
        error: API_UNAVAILABLE_ERROR,
    }
}

export const appUpdateService = {
    async getCurrentVersion(): Promise<string> {
        const api = getAppUpdateApi()
        if (!api) {
            throw new Error(API_UNAVAILABLE_ERROR)
        }

        return api.getCurrentVersion()
    },

    async checkForUpdates(): Promise<UpdateCheckResult> {
        const api = getAppUpdateApi()
        if (!api) {
            return getUnavailableCheckResult()
        }

        return api.checkForUpdates()
    },

    async downloadUpdate(): Promise<UpdateDownloadResult> {
        const api = getAppUpdateApi()
        if (!api) {
            return getUnavailableDownloadResult()
        }

        return api.downloadUpdate()
    },

    async installUpdate(): Promise<void> {
        const api = getAppUpdateApi()
        if (!api) {
            throw new Error(API_UNAVAILABLE_ERROR)
        }

        await api.installUpdate()
    },

    onUpdateStatus(callback: (status: UpdateStatus) => void): () => void {
        const api = getAppUpdateApi()
        if (!api) {
            return () => {}
        }

        return api.onStatus(callback)
    },
}

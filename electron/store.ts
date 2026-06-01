// electron/store.ts
import Store from 'electron-store'
import type { AppConfig } from '../src/shared/ipc-types'
import type { DefaultProjectSettings } from '../src/features/csv-editor/domain/defaultProjectSettings'
import {
    FALLBACK_DEFAULT_PROJECT_SETTINGS,
    normalizeDefaultProjectSettings,
} from '../src/features/csv-editor/domain/defaultProjectSettings'
import type { PhoneImageSettings } from '../src/features/csv-editor/domain/phoneImageSettings'
import {
    FALLBACK_PHONE_IMAGE_SETTINGS,
    normalizePhoneImageSettings,
} from '../src/features/csv-editor/domain/phoneImageSettings'
import type { CsvFileSettings } from '../src/features/csv-editor/domain/csvFileSettings'
import {
    FALLBACK_CSV_FILE_SETTINGS,
    normalizeCsvFileSettings,
} from '../src/features/csv-editor/domain/csvFileSettings'

export interface AppStoreSchema {
    quickTitles: string[]
    csvFilePath: string | null
    appConfig: AppConfig
    defaultProjectSettings: DefaultProjectSettings
    phoneImageSettings: PhoneImageSettings
    csvFileSettings: CsvFileSettings
}

const store = new Store<AppStoreSchema>({
    defaults: {
        quickTitles: [],
        csvFilePath: null,
        appConfig: {},
        defaultProjectSettings: FALLBACK_DEFAULT_PROJECT_SETTINGS,
        phoneImageSettings: FALLBACK_PHONE_IMAGE_SETTINGS,
        csvFileSettings: FALLBACK_CSV_FILE_SETTINGS,
    },

})

export function getCsvFilePath(): string | null {
    // @ts-ignore
    const value = store.get('csvFilePath')
    return typeof value === 'string' && value.length > 0 ? value : null
}

export function setCsvFilePath(path: string | null): void {
    // @ts-ignore
    store.set('csvFilePath', path)
}

export function getQuickTitles(): string[] {
    // @ts-ignore
    const value = store.get('quickTitles')
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export function setQuickTitles(list: string[]): void {
    // @ts-ignore
    store.set('quickTitles', list)
}

export function getAppConfig(): AppConfig {
    // @ts-ignore
    const value = store.get('appConfig')
    return (value && typeof value === 'object') ? (value as AppConfig) : {}
}

export function setAppConfig(cfg: AppConfig): AppConfig {
    const safeCfg = (cfg && typeof cfg === 'object') ? cfg : {}
    // @ts-ignore
    store.set('appConfig', safeCfg)
    return safeCfg
}

export function getDefaultProjectSettings(): DefaultProjectSettings {
    // @ts-ignore
    return normalizeDefaultProjectSettings(store.get('defaultProjectSettings'))
}

export function setDefaultProjectSettings(settings: unknown): DefaultProjectSettings {
    const safeSettings = normalizeDefaultProjectSettings(settings)
    // @ts-ignore
    store.set('defaultProjectSettings', safeSettings)
    return safeSettings
}

export function getPhoneImageSettings(): PhoneImageSettings {
    // @ts-ignore
    return normalizePhoneImageSettings(store.get('phoneImageSettings'))
}

export function setPhoneImageSettings(settings: unknown): PhoneImageSettings {
    const safeSettings = normalizePhoneImageSettings(settings)
    // @ts-ignore
    store.set('phoneImageSettings', safeSettings)
    return safeSettings
}

export function getCsvFileSettings(): CsvFileSettings {
    // @ts-ignore
    return normalizeCsvFileSettings(store.get('csvFileSettings'))
}

export function setCsvFileSettings(settings: unknown): CsvFileSettings {
    const safeSettings = normalizeCsvFileSettings(settings)
    // @ts-ignore
    store.set('csvFileSettings', safeSettings)
    return safeSettings
}

export default store

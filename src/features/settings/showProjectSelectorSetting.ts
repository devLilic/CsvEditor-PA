import type { AppConfig } from '@/shared/ipc-types'

export const SHOW_PROJECT_SELECTOR_ENABLED_KEY = 'showProjectSelectorEnabled' as const
export const DEFAULT_SHOW_PROJECT_SELECTOR_ENABLED = true

export function getShowProjectSelectorEnabled(config: AppConfig | null | undefined): boolean {
    const value = config?.[SHOW_PROJECT_SELECTOR_ENABLED_KEY]
    return typeof value === 'boolean' ? value : DEFAULT_SHOW_PROJECT_SELECTOR_ENABLED
}

export function createConfigWithShowProjectSelectorEnabled(
    config: AppConfig | null | undefined,
    enabled: boolean,
): AppConfig {
    const baseConfig = config && typeof config === 'object' ? config : {}
    return { ...baseConfig, [SHOW_PROJECT_SELECTOR_ENABLED_KEY]: enabled }
}

import { settingsService } from '@/features/csv-editor/services/settingsService'
import type { AppConfig } from '@/shared/ipc-types'
import {
    ENTITY_TEMPLATE_NAMES_CONFIG_KEY,
    normalizeEntityTemplateNames,
    type EntityTemplateNames,
} from '../domain/entityTemplateNames'

export const entityTemplateNamesService = {
    async get(): Promise<EntityTemplateNames> {
        const config = await settingsService.getConfig()
        return normalizeEntityTemplateNames(config[ENTITY_TEMPLATE_NAMES_CONFIG_KEY])
    },

    async set(names: EntityTemplateNames): Promise<EntityTemplateNames> {
        const config = await settingsService.getConfig()
        const saved = await settingsService.setConfig({
            ...config,
            [ENTITY_TEMPLATE_NAMES_CONFIG_KEY]: names,
        } as AppConfig)
        return normalizeEntityTemplateNames(saved[ENTITY_TEMPLATE_NAMES_CONFIG_KEY] ?? names)
    },
}

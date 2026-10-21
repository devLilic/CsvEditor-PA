import { settingsService } from '@/features/csv-editor/services/settingsService'
import type { AppConfig } from '@/shared/ipc-types'
import { normalizeLowerThirdTypes, validateLowerThirdTypes } from '../domain/lowerThirdTypesValidation'
import type { LowerThirdTypeDefinition } from '../domain/lowerThirdTypes'
import { LOWER_THIRD_TYPES_CONFIG_KEY } from '../domain/lowerThirdTypesConfig'

export { LOWER_THIRD_TYPES_CONFIG_KEY }

export const lowerThirdTypesService = {
    async get(): Promise<LowerThirdTypeDefinition[]> {
        const config = await settingsService.getConfig()
        return normalizeLowerThirdTypes(config[LOWER_THIRD_TYPES_CONFIG_KEY])
    },

    async set(types: LowerThirdTypeDefinition[]): Promise<LowerThirdTypeDefinition[]> {
        if (!validateLowerThirdTypes(types)) {
            throw new Error('LOWER_THIRD_TYPES_INVALID_OR_TEMPLATE_NAMES_NOT_UNIQUE')
        }
        const normalized = normalizeLowerThirdTypes(types)
        const config = await settingsService.getConfig()
        const saved = await settingsService.setConfig({
            ...config,
            [LOWER_THIRD_TYPES_CONFIG_KEY]: normalized,
        } as AppConfig)
        return normalizeLowerThirdTypes(saved[LOWER_THIRD_TYPES_CONFIG_KEY] ?? normalized)
    },
}

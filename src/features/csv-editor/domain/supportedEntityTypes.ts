import type { EntityType } from './entities'

export const SUPPORTED_ENTITY_TYPES = [
    'titles',
    'persons',
    'locations',
    'phoneCalls',
    'hotTitles',
    'waitTitles',
    'waitLocations',
] as const satisfies readonly EntityType[]

export type SupportedEntityType = typeof SUPPORTED_ENTITY_TYPES[number]

export function isSupportedEntityType(value: string): value is SupportedEntityType {
    return SUPPORTED_ENTITY_TYPES.includes(value as SupportedEntityType)
}

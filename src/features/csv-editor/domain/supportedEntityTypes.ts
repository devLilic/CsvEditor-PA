import type { EntityType } from './entities'

/**
 * Current broadcast UI scope.
 *
 * Legacy CSV files may still contain hot/wait columns
 * (`Ultima Ora`, `Titlu Asteptare`, `Locatie Asteptare`). They are treated as
 * compatibility input only: parsing must tolerate those columns, active UI
 * flows must not expose them, and serialization must not generate new hot/wait
 * values. Destructive removal from existing files should happen only through an
 * explicit migration/backup flow.
 */
export const SUPPORTED_ENTITY_TYPES = [
    'titles',
    'persons',
    'locations',
] as const satisfies readonly EntityType[]

export type SupportedEntityType = typeof SUPPORTED_ENTITY_TYPES[number]

export function isSupportedEntityType(value: string): value is SupportedEntityType {
    return SUPPORTED_ENTITY_TYPES.includes(value as SupportedEntityType)
}

export type TedEntityType = 'titles' | 'persons' | 'locations' | 'phoneCalls'

export const TED_ENTITY_TYPES: TedEntityType[] = [
    'titles',
    'persons',
    'locations',
    'phoneCalls',
]

export const TED_ENTITY_LABELS: Record<TedEntityType, string> = {
    titles: 'Titles',
    persons: 'Persons',
    locations: 'Locations',
    phoneCalls: 'Phones',
}

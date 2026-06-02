export type TedEntityType =
    | 'titles'
    | 'persons'
    | 'locations'
    | 'phoneCalls'
    | 'hotTitles'
    | 'waitTitles'
    | 'waitLocations'

export const TED_ENTITY_TYPES: TedEntityType[] = [
    'titles',
    'persons',
    'locations',
    'phoneCalls',
    'hotTitles',
    'waitTitles',
    'waitLocations',
]

export const TED_ENTITY_LABELS: Record<TedEntityType, string> = {
    titles: 'Titles',
    persons: 'Persons',
    locations: 'Locations',
    phoneCalls: 'Phones',
    hotTitles: 'Hot Titles',
    waitTitles: 'Wait Titles',
    waitLocations: 'Wait Locations',
}

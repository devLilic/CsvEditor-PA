export type LowerThirdEntityKind = 'titles' | 'persons'

export interface LowerThirdTypeDefinition {
    /** Stable identifier stored on each title/person entity. */
    id: string
    name: string
    palette: {
        indicatorColor: string
        backgroundColor: string
        textColor: string
        /** Background opacity from 0 (transparent) to 1 (opaque). */
        opacity: number
    }
    templates: {
        titles: { name: string }
        persons: { name: string }
    }
}

export const DEFAULT_LOWER_THIRD_TYPES: LowerThirdTypeDefinition[] = [
    {
        id: 'ordinary',
        name: 'Obișnuit',
        palette: {
            indicatorColor: '#2196F3',
            backgroundColor: '#1565C0',
            textColor: '#FFFFFF',
            opacity: 0.7,
        },
        templates: {
            titles: { name: '01_Titlu' },
            persons: { name: '02_Nume' },
        },
    },
    {
        id: 'breaking-news',
        name: 'Breaking News',
        palette: {
            indicatorColor: '#000000',
            backgroundColor: '#000000',
            textColor: '#FFFF00',
            opacity: 1,
        },
        templates: {
            titles: { name: '03_Titlu_Breaking_News' },
            persons: { name: '04_Nume_Breaking_News' },
        },
    },
    {
        id: 'urgent',
        name: 'Ultima oră',
        palette: {
            indicatorColor: '#F44336',
            backgroundColor: '#D32F2F',
            textColor: '#FFFFFF',
            opacity: 1,
        },
        templates: {
            titles: { name: '05_Titlu_Ultima_Ora' },
            persons: { name: '06_Nume_Ultima_Ora' },
        },
    },
]

export const DEFAULT_LOWER_THIRD_TYPE_ID = 'ordinary'

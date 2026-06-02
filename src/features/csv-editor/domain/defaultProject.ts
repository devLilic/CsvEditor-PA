import { v4 as uuidv4 } from 'uuid'
import type { EntitiesState } from './entities'
import { createInvitedSection } from './entities'
import {
    FALLBACK_DEFAULT_PROJECT_SETTINGS,
    type DefaultProjectSettings,
} from './defaultProjectSettings'
import { serializeCsv } from '../utils/csvSerializer'

export const DEFAULT_PROJECT_CONTENT = FALLBACK_DEFAULT_PROJECT_SETTINGS

export function createDefaultProjectEntities(settings: DefaultProjectSettings): EntitiesState {
    const title = settings.title.trim()
    const location = settings.location.trim()
    const hotTitle = settings.hotTitle.trim()

    return {
        sections: [
            createInvitedSection(uuidv4(), [
                {
                    id: uuidv4(),
                    ...(title
                        ? {
                            title: {
                                id: uuidv4(),
                                title,
                            },
                        }
                        : {}),
                    person: {
                        id: uuidv4(),
                        name: settings.personName,
                        occupation: settings.personOccupation,
                    },
                    ...(location
                        ? {
                            location: {
                                id: uuidv4(),
                                location,
                            },
                        }
                        : {}),
                    ...(hotTitle
                        ? {
                            hotTitle: {
                                id: uuidv4(),
                                title: hotTitle,
                            },
                        }
                        : {}),
                },
            ]),
        ],
    }
}

export function createDefaultProjectCsv(settings: DefaultProjectSettings): string {
    return serializeCsv(createDefaultProjectEntities(settings))
}

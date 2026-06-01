import { titleTemplate } from './titleTemplate'
import { personTemplate } from './personTemplate'
import { locationTemplate } from './locationTemplate'
import { phoneCallTemplate } from './phoneCallTemplate'

export const broadcastTemplates = {
    titles: titleTemplate,
    persons: personTemplate,
    locations: locationTemplate,
    phoneCalls: phoneCallTemplate,
} as const

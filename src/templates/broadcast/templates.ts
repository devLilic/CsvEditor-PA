import { titleTemplate } from './titleTemplate'
import { personTemplate } from './personTemplate'
import { locationTemplate } from './locationTemplate'
import { phoneCallTemplate } from './phoneCallTemplate'
import { hotTitleTemplate } from './hotTitleTemplate'
import { waitTitleTemplate } from './waitTitleTemplate'
import { waitLocationTemplate } from './waitLocationTemplate'

export const broadcastTemplates = {
    titles: titleTemplate,
    persons: personTemplate,
    locations: locationTemplate,
    phoneCalls: phoneCallTemplate,
    hotTitles: hotTitleTemplate,
    waitTitles: waitTitleTemplate,
    waitLocations: waitLocationTemplate,
} as const

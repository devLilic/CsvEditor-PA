import { describe, expect, it } from 'vitest'
import { parseShowEdition, serializeShowEdition } from './showEdition'
import type { EntitiesState } from '../../csv-editor/domain/entities'

const entities: EntitiesState = {
    sections: [{ id: 'studio', kind: 'invited', rows: [{
        id: 'row',
        title: { id: 'title', title: 'Ediția de azi', lowerThirdTypeId: 'breaking-news', customFields: { subtitle: 'Subtitlu' } },
        person: { id: 'person', name: 'Invitat', occupation: 'Editor', customFields: { department: 'Redacție' } },
        location: { id: 'location', location: 'Studio', customFields: { region: 'Nord' } },
    }] }],
}

describe('show edition identity', () => {
    it('round trips the content and its lower-third assignments under the owning show', () => {
        const content = serializeShowEdition(entities, 'punctul-pe-azi')
        expect(JSON.parse(content)).toMatchObject({ version: 2, showProjectId: 'punctul-pe-azi' })
        expect(parseShowEdition(content, 'punctul-pe-azi')).toEqual(entities)
        expect(parseShowEdition(content, 'punctul-pe-azi').sections[0].rows[0]).toMatchObject({
            title: { customFields: { subtitle: 'Subtitlu' } },
            person: { customFields: { department: 'Redacție' } },
            location: { customFields: { region: 'Nord' } },
        })
    })

    it('rejects a snapshot belonging to another show before its content can replace the current edition', () => {
        expect(() => parseShowEdition(serializeShowEdition(entities, 'show-a'), 'show-b'))
            .toThrow('EDITION_BELONGS_TO_ANOTHER_SHOW')
    })

    it('accepts unidentified legacy snapshots without losing their saved assignments', () => {
        expect(parseShowEdition(JSON.stringify({ version: 1, entities }), 'show-a')).toEqual(entities)
    })

    it('does not reinterpret corrupted JSON as a CSV edition', () => {
        expect(() => parseShowEdition('{broken json', 'show-a')).toThrow()
        expect(() => parseShowEdition('{"entities":{"sections":[{"id":"x"}]}}', 'show-a')).toThrow('INVALID_EDITION_FILE')
    })
})

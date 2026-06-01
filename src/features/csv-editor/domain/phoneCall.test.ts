import { describe, expect, it } from 'vitest'
import type { Person } from './entities'
import { isPhoneCallPerson } from './phoneCall'

describe('isPhoneCallPerson', () => {
    it('returns true when person has a non-empty image', () => {
        const person: Person = {
            id: 'person-1',
            name: 'ION POPESCU',
            occupation: 'EXPERT',
            image: 'WORK_PATH/ion_popescu.jpg',
        }

        expect(isPhoneCallPerson(person)).toBe(true)
    })

    it('returns false when person has no image', () => {
        const person: Person = {
            id: 'person-1',
            name: 'ION POPESCU',
            occupation: 'EXPERT',
        }

        expect(isPhoneCallPerson(person)).toBe(false)
    })

    it('returns false when person image is an empty string', () => {
        const person: Person = {
            id: 'person-1',
            name: 'ION POPESCU',
            occupation: 'EXPERT',
            image: '',
        }

        expect(isPhoneCallPerson(person)).toBe(false)
    })

    it('returns false when person image contains only whitespace', () => {
        const person: Person = {
            id: 'person-1',
            name: 'ION POPESCU',
            occupation: 'EXPERT',
            image: '   ',
        }

        expect(isPhoneCallPerson(person)).toBe(false)
    })

    it('does not mutate the person object', () => {
        const person: Person = {
            id: 'person-1',
            name: 'ION POPESCU',
            occupation: 'EXPERT',
            image: '  WORK_PATH/ion_popescu.jpg  ',
        }
        const before = { ...person }

        isPhoneCallPerson(person)

        expect(person).toEqual(before)
    })
})

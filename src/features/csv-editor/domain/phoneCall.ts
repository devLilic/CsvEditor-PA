import type { Person } from './entities'

/**
 * phoneCalls is a UI view over persons. A person belongs to that view when the
 * existing CSV Image field is populated.
 */
export function isPhoneCallPerson(person: Person): boolean {
    return typeof person.image === 'string' && person.image.trim().length > 0
}

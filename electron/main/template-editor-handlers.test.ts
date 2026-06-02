import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('template editor PA storage paths', () => {
    it('uses PA filenames for user data and the dev default template document', () => {
        const source = readFileSync(join(process.cwd(), 'electron', 'main', 'template-editor-handlers.ts'), 'utf-8')

        expect(source).toContain("const USER_TEMPLATE_FILENAME = 'paTemplates.json'")
        expect(source).toContain("'defaultTemplates.pa.json'")
        expect(source).not.toContain('ocTemplates.json')
        expect(source).not.toContain('defaultTemplates.oc.json')
    })
})

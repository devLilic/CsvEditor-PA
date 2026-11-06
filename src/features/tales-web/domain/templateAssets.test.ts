import { describe, expect, it } from 'vitest'
import { collectTemplateAssetIds, rewriteTemplateAssetReferences } from './templateAssets'

describe('Tales Web template assets', () => {
    const id = '63626d0e-ab4c-44cd-8f08-38614eeca21b'

    it('collects unique asset references from nested templates', () => {
        const document = {
            templates: { persons: { canvas: { background: { value: `asset:${id}` } } } },
            lowerThirdVariants: { persons: { ordinary: { layers: [{ src: `asset:${id.toUpperCase()}` }] } } },
        }

        expect(collectTemplateAssetIds(document)).toEqual([id])
    })

    it('rewrites only mapped asset references and preserves the document shape', () => {
        const document = { canvas: { background: { value: `asset:${id}` } }, note: 'asset:other-value' }
        const paths = new Map([[id, 'C:\\Shows\\Telefon\\TED\\background.png']])

        expect(rewriteTemplateAssetReferences(document, paths)).toEqual({
            canvas: { background: { value: 'C:\\Shows\\Telefon\\TED\\background.png' } },
            note: 'asset:other-value',
        })
    })
})

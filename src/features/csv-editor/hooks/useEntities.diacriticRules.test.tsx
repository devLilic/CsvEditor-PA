import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { CsvProvider, useEntities } from '@/features/csv-editor'
import { useCsvContext } from '../context/CsvContext'
import { csvService } from '../services/csvService'
import { settingsService } from '../services/settingsService'

vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({
    useOptionalTemplateDocument: () => ({ activeProjectId: 'show-a', activeProject: undefined }),
    useTemplateDocument: () => ({ activeProjectId: 'show-a', activeProject: undefined }),
}))

function DiacriticSaveHarness() {
    const [personSaveResult, setPersonSaveResult] = useState('')
    const { dispatch } = useCsvContext()
    const { addEntity, updateEntity, savePersonEntity, getBlockItems } = useEntities()
    const sectionId = 'invited-section'
    const titles = getBlockItems(sectionId, 'titles')
    const persons = getBlockItems(sectionId, 'phoneCalls')
    const title = titles[0]?.data
    const person = persons[0]?.data

    const seed = () => dispatch({
        type: 'CSV_LOADED',
        payload: { sections: [{ id: sectionId, kind: 'invited', rows: [] }] },
    })

    return <div>
        <button onClick={seed}>seed</button>
        <button onClick={() => addEntity(sectionId, 'titles', {
            title: 'ȚITLU', customFields: { subtitle: 'Știre Ț', 'Ț-cheie': 'valoare Ț' },
        })}>create title</button>
        <button onClick={() => title && updateEntity(sectionId, 'titles', titles[0].id, {
            title: 'Alt Țitlu', customFields: { subtitle: 'Actualizat Ț', 'Ț-cheie': 'nou Ț' },
        })}>update title</button>
        <button onClick={async () => {
            const result = await savePersonEntity({ sectionId, data: {
                name: 'Țana Țurcanu', occupation: 'Editor Ț', image: 'C:/Images/Țurcanu.jpg',
                customFields: { bio: 'Despre Țana' },
            } })
            setPersonSaveResult(JSON.stringify(result))
        }}>create person</button>
        <button onClick={async () => {
            if (person) await savePersonEntity({ sectionId, id: persons[0].id, data: {
                name: 'Țania Ț', occupation: 'Reporter Ț', image: 'C:/Images/Țania.jpg',
                customFields: { bio: 'Actualizare Ț' },
            } })
        }}>update person</button>
        <output data-testid="title">{title?.title ?? ''}</output>
        <output data-testid="title-custom">{title?.customFields?.subtitle ?? ''}</output>
        <output data-testid="custom-key">{Object.keys(title?.customFields ?? {})[1] ?? ''}</output>
        <output data-testid="custom-value">{Object.values(title?.customFields ?? {})[1] ?? ''}</output>
        <output data-testid="person-name">{person?.name ?? ''}</output>
        <output data-testid="person-role">{person?.occupation ?? ''}</output>
        <output data-testid="person-image">{person?.image ?? ''}</output>
        <output data-testid="person-bio">{person?.customFields?.bio ?? ''}</output>
        <output data-testid="person-save-result">{personSaveResult}</output>
    </div>
}

describe('useEntities configurable diacritic conversion', () => {
    afterEach(cleanup)

    it('converts entity and custom field values on create/update while preserving keys and image paths', async () => {
        const user = userEvent.setup()
        vi.spyOn(settingsService, 'getConfig').mockResolvedValue({})
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        render(<CsvProvider><DiacriticSaveHarness /></CsvProvider>)

        await user.click(screen.getByRole('button', { name: 'seed' }))
        await user.click(screen.getByRole('button', { name: 'create title' }))
        await waitFor(() => expect(screen.getByTestId('title')).toHaveTextContent('ŢITLU'))
        expect(screen.getByTestId('title-custom')).toHaveTextContent('Știre Ţ')
        expect(screen.getByTestId('custom-key')).toHaveTextContent('Ț-cheie')
        expect(screen.getByTestId('custom-value')).toHaveTextContent('valoare Ţ')

        await user.click(screen.getByRole('button', { name: 'update title' }))
        await waitFor(() => expect(screen.getByTestId('title')).toHaveTextContent('Alt Ţitlu'))
        expect(screen.getByTestId('title-custom')).toHaveTextContent('Actualizat Ţ')
        expect(screen.getByTestId('custom-key')).toHaveTextContent('Ț-cheie')
        expect(screen.getByTestId('custom-value')).toHaveTextContent('nou Ţ')

        await user.click(screen.getByRole('button', { name: 'create person' }))
        await waitFor(() => expect(screen.getByTestId('person-name')).toHaveTextContent('Ţana Ţurcanu'))
        expect(screen.getByTestId('person-save-result')).toHaveTextContent('{"ok":true}')
        expect(screen.getByTestId('person-role')).toHaveTextContent('Editor Ţ')
        expect(screen.getByTestId('person-image')).toHaveTextContent('C:/Images/Țurcanu.jpg')
        expect(screen.getByTestId('person-bio')).toHaveTextContent('Despre Ţana')

        await user.click(screen.getByRole('button', { name: 'update person' }))
        await waitFor(() => expect(screen.getByTestId('person-name')).toHaveTextContent('Ţania Ţ'))
        expect(screen.getByTestId('person-role')).toHaveTextContent('Reporter Ţ')
        expect(screen.getByTestId('person-image')).toHaveTextContent('C:/Images/Țania.jpg')
        expect(screen.getByTestId('person-bio')).toHaveTextContent('Actualizare Ţ')
        expect(csvService.write).toHaveBeenCalled()
    })

    it('uses current rules and treats an empty rule list as disabled', async () => {
        const user = userEvent.setup()
        vi.spyOn(settingsService, 'getConfig').mockResolvedValue({ diacriticConversionRules: [] })
        render(<CsvProvider><DiacriticSaveHarness /></CsvProvider>)

        await user.click(screen.getByRole('button', { name: 'seed' }))
        await user.click(screen.getByRole('button', { name: 'create title' }))
        await waitFor(() => expect(screen.getByTestId('title')).toHaveTextContent('ȚITLU'))
        expect(screen.getByTestId('title-custom')).toHaveTextContent('Știre Ț')
    })

    it('applies a configured non-default replacement rule', async () => {
        const user = userEvent.setup()
        vi.spyOn(settingsService, 'getConfig').mockResolvedValue({
            diacriticConversionRules: [{ from: 'Ț', to: 'X' }],
        })
        render(<CsvProvider><DiacriticSaveHarness /></CsvProvider>)

        await user.click(screen.getByRole('button', { name: 'seed' }))
        await user.click(screen.getByRole('button', { name: 'create title' }))
        await waitFor(() => expect(screen.getByTestId('title')).toHaveTextContent('XITLU'))
        expect(screen.getByTestId('title-custom')).toHaveTextContent('Știre X')
        expect(screen.getByTestId('custom-key')).toHaveTextContent('Ț-cheie')
    })
})

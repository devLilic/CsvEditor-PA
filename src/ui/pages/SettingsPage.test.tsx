import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CsvProvider } from '@/features/csv-editor/context/CsvContext'
import { csvService } from '@/features/csv-editor/services/csvService'
import { DEFAULT_LOWER_THIRD_TYPES } from '@/features/lower-thirds/domain/lowerThirdTypes'
import { lowerThirdTypesService } from '@/features/lower-thirds/services/lowerThirdTypesService'
import { csvFileSettingsService } from '@/features/csv-editor/services/csvFileSettingsService'
import { DEFAULT_ENTITY_TEMPLATE_NAMES } from '@/features/lower-thirds/domain/entityTemplateNames'
import { entityTemplateNamesService } from '@/features/lower-thirds/services/entityTemplateNamesService'
import { SettingsPage } from './SettingsPage'

function renderSettingsPage() {
    return render(
        <CsvProvider>
            <MemoryRouter>
                <SettingsPage />
            </MemoryRouter>
        </CsvProvider>,
    )
}

afterEach(() => cleanup())

describe('SettingsPage lower-third matrix', () => {
    it('edits type names, palette colors, and both template names through the service', async () => {
        const getSpy = vi.spyOn(lowerThirdTypesService, 'get').mockResolvedValue(DEFAULT_LOWER_THIRD_TYPES)
        const setSpy = vi.spyOn(lowerThirdTypesService, 'set').mockImplementation(async (types) => types)
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const settingsSpy = vi.spyOn(csvFileSettingsService, 'getCsvFileSettings').mockResolvedValue({
            projectFolderPath: 'C:/Projects/News',
            exportPrefix: 'PA_',
            workingCsvPath: '',
            backupFolderPath: '',
            savedProjectsFolderPath: '',
            exportCsvFolderPath: '',
        })
        const getEntityNamesSpy = vi.spyOn(entityTemplateNamesService, 'get').mockResolvedValue(DEFAULT_ENTITY_TEMPLATE_NAMES)
        const setEntityNamesSpy = vi.spyOn(entityTemplateNamesService, 'set').mockImplementation(async (names) => names)
        const user = userEvent.setup()

        renderSettingsPage()

        const name = await screen.findByRole('textbox', { name: 'Denumire ordinary' })
        expect(await screen.findByLabelText('Prefix șablon titlu ordinary')).toHaveTextContent('PA_')
        await user.clear(name)
        await user.type(name, 'Principal')
        await user.clear(screen.getByRole('textbox', { name: 'Șablon titlu ordinary' }))
        await user.type(screen.getByRole('textbox', { name: 'Șablon titlu ordinary' }), 'Titlu_Main')
        await user.clear(screen.getByRole('textbox', { name: 'Șablon persoană ordinary' }))
        await user.type(screen.getByRole('textbox', { name: 'Șablon persoană ordinary' }), 'Persoană_Main')
        await user.clear(screen.getByRole('textbox', { name: 'Șablon locations' }))
        await user.type(screen.getByRole('textbox', { name: 'Șablon locations' }), 'NewsLocation')

        await user.click(screen.getByRole('button', { name: 'Salvează' }))

        expect(setSpy).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({
                id: 'ordinary',
                name: 'Principal',
                templates: {
                    titles: { name: 'Titlu_Main' },
                    persons: { name: 'Persoană_Main' },
                },
            }),
        ]))
        expect(await screen.findByRole('status')).toHaveTextContent('Setările au fost salvate.')
        expect(writeSpy).toHaveBeenCalled()
        expect(setEntityNamesSpy).toHaveBeenCalledWith(expect.objectContaining({ locations: 'NewsLocation' }))
        getSpy.mockRestore()
        setSpy.mockRestore()
        writeSpy.mockRestore()
        settingsSpy.mockRestore()
        getEntityNamesSpy.mockRestore()
        setEntityNamesSpy.mockRestore()
    })
})

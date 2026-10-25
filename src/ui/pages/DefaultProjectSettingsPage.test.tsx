import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { csvFileSettingsService } from '@/features/csv-editor/services/csvFileSettingsService'
import { defaultProjectSettingsService } from '@/features/csv-editor/services/defaultProjectSettingsService'
import { phoneImageSettingsService } from '@/features/csv-editor/services/phoneImageSettingsService'
import { DefaultProjectSettingsPage } from './DefaultProjectSettingsPage'

vi.mock('@/features/csv-editor/services/defaultProjectSettingsService', () => ({
    defaultProjectSettingsService: {
        getDefaultProjectSettings: vi.fn(),
        setDefaultProjectSettings: vi.fn(),
    },
}))

vi.mock('@/features/csv-editor/services/phoneImageSettingsService', () => ({
    phoneImageSettingsService: {
        getPhoneImageSettings: vi.fn(),
        setPhoneImageSettings: vi.fn(),
    },
}))

vi.mock('@/features/csv-editor/services/csvFileSettingsService', () => ({
    csvFileSettingsService: {
        getCsvFileSettings: vi.fn(),
        setCsvFileSettings: vi.fn(),
        selectProjectFolder: vi.fn(),
    },
}))

const projectSettings = {
    title: 'SAVED TITLE',
    personName: 'SAVED NAME',
    personOccupation: 'SAVED OCCUPATION',
    location: 'SAVED LOCATION',
}

const phoneSettings = { workPath: 'C:/work/Telefon', width: 420, height: 540 }
const fileSettings = {
    projectFolderPath: 'C:/work',
    exportPrefix: 'ED_',
    workingCsvPath: '',
    backupFolderPath: 'C:/work/Backup',
    savedProjectsFolderPath: 'C:/work/Saved',
    exportCsvFolderPath: 'C:/work/Export',
}

function renderPage() {
    return render(
        <MemoryRouter initialEntries={['/settings/default-project']}>
            <Routes>
                <Route path="/settings/default-project" element={<DefaultProjectSettingsPage />} />
                <Route path="/csv-editor" element={<div>CSV editor page</div>} />
            </Routes>
        </MemoryRouter>,
    )
}

describe('DefaultProjectSettingsPage project storage', () => {
    beforeEach(() => {
        vi.mocked(defaultProjectSettingsService.getDefaultProjectSettings).mockResolvedValue(projectSettings)
        vi.mocked(defaultProjectSettingsService.setDefaultProjectSettings).mockImplementation(async (value) => value)
        vi.mocked(phoneImageSettingsService.getPhoneImageSettings).mockResolvedValue(phoneSettings)
        vi.mocked(phoneImageSettingsService.setPhoneImageSettings).mockImplementation(async (value) => value)
        vi.mocked(csvFileSettingsService.getCsvFileSettings).mockResolvedValue(fileSettings)
        vi.mocked(csvFileSettingsService.setCsvFileSettings).mockImplementation(async (value) => value)
        vi.mocked(csvFileSettingsService.selectProjectFolder).mockResolvedValue('D:/Proiect')
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('shows one project root picker, an export prefix, and no separate folder settings', async () => {
        renderPage()

        expect(await screen.findByLabelText('Folder de lucru al proiectului')).toHaveValue('C:/work')
        expect(screen.getByLabelText('Prefix export')).toHaveValue('ED_')
        expect(screen.getByRole('button', { name: 'Alege folder' })).toBeInTheDocument()
        expect(screen.getByText(/Saved, Backup, Export și Telefon/)).toBeInTheDocument()
        expect(screen.queryByLabelText(/Fișier CSV de lucru|Folder backup CSV|Folder proiecte salvate|Export CSV Folder|Folder imagini telefonice/)).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Ultima oră implicită')).not.toBeInTheDocument()
    })

    it('uses the project folder picker and saves the root and prefix settings', async () => {
        const user = userEvent.setup()
        renderPage()

        await user.click(await screen.findByRole('button', { name: 'Alege folder' }))
        expect(screen.getByLabelText('Folder de lucru al proiectului')).toHaveValue('D:/Proiect')
        await user.clear(screen.getByLabelText('Prefix export'))
        await user.type(screen.getByLabelText('Prefix export'), 'NEWS_')

        const storageForm = screen.getByLabelText('Folder de lucru al proiectului').closest('form')!
        await user.click(storageForm.querySelector('button[type="submit"]')!)

        await waitFor(() => {
            expect(csvFileSettingsService.setCsvFileSettings).toHaveBeenCalledWith(expect.objectContaining({
                projectFolderPath: 'D:/Proiect',
                exportPrefix: 'NEWS_',
            }))
        })
    })

    it('keeps phone image size settings while using the project Telefon folder', async () => {
        renderPage()

        expect(await screen.findByLabelText(/Width imagine/)).toHaveValue(420)
        expect(screen.getByLabelText(/Height imagine/)).toHaveValue(540)
        expect(screen.getByText(/subfolderul Telefon/)).toBeInTheDocument()
    })
})

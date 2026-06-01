import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
    FALLBACK_DEFAULT_PROJECT_SETTINGS,
    type DefaultProjectSettings,
} from '@/features/csv-editor/domain/defaultProjectSettings'
import {
    FALLBACK_PHONE_IMAGE_SETTINGS,
    type PhoneImageSettings,
} from '@/features/csv-editor/domain/phoneImageSettings'
import type { CsvFileSettings } from '@/features/csv-editor/domain/csvFileSettings'
import { defaultProjectSettingsService } from '@/features/csv-editor/services/defaultProjectSettingsService'
import { phoneImageSettingsService } from '@/features/csv-editor/services/phoneImageSettingsService'
import { csvFileSettingsService } from '@/features/csv-editor/services/csvFileSettingsService'
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
        selectWorkPath: vi.fn(),
    },
}))

vi.mock('@/features/csv-editor/services/csvFileSettingsService', () => ({
    csvFileSettingsService: {
        getCsvFileSettings: vi.fn(),
        setCsvFileSettings: vi.fn(),
        selectWorkingCsv: vi.fn(),
        selectBackupFolder: vi.fn(),
        selectSavedProjectsFolder: vi.fn(),
        selectExportCsvFolder: vi.fn(),
    },
}))

const savedSettings: DefaultProjectSettings = {
    title: 'SAVED TITLE',
    personName: 'SAVED NAME',
    personOccupation: 'SAVED OCCUPATION',
    location: 'SAVED LOCATION',
}

const savedPhoneImageSettings: PhoneImageSettings = {
    workPath: 'WORK_PATH',
    width: 420,
    height: 540,
}

const savedCsvFileSettings: CsvFileSettings = {
    workingCsvPath: 'C:/work/current.csv',
    backupFolderPath: 'C:/work/backups',
    savedProjectsFolderPath: 'C:/work/saved-projects',
    exportCsvFolderPath: 'C:/work/export',
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

describe('DefaultProjectSettingsPage', () => {
    beforeEach(() => {
        vi.mocked(defaultProjectSettingsService.getDefaultProjectSettings).mockResolvedValue(savedSettings)
        vi.mocked(defaultProjectSettingsService.setDefaultProjectSettings).mockImplementation(async (settings) => settings)
        vi.mocked(phoneImageSettingsService.getPhoneImageSettings).mockResolvedValue(savedPhoneImageSettings)
        vi.mocked(phoneImageSettingsService.setPhoneImageSettings).mockImplementation(async (settings) => settings)
        vi.mocked(phoneImageSettingsService.selectWorkPath).mockResolvedValue('SELECTED_WORK_PATH')
        vi.mocked(csvFileSettingsService.getCsvFileSettings).mockResolvedValue(savedCsvFileSettings)
        vi.mocked(csvFileSettingsService.setCsvFileSettings).mockImplementation(async (settings) => settings)
        vi.mocked(csvFileSettingsService.selectWorkingCsv).mockResolvedValue('C:/selected/selected.csv')
        vi.mocked(csvFileSettingsService.selectBackupFolder).mockResolvedValue('C:/selected/backups')
        vi.mocked(csvFileSettingsService.selectSavedProjectsFolder).mockResolvedValue('C:/selected/saved-projects')
        vi.mocked(csvFileSettingsService.selectExportCsvFolder).mockResolvedValue('C:/selected/export')
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('shows the required fields', () => {
        renderPage()

        expect(screen.getByRole('heading', { name: /proiect nou/i })).toBeInTheDocument()
        expect(screen.getByText(/Texte standard pentru proiect nou/i)).toBeInTheDocument()
        expect(screen.getByText(/urm/i)).toBeInTheDocument()
        expect(screen.getByLabelText('Titlu implicit')).toBeInTheDocument()
        expect(screen.getByLabelText('Nume implicit')).toBeInTheDocument()
        expect(screen.getByLabelText(/Func/)).toBeInTheDocument()
        expect(screen.getByLabelText(/Loca/)).toBeInTheDocument()
        expect(screen.getAllByRole('button', { name: /Salve/ })).toHaveLength(3)
        expect(screen.getAllByRole('button', { name: /Reseteaz/ })).toHaveLength(2)
        expect(screen.getByRole('button', { name: /editor/i })).toBeInTheDocument()
    })

    it('shows phone image settings section', () => {
        renderPage()

        expect(screen.getByRole('heading', { name: /imagine apel telefonic/i })).toBeInTheDocument()
    })

    it('shows CSV file settings section', () => {
        renderPage()

        expect(screen.getByRole('heading', { name: /fișier CSV/i })).toBeInTheDocument()
        expect(screen.getByLabelText('Fișier CSV de lucru')).toBeInTheDocument()
        expect(screen.getByLabelText('Folder backup CSV')).toBeInTheDocument()
        expect(screen.getByLabelText('Folder proiecte salvate')).toBeInTheDocument()
        expect(screen.getByLabelText('Export CSV Folder')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Alege CSV' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Alege folder backup' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Alege folder proiecte salvate' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Alege folder export' })).toBeInTheDocument()
    })

    it('shows saved projects folder field and picker button', () => {
        renderPage()

        expect(screen.getByLabelText('Folder proiecte salvate')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Alege folder proiecte salvate' })).toBeInTheDocument()
    })

    it('shows phone image folder field', () => {
        renderPage()

        expect(screen.getByLabelText('Folder imagini telefonice')).toBeInTheDocument()
    })

    it('shows phone image size fields and folder picker', () => {
        renderPage()

        expect(screen.getByLabelText(/Width imagine/)).toBeInTheDocument()
        expect(screen.getByLabelText(/Height imagine/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Alege folder' })).toBeInTheDocument()
    })

    it('loads saved values', async () => {
        renderPage()

        await waitFor(() => {
            expect(screen.getByLabelText('Titlu implicit')).toHaveValue(savedSettings.title)
        })

        expect(screen.getByLabelText('Nume implicit')).toHaveValue(savedSettings.personName)
        expect(screen.getByLabelText(/Func/)).toHaveValue(savedSettings.personOccupation)
        expect(screen.getByLabelText(/Loca/)).toHaveValue(savedSettings.location)
    })

    it('loads saved CSV file settings values', async () => {
        renderPage()

        await waitFor(() => {
            expect(screen.getByLabelText('Fișier CSV de lucru')).toHaveValue(savedCsvFileSettings.workingCsvPath)
        })

        expect(screen.getByLabelText('Folder backup CSV')).toHaveValue(savedCsvFileSettings.backupFolderPath)
        expect(screen.getByLabelText('Folder proiecte salvate')).toHaveValue(savedCsvFileSettings.savedProjectsFolderPath)
        expect(screen.getByLabelText('Export CSV Folder')).toHaveValue(savedCsvFileSettings.exportCsvFolderPath)
    })

    it('loads existing saved projects folder value into the form', async () => {
        renderPage()

        await waitFor(() => {
            expect(screen.getByLabelText('Folder proiecte salvate')).toHaveValue('C:/work/saved-projects')
        })
    })

    it('allows editing fields', async () => {
        const user = userEvent.setup()
        renderPage()
        const titleInput = screen.getByLabelText('Titlu implicit')

        await waitFor(() => {
            expect(titleInput).toHaveValue(savedSettings.title)
        })

        await user.clear(titleInput)
        await user.type(titleInput, 'UPDATED TITLE')

        expect(titleInput).toHaveValue('UPDATED TITLE')
    })

    it('calls the service when saving', async () => {
        const user = userEvent.setup()
        renderPage()
        const titleInput = screen.getByLabelText('Titlu implicit')

        await waitFor(() => {
            expect(titleInput).toHaveValue(savedSettings.title)
        })

        await user.clear(titleInput)
        await user.type(titleInput, 'TITLE TO SAVE')
        await user.click(screen.getAllByRole('button', { name: /Salve/ })[0])

        await waitFor(() => {
            expect(defaultProjectSettingsService.setDefaultProjectSettings).toHaveBeenCalledWith({
                ...savedSettings,
                title: 'TITLE TO SAVE',
            })
        })
    })

    it('resets the form to fallback values', async () => {
        const user = userEvent.setup()
        renderPage()

        await waitFor(() => {
            expect(screen.getByLabelText('Titlu implicit')).toHaveValue(savedSettings.title)
        })

        await user.click(screen.getAllByRole('button', { name: /Reseteaz/ })[0])

        await waitFor(() => {
            expect(screen.getByLabelText('Titlu implicit')).toHaveValue(FALLBACK_DEFAULT_PROJECT_SETTINGS.title)
        })

        expect(screen.getByLabelText('Nume implicit')).toHaveValue(FALLBACK_DEFAULT_PROJECT_SETTINGS.personName)
        expect(screen.getByLabelText(/Func/)).toHaveValue(FALLBACK_DEFAULT_PROJECT_SETTINGS.personOccupation)
        expect(screen.getByLabelText(/Loca/)).toHaveValue(FALLBACK_DEFAULT_PROJECT_SETTINGS.location)
        expect(defaultProjectSettingsService.setDefaultProjectSettings).toHaveBeenCalledWith(
            FALLBACK_DEFAULT_PROJECT_SETTINGS,
        )
    })

    it('navigates back to the CSV editor', async () => {
        const user = userEvent.setup()
        renderPage()

        await user.click(screen.getByRole('button', { name: /editor/i }))

        expect(screen.getByText('CSV editor page')).toBeInTheDocument()
    })

    it('allows changing phone image width and height', async () => {
        const user = userEvent.setup()
        renderPage()

        const widthInput = screen.getByLabelText(/Width imagine/)
        const heightInput = screen.getByLabelText(/Height imagine/)

        await waitFor(() => {
            expect(screen.getByLabelText('Folder imagini telefonice')).toHaveValue(savedPhoneImageSettings.workPath)
        })

        await user.clear(widthInput)
        await user.type(widthInput, '640')
        await user.clear(heightInput)
        await user.type(heightInput, '720')

        expect(widthInput).toHaveValue(640)
        expect(heightInput).toHaveValue(720)
    })

    it('saves phone image settings through the service', async () => {
        const user = userEvent.setup()
        renderPage()

        const widthInput = screen.getByLabelText(/Width imagine/)
        const heightInput = screen.getByLabelText(/Height imagine/)

        await waitFor(() => {
            expect(screen.getByLabelText('Folder imagini telefonice')).toHaveValue(savedPhoneImageSettings.workPath)
        })

        await user.clear(widthInput)
        await user.type(widthInput, '640')
        await user.clear(heightInput)
        await user.type(heightInput, '720')
        await user.click(screen.getAllByRole('button', { name: /Salve/ })[1])

        await waitFor(() => {
            expect(phoneImageSettingsService.setPhoneImageSettings).toHaveBeenCalledWith({
                workPath: savedPhoneImageSettings.workPath,
                width: 640,
                height: 720,
            })
        })
    })

    it('selects phone image work path through the service', async () => {
        const user = userEvent.setup()
        renderPage()

        await user.click(screen.getByRole('button', { name: 'Alege folder' }))

        await waitFor(() => {
            expect(screen.getByLabelText('Folder imagini telefonice')).toHaveValue('SELECTED_WORK_PATH')
        })
        expect(phoneImageSettingsService.selectWorkPath).toHaveBeenCalledOnce()
    })

    it('resets phone image settings to fallback values', async () => {
        const user = userEvent.setup()
        renderPage()

        await user.click(screen.getAllByRole('button', { name: /Reseteaz/ })[1])

        await waitFor(() => {
            expect(phoneImageSettingsService.setPhoneImageSettings).toHaveBeenCalledWith(
                FALLBACK_PHONE_IMAGE_SETTINGS
            )
        })
    })

    it('selects working CSV through the CSV file settings service', async () => {
        const user = userEvent.setup()
        renderPage()

        await user.click(screen.getByRole('button', { name: 'Alege CSV' }))

        await waitFor(() => {
            expect(screen.getByLabelText('Fișier CSV de lucru')).toHaveValue('C:/selected/selected.csv')
        })
        expect(csvFileSettingsService.selectWorkingCsv).toHaveBeenCalledOnce()
    })

    it('selects backup folder through the CSV file settings service', async () => {
        const user = userEvent.setup()
        renderPage()

        await user.click(screen.getByRole('button', { name: 'Alege folder backup' }))

        await waitFor(() => {
            expect(screen.getByLabelText('Folder backup CSV')).toHaveValue('C:/selected/backups')
        })
        expect(csvFileSettingsService.selectBackupFolder).toHaveBeenCalledOnce()
    })

    it('selects saved projects folder through the CSV file settings service', async () => {
        const user = userEvent.setup()
        renderPage()

        await user.click(screen.getByRole('button', { name: 'Alege folder proiecte salvate' }))

        await waitFor(() => {
            expect(screen.getByLabelText('Folder proiecte salvate')).toHaveValue('C:/selected/saved-projects')
        })
        expect(csvFileSettingsService.selectSavedProjectsFolder).toHaveBeenCalledOnce()
    })

    it('selects export CSV folder through the CSV file settings service', async () => {
        const user = userEvent.setup()
        renderPage()

        await user.click(screen.getByRole('button', { name: 'Alege folder export' }))

        await waitFor(() => {
            expect(screen.getByLabelText('Export CSV Folder')).toHaveValue('C:/selected/export')
        })
        expect(csvFileSettingsService.selectExportCsvFolder).toHaveBeenCalledOnce()
    })

    it('shows fallback export folder when export CSV folder is not configured', async () => {
        vi.mocked(csvFileSettingsService.getCsvFileSettings).mockResolvedValueOnce({
            ...savedCsvFileSettings,
            exportCsvFolderPath: '',
        })

        renderPage()

        await waitFor(() => {
            expect(screen.getByText('Folder efectiv: C:\\work\\Export')).toBeInTheDocument()
        })
    })

    it('saves CSV file settings through the service', async () => {
        const user = userEvent.setup()
        renderPage()

        await waitFor(() => {
            expect(screen.getByLabelText('Fișier CSV de lucru')).toHaveValue(savedCsvFileSettings.workingCsvPath)
        })

        await user.click(screen.getByRole('button', { name: 'Alege CSV' }))
        await user.click(screen.getByRole('button', { name: 'Alege folder backup' }))
        await user.click(screen.getByRole('button', { name: 'Alege folder proiecte salvate' }))
        await user.click(screen.getByRole('button', { name: 'Alege folder export' }))
        await user.click(screen.getAllByRole('button', { name: /Salve/ })[2])

        await waitFor(() => {
            expect(csvFileSettingsService.setCsvFileSettings).toHaveBeenCalledWith({
                workingCsvPath: 'C:/selected/selected.csv',
                backupFolderPath: 'C:/selected/backups',
                savedProjectsFolderPath: 'C:/selected/saved-projects',
                exportCsvFolderPath: 'C:/selected/export',
            })
        })
    })

    it('persists savedProjectsFolderPath when saving CSV file settings', async () => {
        const user = userEvent.setup()
        renderPage()

        await waitFor(() => {
            expect(screen.getByLabelText('Folder proiecte salvate')).toHaveValue(savedCsvFileSettings.savedProjectsFolderPath)
        })

        await user.clear(screen.getByLabelText('Folder proiecte salvate'))
        await user.type(screen.getByLabelText('Folder proiecte salvate'), 'D:/saved/projects')
        await user.click(screen.getAllByRole('button', { name: /Salve/ })[2])

        await waitFor(() => {
            expect(csvFileSettingsService.setCsvFileSettings).toHaveBeenCalledWith({
                workingCsvPath: savedCsvFileSettings.workingCsvPath,
                backupFolderPath: savedCsvFileSettings.backupFolderPath,
                savedProjectsFolderPath: 'D:/saved/projects',
                exportCsvFolderPath: savedCsvFileSettings.exportCsvFolderPath,
            })
        })
    })

    it('persists exportCsvFolderPath when saving CSV file settings', async () => {
        const user = userEvent.setup()
        renderPage()

        await waitFor(() => {
            expect(screen.getByLabelText('Export CSV Folder')).toHaveValue(savedCsvFileSettings.exportCsvFolderPath)
        })

        await user.clear(screen.getByLabelText('Export CSV Folder'))
        await user.type(screen.getByLabelText('Export CSV Folder'), 'D:/exports')
        await user.click(screen.getAllByRole('button', { name: /Salve/ })[2])

        await waitFor(() => {
            expect(csvFileSettingsService.setCsvFileSettings).toHaveBeenCalledWith({
                workingCsvPath: savedCsvFileSettings.workingCsvPath,
                backupFolderPath: savedCsvFileSettings.backupFolderPath,
                savedProjectsFolderPath: savedCsvFileSettings.savedProjectsFolderPath,
                exportCsvFolderPath: 'D:/exports',
            })
        })
    })
})

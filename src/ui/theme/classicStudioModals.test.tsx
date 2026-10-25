import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FALLBACK_DEFAULT_PROJECT_SETTINGS } from '@/features/csv-editor/domain/defaultProjectSettings'
import { FALLBACK_PHONE_IMAGE_SETTINGS } from '@/features/csv-editor/domain/phoneImageSettings'
import { FALLBACK_CSV_FILE_SETTINGS } from '@/features/csv-editor/domain/csvFileSettings'
import { defaultProjectSettingsService } from '@/features/csv-editor/services/defaultProjectSettingsService'
import { phoneImageSettingsService } from '@/features/csv-editor/services/phoneImageSettingsService'
import { csvFileSettingsService } from '@/features/csv-editor/services/csvFileSettingsService'
import { settingsService } from '@/features/csv-editor/services/settingsService'
import { ImportTitlesFromBackupDialog } from '@/ui/components/title-backup/ImportTitlesFromBackupDialog'
import { PersonQuickTitleDialog } from '@/ui/components/quick-titles/PersonQuickTitleDialog'
import { DefaultProjectSettingsPage } from '@/ui/pages/DefaultProjectSettingsPage'

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

vi.mock('@/features/csv-editor/services/settingsService', () => ({
    settingsService: {
        restoreUiTheme: vi.fn(),
        setUiTheme: vi.fn(),
        getPlateauTitleDividerCreationEnabled: vi.fn(),
        setPlateauTitleDividerCreationEnabled: vi.fn(),
        getShowProjectSelectorEnabled: vi.fn(),
        setShowProjectSelectorEnabled: vi.fn(),
    },
}))

vi.mock('@/ui/components/app-update/AppUpdatePanel', () => ({
    AppUpdatePanel: () => (
        <section className="app-panel">
            Update panel
        </section>
    ),
}))

const themeCss = readFileSync(join(process.cwd(), 'src/styles/index.css'), 'utf8')

function renderSettings() {
    return render(
        <MemoryRouter initialEntries={['/settings/default-project']}>
            <Routes>
                <Route path="/settings/default-project" element={<DefaultProjectSettingsPage />} />
                <Route path="/csv-editor" element={<div>Editor</div>} />
            </Routes>
        </MemoryRouter>,
    )
}

describe('classic studio modals and settings theme', () => {
    beforeEach(() => {
        vi.mocked(defaultProjectSettingsService.getDefaultProjectSettings).mockResolvedValue(FALLBACK_DEFAULT_PROJECT_SETTINGS)
        vi.mocked(defaultProjectSettingsService.setDefaultProjectSettings).mockImplementation(async (settings) => settings)
        vi.mocked(phoneImageSettingsService.getPhoneImageSettings).mockResolvedValue(FALLBACK_PHONE_IMAGE_SETTINGS)
        vi.mocked(phoneImageSettingsService.setPhoneImageSettings).mockImplementation(async (settings) => settings)
        vi.mocked(phoneImageSettingsService.selectWorkPath).mockResolvedValue('')
        vi.mocked(csvFileSettingsService.getCsvFileSettings).mockResolvedValue(FALLBACK_CSV_FILE_SETTINGS)
        vi.mocked(csvFileSettingsService.setCsvFileSettings).mockImplementation(async (settings) => settings)
        vi.mocked(csvFileSettingsService.selectWorkingCsv).mockResolvedValue('')
        vi.mocked(csvFileSettingsService.selectBackupFolder).mockResolvedValue('')
        vi.mocked(csvFileSettingsService.selectSavedProjectsFolder).mockResolvedValue('')
        vi.mocked(csvFileSettingsService.selectExportCsvFolder).mockResolvedValue('')
        vi.mocked(settingsService.restoreUiTheme).mockResolvedValue('dark')
        vi.mocked(settingsService.setUiTheme).mockImplementation(async (theme) => theme)
        vi.mocked(settingsService.getPlateauTitleDividerCreationEnabled).mockResolvedValue(true)
        vi.mocked(settingsService.setPlateauTitleDividerCreationEnabled).mockImplementation(async (enabled) => enabled)
        vi.mocked(settingsService.getShowProjectSelectorEnabled).mockResolvedValue(true)
        vi.mocked(settingsService.setShowProjectSelectorEnabled).mockImplementation(async (enabled) => enabled)
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('modalul foloseste tokenii dark', () => {
        render(
            <PersonQuickTitleDialog
                open
                initialValue="TEST: "
                personName="Ion"
                onSave={vi.fn()}
                onCancel={vi.fn()}
            />,
        )

        expect(screen.getByRole('dialog')).toHaveClass('app-modal-overlay')
        expect(screen.getByRole('dialog').querySelector('.app-modal')).toBeInTheDocument()
        expect(themeCss).toContain(':root[data-theme=\'dark\'] .app-modal')
        expect(themeCss).toContain('background: var(--modal-bg)')
    })

    it('import modal mosteneste tema', async () => {
        render(
            <ImportTitlesFromBackupDialog
                open
                onClose={vi.fn()}
                onImport={vi.fn()}
                service={{
                    listBackups: async () => ({ ok: true, files: ['01_01_2026_titluri.csv'] }),
                    readBackup: async () => ({
                        valid: true,
                        filename: '01_01_2026_titluri.csv',
                        items: [{ type: 'title', title: 'TITLU' }],
                        errors: [],
                    }),
                }}
            />,
        )

        expect(screen.getByRole('dialog')).toHaveClass('app-modal-overlay')
        expect(screen.getByRole('heading', { name: 'Import titluri din backup' }).closest('.app-modal')).toBeInTheDocument()
        await waitFor(() => {
            expect(screen.getByText('01_01_2026_titluri.csv')).toBeInTheDocument()
        })
    })

    it('Settings afiseaza labelul Dark', async () => {
        renderSettings()

        expect(await screen.findByText('Dark')).toBeInTheDocument()
    })

    it('valoarea interna pentru tema dark ramane dark', async () => {
        renderSettings()

        const darkInput = await screen.findByDisplayValue('dark')
        expect(darkInput).toHaveAttribute('name', 'uiTheme')
    })

    it('legacy ramane selectabil separat', async () => {
        renderSettings()

        const legacyInput = await screen.findByDisplayValue('legacy')
        expect(legacyInput).toHaveAttribute('name', 'uiTheme')
    })

    it('notificarile folosesc clase semantice', () => {
        render(
            <div>
                <div className="app-notification app-notification-success">ok</div>
                <div className="app-notification app-notification-warning">warn</div>
                <div className="app-notification app-notification-danger">error</div>
            </div>,
        )

        expect(screen.getByText('ok')).toHaveClass('app-notification-success')
        expect(screen.getByText('warn')).toHaveClass('app-notification-warning')
        expect(screen.getByText('error')).toHaveClass('app-notification-danger')
    })

    it('metallic ramane selectabil', async () => {
        renderSettings()

        const metallicInput = await screen.findByDisplayValue('metallic')
        expect(metallicInput).toHaveAttribute('name', 'uiTheme')
    })
})

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { settingsService } from '@/features/csv-editor/services/settingsService'
import { DefaultProjectSettingsPage } from './DefaultProjectSettingsPage'

vi.mock('@/ui/components/app-update/AppUpdatePanel', () => ({ AppUpdatePanel: () => <div>Update panel</div> }))

function renderPage() {
    return render(<MemoryRouter initialEntries={['/settings/application']}><Routes>
        <Route path="/settings/application" element={<DefaultProjectSettingsPage />} />
        <Route path="/csv-editor" element={<div>CSV editor page</div>} />
    </Routes></MemoryRouter>)
}

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('Application settings navigation', () => {
    it('keeps a visible way back to the editor', async () => {
        vi.spyOn(settingsService, 'restoreUiTheme').mockResolvedValue('legacy')
        vi.spyOn(settingsService, 'getPlateauTitleDividerCreationEnabled').mockResolvedValue(true)
        vi.spyOn(settingsService, 'getShowProjectSelectorEnabled').mockResolvedValue(true)
        const user = userEvent.setup()
        renderPage()

        expect(screen.getByRole('heading', { name: 'Setări aplicație' })).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Înapoi la editor' }))
        expect(await screen.findByText('CSV editor page')).toBeInTheDocument()
    })

    it('lets this computer hide the show selector from the editor', async () => {
        vi.spyOn(settingsService, 'restoreUiTheme').mockResolvedValue('legacy')
        vi.spyOn(settingsService, 'getPlateauTitleDividerCreationEnabled').mockResolvedValue(true)
        vi.spyOn(settingsService, 'getShowProjectSelectorEnabled').mockResolvedValue(true)
        const saveSetting = vi.spyOn(settingsService, 'setShowProjectSelectorEnabled').mockResolvedValue(false)
        const user = userEvent.setup()
        renderPage()

        const selectorSetting = await screen.findByRole('checkbox', { name: 'Afișează selectorul emisiunii în editor' })
        await user.click(selectorSetting)

        expect(saveSetting).toHaveBeenCalledWith(false)
        expect(await screen.findByText(/emisiunea salvată ca activă rămâne în uz/i)).toBeInTheDocument()
    })

    it('edits and persists global diacritic rules', async () => {
        vi.spyOn(settingsService, 'restoreUiTheme').mockResolvedValue('legacy')
        vi.spyOn(settingsService, 'getPlateauTitleDividerCreationEnabled').mockResolvedValue(true)
        vi.spyOn(settingsService, 'getShowProjectSelectorEnabled').mockResolvedValue(true)
        vi.spyOn(settingsService, 'getConfig').mockResolvedValue({})
        const save = vi.spyOn(settingsService, 'setDiacriticRules').mockResolvedValue([{ from: 'Ș', to: 'Ţ' }])
        const user = userEvent.setup()
        renderPage()

        expect(await screen.findByRole('textbox', { name: 'Sursă 1' })).toHaveValue('Ț')
        await user.clear(screen.getByRole('textbox', { name: 'Sursă 1' }))
        await user.type(screen.getByRole('textbox', { name: 'Sursă 1' }), 'Ș')
        await user.click(screen.getByRole('button', { name: 'Salvează regulile' }))

        expect(save).toHaveBeenCalledWith([{ from: 'Ș', to: 'Ţ' }])
        expect(await screen.findByText('Salvat.')).toBeInTheDocument()
        await user.type(screen.getByRole('textbox', { name: 'Sursă 1' }), 'x')
        expect(screen.queryByText('Salvat.')).not.toBeInTheDocument()
    })

    it('rejects duplicate sources and allows disabling with an empty list', async () => {
        vi.spyOn(settingsService, 'restoreUiTheme').mockResolvedValue('legacy')
        vi.spyOn(settingsService, 'getPlateauTitleDividerCreationEnabled').mockResolvedValue(true)
        vi.spyOn(settingsService, 'getShowProjectSelectorEnabled').mockResolvedValue(true)
        vi.spyOn(settingsService, 'getConfig').mockResolvedValue({})
        const save = vi.spyOn(settingsService, 'setDiacriticRules').mockResolvedValue([])
        const user = userEvent.setup()
        renderPage()
        await screen.findByRole('textbox', { name: 'Sursă 1' })
        await user.click(screen.getByRole('button', { name: 'Adaugă regulă' }))
        await user.type(screen.getByRole('textbox', { name: 'Sursă 2' }), 'Ț')
        await user.type(screen.getByRole('textbox', { name: 'Destinație 2' }), 't')
        await user.click(screen.getByRole('button', { name: 'Salvează regulile' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('apare de mai multe ori')
        expect(save).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: 'Șterge regula 1' }))
        await user.click(screen.getByRole('button', { name: 'Șterge regula 1' }))
        await user.click(screen.getByRole('button', { name: 'Salvează regulile' }))
        expect(save).toHaveBeenCalledWith([])
    })

})

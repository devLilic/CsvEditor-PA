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

})

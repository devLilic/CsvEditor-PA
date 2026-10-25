import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppUpdatePanel } from '@/ui/components/app-update/AppUpdatePanel'
import { settingsService } from '@/features/csv-editor/services/settingsService'
import type { UiTheme } from '@/features/theme/themeResolver'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function DefaultProjectSettingsPage() {
    const navigate = useNavigate()
    const [uiTheme, setUiTheme] = useState<UiTheme>('legacy')
    const [uiThemeStatus, setUiThemeStatus] = useState<SaveStatus>('idle')
    const [dividerCreationEnabled, setDividerCreationEnabled] = useState(true)
    const [dividerCreationStatus, setDividerCreationStatus] = useState<SaveStatus>('idle')
    const [showProjectSelector, setShowProjectSelector] = useState(true)
    const [projectSelectorStatus, setProjectSelectorStatus] = useState<SaveStatus>('idle')

    useEffect(() => {
        let isMounted = true
        settingsService.restoreUiTheme().then((storedTheme) => {
            if (isMounted) setUiTheme(storedTheme)
        })
        settingsService.getPlateauTitleDividerCreationEnabled().then((enabled) => {
            if (isMounted) setDividerCreationEnabled(enabled)
        })
        settingsService.getShowProjectSelectorEnabled().then((enabled) => {
            if (isMounted) setShowProjectSelector(enabled)
        })
        return () => { isMounted = false }
    }, [])

    const handleUiThemeChange = async (nextTheme: UiTheme) => {
        setUiTheme(nextTheme)
        setUiThemeStatus('saving')
        try {
            const savedTheme = await settingsService.setUiTheme(nextTheme)
            setUiTheme(savedTheme)
            setUiThemeStatus('saved')
        } catch {
            setUiThemeStatus('error')
        }
    }

    const handleDividerCreationChange = async (enabled: boolean) => {
        setDividerCreationEnabled(enabled)
        setDividerCreationStatus('saving')
        try {
            const savedValue = await settingsService.setPlateauTitleDividerCreationEnabled(enabled)
            setDividerCreationEnabled(savedValue)
            setDividerCreationStatus('saved')
        } catch {
            setDividerCreationStatus('error')
        }
    }

    const handleProjectSelectorChange = async (enabled: boolean) => {
        setShowProjectSelector(enabled)
        setProjectSelectorStatus('saving')
        try {
            const savedValue = await settingsService.setShowProjectSelectorEnabled(enabled)
            setShowProjectSelector(savedValue)
            setProjectSelectorStatus('saved')
        } catch {
            setProjectSelectorStatus('error')
        }
    }

    return (
        <main className="app-settings min-h-screen bg-gray-50 p-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
                <header className="sticky top-0 z-20 flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Setări aplicație</h1>
                        <p className="mt-1 text-sm text-gray-600">Preferințe generale pentru Tales.</p>
                    </div>
                    <button type="button" onClick={() => navigate('/csv-editor')} className="app-button shrink-0 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Înapoi la editor</button>
                </header>

                <section className="app-panel app-settings-section flex flex-col gap-4 rounded bg-white p-5 shadow-sm">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Aspect</h2>
                        <p className="mt-1 text-sm text-gray-600">Alege tema interfeței Tales.</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {([
                            ['legacy', 'Clasic'],
                            ['dark', 'Dark'],
                            ['metallic', 'Metallic Gray'],
                        ] as const).map(([value, label]) => (
                            <label key={value} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <input
                                    type="radio"
                                    name="uiTheme"
                                    value={value}
                                    checked={uiTheme === value}
                                    onChange={() => void handleUiThemeChange(value)}
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                    {uiThemeStatus === 'saved' && <span role="status" className="text-sm text-green-700">Salvat.</span>}
                    {uiThemeStatus === 'error' && <span role="alert" className="text-sm text-red-700">Tema nu a putut fi salvată.</span>}
                </section>

                <section className="app-panel app-settings-section flex flex-col gap-4 rounded bg-white p-5 shadow-sm">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Emisiunea activă</h2>
                        <p className="mt-1 text-sm text-gray-600">Ascunde selectorul în editor pentru a împiedica operatorii să schimbe emisiunea pe acest calculator.</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                            type="checkbox"
                            checked={showProjectSelector}
                            onChange={(event) => void handleProjectSelectorChange(event.target.checked)}
                        />
                        Afișează selectorul emisiunii în editor
                    </label>
                    {!showProjectSelector && <p className="text-sm text-amber-700">Selectorul este ascuns; emisiunea salvată ca activă rămâne în uz.</p>}
                    {projectSelectorStatus === 'saved' && <span role="status" className="text-sm text-green-700">Salvat.</span>}
                    {projectSelectorStatus === 'error' && <span role="alert" className="text-sm text-red-700">Preferința nu a putut fi salvată.</span>}
                </section>

                <section className="app-panel app-settings-section flex flex-col gap-4 rounded bg-white p-5 shadow-sm">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Interacțiune</h2>
                        <p className="mt-1 text-sm text-gray-600">Preferințe generale pentru editarea titlurilor.</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                            type="checkbox"
                            checked={dividerCreationEnabled}
                            onChange={(event) => void handleDividerCreationChange(event.target.checked)}
                        />
                        Activează butonul de separator în editorul de titluri
                    </label>
                    {dividerCreationStatus === 'saved' && <span role="status" className="text-sm text-green-700">Salvat.</span>}
                    {dividerCreationStatus === 'error' && <span role="alert" className="text-sm text-red-700">Preferința nu a putut fi salvată.</span>}
                </section>

                <section className="app-settings-section">
                    <h2 className="mb-3 text-lg font-semibold text-gray-900">Actualizări</h2>
                    <AppUpdatePanel />
                </section>
            </div>
        </main>
    )
}



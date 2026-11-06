import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppUpdatePanel } from '@/ui/components/app-update/AppUpdatePanel'
import { settingsService } from '@/features/csv-editor/services/settingsService'
import type { UiTheme } from '@/features/theme/themeResolver'
import { getDiacriticRules, isSingleUnicodeCharacter, type DiacriticRule } from '@/features/csv-editor/domain/diacriticRules'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function DefaultProjectSettingsPage() {
    const navigate = useNavigate()
    const [uiTheme, setUiTheme] = useState<UiTheme>('legacy')
    const [uiThemeStatus, setUiThemeStatus] = useState<SaveStatus>('idle')
    const [dividerCreationEnabled, setDividerCreationEnabled] = useState(true)
    const [dividerCreationStatus, setDividerCreationStatus] = useState<SaveStatus>('idle')
    const [showProjectSelector, setShowProjectSelector] = useState(true)
    const [projectSelectorStatus, setProjectSelectorStatus] = useState<SaveStatus>('idle')
    const [diacriticRules, setDiacriticRules] = useState<DiacriticRule[]>([])
    const [diacriticStatus, setDiacriticStatus] = useState<SaveStatus>('idle')
    const [diacriticError, setDiacriticError] = useState('')

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
        settingsService.getConfig().then((config) => {
            if (isMounted) setDiacriticRules(getDiacriticRules(config))
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

    const saveDiacriticRules = async () => {
        const seen = new Set<string>()
        for (const rule of diacriticRules) {
            if (!isSingleUnicodeCharacter(rule.from) || !isSingleUnicodeCharacter(rule.to)) {
                setDiacriticError('Fiecare sursă și destinație trebuie să conțină un singur caracter Unicode.')
                setDiacriticStatus('error')
                return
            }
            if (seen.has(rule.from)) {
                setDiacriticError(`Sursa „${rule.from}” apare de mai multe ori.`)
                setDiacriticStatus('error')
                return
            }
            seen.add(rule.from)
        }
        setDiacriticError('')
        setDiacriticStatus('saving')
        try {
            await settingsService.setDiacriticRules(diacriticRules)
            setDiacriticStatus('saved')
        } catch {
            setDiacriticStatus('error')
            setDiacriticError('Regulile nu au putut fi salvate.')
        }
    }

    const updateDiacriticRules = (update: (current: DiacriticRule[]) => DiacriticRule[]) => {
        setDiacriticRules(update)
        setDiacriticStatus('idle')
        setDiacriticError('')
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
                        <h2 className="text-lg font-semibold text-gray-900">Conversie diacritice la salvare</h2>
                        <p className="mt-1 text-sm text-gray-600">Înlocuiește caracterele din sursă cu destinația lor când salvezi sau actualizezi o entitate. Fiecare intrare are un singur caracter; lista goală dezactivează conversia.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        {diacriticRules.map((rule, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <label className="flex items-center gap-2 text-sm">Sursă
                                    <input aria-label={`Sursă ${index + 1}`} maxLength={2} value={rule.from} onChange={(event) => updateDiacriticRules((current) => current.map((item, i) => i === index ? { ...item, from: event.target.value } : item))} className="w-16 rounded border border-gray-300 px-2 py-1" />
                                </label>
                                <span aria-hidden="true">→</span>
                                <label className="flex items-center gap-2 text-sm">Destinație
                                    <input aria-label={`Destinație ${index + 1}`} maxLength={2} value={rule.to} onChange={(event) => updateDiacriticRules((current) => current.map((item, i) => i === index ? { ...item, to: event.target.value } : item))} className="w-16 rounded border border-gray-300 px-2 py-1" />
                                </label>
                                <button type="button" aria-label={`Șterge regula ${index + 1}`} onClick={() => updateDiacriticRules((current) => current.filter((_, i) => i !== index))} className="rounded border border-gray-300 px-2 py-1 text-sm">Șterge</button>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => updateDiacriticRules((current) => [...current, { from: '', to: '' }])} className="rounded border border-gray-300 px-3 py-2 text-sm">Adaugă regulă</button>
                        <button type="button" onClick={() => void saveDiacriticRules()} disabled={diacriticStatus === 'saving'} className="app-button rounded px-3 py-2 text-sm">Salvează regulile</button>
                    </div>
                    {diacriticError && <span role="alert" className="text-sm text-red-700">{diacriticError}</span>}
                    {diacriticStatus === 'saved' && <span role="status" className="text-sm text-green-700">Salvat.</span>}
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



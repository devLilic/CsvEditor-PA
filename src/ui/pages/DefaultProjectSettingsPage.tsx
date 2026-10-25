// src/ui/pages/DefaultProjectSettingsPage.tsx

import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    FALLBACK_DEFAULT_PROJECT_SETTINGS,
    type DefaultProjectSettings,
} from '@/features/csv-editor/domain/defaultProjectSettings'
import {
    FALLBACK_CSV_FILE_SETTINGS,
    type CsvFileSettings,
} from '@/features/csv-editor/domain/csvFileSettings'
import {
    FALLBACK_PHONE_IMAGE_SETTINGS,
    normalizePhoneImageSettings,
    type PhoneImageSettings,
} from '@/features/csv-editor/domain/phoneImageSettings'
import { defaultProjectSettingsService } from '@/features/csv-editor/services/defaultProjectSettingsService'
import { phoneImageSettingsService } from '@/features/csv-editor/services/phoneImageSettingsService'
import { csvFileSettingsService } from '@/features/csv-editor/services/csvFileSettingsService'
import { resolveEntityExportFolder } from '@/features/entity-export/domain/exportPathResolver'
import { AppUpdatePanel } from '@/ui/components/app-update/AppUpdatePanel'
import { settingsService } from '@/features/csv-editor/services/settingsService'
import type { UiTheme } from '@/features/theme/themeResolver'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function DefaultProjectSettingsPage() {
    const navigate = useNavigate()
    const [settings, setSettings] = useState<DefaultProjectSettings>(FALLBACK_DEFAULT_PROJECT_SETTINGS)
    const [phoneImageSettings, setPhoneImageSettings] = useState<PhoneImageSettings>(FALLBACK_PHONE_IMAGE_SETTINGS)
    const [csvFileSettings, setCsvFileSettings] = useState<CsvFileSettings>(FALLBACK_CSV_FILE_SETTINGS)
    const [status, setStatus] = useState<SaveStatus>('idle')
    const [phoneImageStatus, setPhoneImageStatus] = useState<SaveStatus>('idle')
    const [csvFileStatus, setCsvFileStatus] = useState<SaveStatus>('idle')
    const [uiTheme, setUiTheme] = useState<UiTheme>('legacy')
    const [uiThemeStatus, setUiThemeStatus] = useState<SaveStatus>('idle')
    const [dividerCreationEnabled, setDividerCreationEnabled] = useState(true)
    const [dividerCreationStatus, setDividerCreationStatus] = useState<SaveStatus>('idle')

    useEffect(() => {
        let isMounted = true

        defaultProjectSettingsService.getDefaultProjectSettings().then((storedSettings) => {
            if (isMounted) {
                setSettings(storedSettings)
            }
        })

        phoneImageSettingsService.getPhoneImageSettings().then((storedSettings) => {
            if (isMounted) {
                setPhoneImageSettings(storedSettings)
            }
        })

        csvFileSettingsService.getCsvFileSettings().then((storedSettings) => {
            if (isMounted) {
                setCsvFileSettings(storedSettings)
            }
        })

        settingsService.restoreUiTheme().then((storedTheme) => {
            if (isMounted) {
                setUiTheme(storedTheme)
            }
        })

        settingsService.getPlateauTitleDividerCreationEnabled().then((enabled) => {
            if (isMounted) {
                setDividerCreationEnabled(enabled)
            }
        })

        return () => {
            isMounted = false
        }
    }, [])

    const updateField = (field: keyof DefaultProjectSettings, value: string) => {
        setStatus('idle')
        setSettings((current) => ({
            ...current,
            [field]: value,
        }))
    }

    const updatePhoneImageField = (field: keyof PhoneImageSettings, value: string) => {
        setPhoneImageStatus('idle')
        setPhoneImageSettings((current) => ({
            ...current,
            [field]: field === 'workPath' ? value : Number(value),
        }))
    }

    const updateCsvFileField = (field: keyof CsvFileSettings, value: string) => {
        setCsvFileStatus('idle')
        setCsvFileSettings((current) => ({
            ...current,
            [field]: value,
        }))
    }

    const saveSettings = async (nextSettings: DefaultProjectSettings) => {
        setStatus('saving')

        try {
            const savedSettings = await defaultProjectSettingsService.setDefaultProjectSettings(nextSettings)
            setSettings(savedSettings)
            setStatus('saved')
        } catch {
            setStatus('error')
        }
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        await saveSettings(settings)
    }

    const handleReset = async () => {
        await saveSettings(FALLBACK_DEFAULT_PROJECT_SETTINGS)
    }

    const savePhoneImageSettings = async (nextSettings: PhoneImageSettings) => {
        setPhoneImageStatus('saving')

        try {
            const savedSettings = await phoneImageSettingsService.setPhoneImageSettings(
                normalizePhoneImageSettings(nextSettings)
            )
            setPhoneImageSettings(savedSettings)
            setPhoneImageStatus('saved')
        } catch {
            setPhoneImageSettings(FALLBACK_PHONE_IMAGE_SETTINGS)
            setPhoneImageStatus('error')
        }
    }

    const handlePhoneImageSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        await savePhoneImageSettings(phoneImageSettings)
    }

    const handlePhoneImageReset = async () => {
        await savePhoneImageSettings(FALLBACK_PHONE_IMAGE_SETTINGS)
    }

    const saveCsvFileSettings = async (nextSettings: CsvFileSettings) => {
        setCsvFileStatus('saving')

        try {
            const savedSettings = await csvFileSettingsService.setCsvFileSettings(nextSettings)
            setCsvFileSettings(savedSettings)
            setCsvFileStatus('saved')
        } catch {
            setCsvFileSettings(FALLBACK_CSV_FILE_SETTINGS)
            setCsvFileStatus('error')
        }
    }

    const handleCsvFileSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        await saveCsvFileSettings(csvFileSettings)
    }

    const handleSelectProjectFolder = async () => {
        setCsvFileStatus('idle')
        const selectedPath = await csvFileSettingsService.selectProjectFolder()
        if (!selectedPath) return

        setCsvFileSettings((current) => ({
            ...current,
            projectFolderPath: selectedPath,
        }))
    }

    const handleUiThemeChange = async (nextTheme: UiTheme) => {
        setUiTheme(nextTheme)
        setUiThemeStatus('saving')

        try {
            const savedTheme = await settingsService.setUiTheme(nextTheme)
            setUiTheme(savedTheme)
            setUiThemeStatus('saved')
        } catch {
            setUiTheme('legacy')
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
            setDividerCreationEnabled(true)
            setDividerCreationStatus('error')
        }
    }

    const resolvedExportCsvFolder = csvFileSettings.projectFolderPath
        ? resolveEntityExportFolder({ projectFolderPath: csvFileSettings.projectFolderPath })
        : ''

    return (
        <main className="app-settings min-h-screen bg-gray-50 p-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Tales - Setări proiect nou
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Texte standard pentru proiect nou. Aceste valori vor fi folosite pentru următorul proiect nou.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => navigate('/settings/lower-thirds')}
                            className="app-button rounded border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                        >
                            Tipuri lower third
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/csv-editor')}
                            className="app-button rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                            Înapoi la editor
                        </button>
                    </div>
                </header>

                <section className="app-panel app-settings-section app-settings-interface flex flex-col gap-4 rounded bg-white p-5 shadow-sm">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Aspect interfață
                        </h2>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                                type="radio"
                                name="uiTheme"
                                value="legacy"
                                checked={uiTheme === 'legacy'}
                                onChange={() => handleUiThemeChange('legacy')}
                            />
                            Clasic
                        </label>

                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                                type="radio"
                                name="uiTheme"
                                value="dark"
                                checked={uiTheme === 'dark'}
                                onChange={() => handleUiThemeChange('dark')}
                            />
                            Dark
                        </label>

                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                                type="radio"
                                name="uiTheme"
                                value="metallic"
                                checked={uiTheme === 'metallic'}
                                onChange={() => handleUiThemeChange('metallic')}
                            />
                            Metallic Gray
                        </label>

                        {uiThemeStatus === 'saved' && (
                            <span className="text-sm text-green-700">Salvat.</span>
                        )}

                        {uiThemeStatus === 'error' && (
                            <span className="text-sm text-red-700">Setarea nu a putut fi salvată.</span>
                        )}
                    </div>

                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                            type="checkbox"
                            checked={dividerCreationEnabled}
                            onChange={(event) => handleDividerCreationChange(event.target.checked)}
                        />
                        Use Divider
                    </label>

                    {dividerCreationStatus === 'saved' && (
                        <span className="text-sm text-green-700">Salvat.</span>
                    )}

                    {dividerCreationStatus === 'error' && (
                        <span className="text-sm text-red-700">Setarea Divider nu a putut fi salvata.</span>
                    )}
                </section>

                <form onSubmit={handleSubmit} className="app-panel app-settings-section app-settings-general flex flex-col gap-5 rounded bg-white p-5 shadow-sm">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            General
                        </h2>
                    </div>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Titlu implicit</span>
                        <input
                            value={settings.title}
                            onChange={(event) => updateField('title', event.target.value)}
                            className="app-input rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Nume implicit</span>
                        <input
                            value={settings.personName}
                            onChange={(event) => updateField('personName', event.target.value)}
                            className="app-input rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Funcție implicită</span>
                        <input
                            value={settings.personOccupation}
                            onChange={(event) => updateField('personOccupation', event.target.value)}
                            className="app-input rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Locație implicită</span>
                        <input
                            value={settings.location}
                            onChange={(event) => updateField('location', event.target.value)}
                            className="app-input rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </label>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={status === 'saving'}
                            className="app-button app-button-primary rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Salvează
                        </button>

                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={status === 'saving'}
                            className="app-button rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Resetează la valori standard
                        </button>

                        {status === 'saved' && (
                            <span className="text-sm text-green-700">Salvat.</span>
                        )}

                        {status === 'error' && (
                            <span className="text-sm text-red-700">Setările nu au putut fi salvate.</span>
                        )}
                    </div>
                </form>

                <form onSubmit={handlePhoneImageSubmit} className="app-panel app-settings-section app-settings-files flex flex-col gap-5 rounded bg-white p-5 shadow-sm">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Setări imagine apel telefonic
                        </h2>
                    </div>

                    <p className="text-sm text-gray-600">Imaginile telefonice se salvează în subfolderul Telefon din folderul proiectului.</p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-700">Width imagine finală</span>
                            <input
                                type="number"
                                min="1"
                                value={phoneImageSettings.width}
                                onChange={(event) => updatePhoneImageField('width', event.target.value)}
                                className="app-input rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-700">Height imagine finală</span>
                            <input
                                type="number"
                                min="1"
                                value={phoneImageSettings.height}
                                onChange={(event) => updatePhoneImageField('height', event.target.value)}
                                className="app-input rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={phoneImageStatus === 'saving'}
                            className="app-button app-button-primary rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Salvează
                        </button>

                        <button
                            type="button"
                            onClick={handlePhoneImageReset}
                            disabled={phoneImageStatus === 'saving'}
                            className="app-button rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Resetează la valori standard
                        </button>

                        {phoneImageStatus === 'saved' && (
                            <span className="text-sm text-green-700">Salvat.</span>
                        )}

                        {phoneImageStatus === 'error' && (
                            <span className="text-sm text-red-700">Setările nu au putut fi salvate.</span>
                        )}
                    </div>
                </form>

                <form onSubmit={handleCsvFileSubmit} className="app-panel app-settings-section app-settings-storage flex flex-col gap-5 rounded bg-white p-5 shadow-sm">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Stocarea proiectului</h2>
                        <p className="mt-1 text-sm text-gray-600">Alege folderul proiectului. Aplicația creează în el folderele Saved, Backup, Export și Telefon.</p>
                    </div>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Folder de lucru al proiectului</span>
                        <div className="flex gap-2">
                            <input
                                aria-label="Folder de lucru al proiectului"
                                value={csvFileSettings.projectFolderPath}
                                onChange={(event) => updateCsvFileField('projectFolderPath', event.target.value)}
                                className="app-input min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleSelectProjectFolder}
                                className="app-button shrink-0 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            >
                                Alege folder
                            </button>
                        </div>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Prefix export</span>
                        <input
                            aria-label="Prefix export"
                            value={csvFileSettings.exportPrefix}
                            onChange={(event) => updateCsvFileField('exportPrefix', event.target.value)}
                            className="app-input rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-500">Se aplică numelor fișierelor CSV și numelor șabloanelor scrise în exporturi.</span>
                    </label>
                    {resolvedExportCsvFolder && <span className="text-xs text-gray-500">Exporturile vor fi salvate în: {resolvedExportCsvFolder}</span>}

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={csvFileStatus === 'saving'}
                            className="app-button app-button-primary rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Salvează
                        </button>

                        {csvFileStatus === 'saved' && (
                            <span className="text-sm text-green-700">Salvat.</span>
                        )}

                        {csvFileStatus === 'error' && (
                            <span className="text-sm text-red-700">Setările nu au putut fi salvate.</span>
                        )}
                    </div>
                </form>

                <div className="app-settings-section app-settings-updates">
                    <h2 className="mb-3 text-lg font-semibold text-gray-900">
                        Actualizări
                    </h2>
                    <AppUpdatePanel />
                </div>
            </div>
        </main>
    )
}

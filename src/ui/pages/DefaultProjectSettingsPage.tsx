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

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function DefaultProjectSettingsPage() {
    const navigate = useNavigate()
    const [settings, setSettings] = useState<DefaultProjectSettings>(FALLBACK_DEFAULT_PROJECT_SETTINGS)
    const [phoneImageSettings, setPhoneImageSettings] = useState<PhoneImageSettings>(FALLBACK_PHONE_IMAGE_SETTINGS)
    const [csvFileSettings, setCsvFileSettings] = useState<CsvFileSettings>(FALLBACK_CSV_FILE_SETTINGS)
    const [status, setStatus] = useState<SaveStatus>('idle')
    const [phoneImageStatus, setPhoneImageStatus] = useState<SaveStatus>('idle')
    const [csvFileStatus, setCsvFileStatus] = useState<SaveStatus>('idle')

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

    const handleSelectWorkPath = async () => {
        setPhoneImageStatus('idle')
        const selectedPath = await phoneImageSettingsService.selectWorkPath()
        if (!selectedPath) return

        setPhoneImageSettings((current) => ({
            ...current,
            workPath: selectedPath,
        }))
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

    const handleSelectWorkingCsv = async () => {
        setCsvFileStatus('idle')
        const selectedPath = await csvFileSettingsService.selectWorkingCsv()
        if (!selectedPath) return

        setCsvFileSettings((current) => ({
            ...current,
            workingCsvPath: selectedPath,
        }))
    }

    const handleSelectBackupFolder = async () => {
        setCsvFileStatus('idle')
        const selectedPath = await csvFileSettingsService.selectBackupFolder()
        if (!selectedPath) return

        setCsvFileSettings((current) => ({
            ...current,
            backupFolderPath: selectedPath,
        }))
    }

    const handleSelectSavedProjectsFolder = async () => {
        setCsvFileStatus('idle')
        const selectedPath = await csvFileSettingsService.selectSavedProjectsFolder()
        if (!selectedPath) return

        setCsvFileSettings((current) => ({
            ...current,
            savedProjectsFolderPath: selectedPath,
        }))
    }

    const handleSelectExportCsvFolder = async () => {
        setCsvFileStatus('idle')
        const selectedPath = await csvFileSettingsService.selectExportCsvFolder()
        if (!selectedPath) return

        setCsvFileSettings((current) => ({
            ...current,
            exportCsvFolderPath: selectedPath,
        }))
    }

    const resolvedExportCsvFolder = csvFileSettings.workingCsvPath
        ? resolveEntityExportFolder({
            workingCsvPath: csvFileSettings.workingCsvPath,
            exportFolderPath: csvFileSettings.exportCsvFolderPath,
        })
        : ''

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
                <header className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Punctul pe Azi - Setări proiect nou
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Texte standard pentru proiect nou. Aceste valori vor fi folosite pentru următorul proiect nou.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('/csv-editor')}
                        className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        Înapoi la editor
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded bg-white p-5 shadow-sm">
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Titlu implicit</span>
                        <input
                            value={settings.title}
                            onChange={(event) => updateField('title', event.target.value)}
                            className="rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Nume implicit</span>
                        <input
                            value={settings.personName}
                            onChange={(event) => updateField('personName', event.target.value)}
                            className="rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Funcție implicită</span>
                        <input
                            value={settings.personOccupation}
                            onChange={(event) => updateField('personOccupation', event.target.value)}
                            className="rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Locație implicită</span>
                        <input
                            value={settings.location}
                            onChange={(event) => updateField('location', event.target.value)}
                            className="rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Ultima oră implicită</span>
                        <input
                            value={settings.hotTitle}
                            onChange={(event) => updateField('hotTitle', event.target.value)}
                            className="rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </label>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={status === 'saving'}
                            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Salvează
                        </button>

                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={status === 'saving'}
                            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
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

                <form onSubmit={handlePhoneImageSubmit} className="flex flex-col gap-5 rounded bg-white p-5 shadow-sm">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Setări imagine apel telefonic
                        </h2>
                    </div>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Folder imagini telefonice</span>
                        <div className="flex gap-2">
                            <input
                                value={phoneImageSettings.workPath}
                                onChange={(event) => updatePhoneImageField('workPath', event.target.value)}
                                className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleSelectWorkPath}
                                className="shrink-0 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            >
                                Alege folder
                            </button>
                        </div>
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-700">Width imagine finală</span>
                            <input
                                type="number"
                                min="1"
                                value={phoneImageSettings.width}
                                onChange={(event) => updatePhoneImageField('width', event.target.value)}
                                className="rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-700">Height imagine finală</span>
                            <input
                                type="number"
                                min="1"
                                value={phoneImageSettings.height}
                                onChange={(event) => updatePhoneImageField('height', event.target.value)}
                                className="rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={phoneImageStatus === 'saving'}
                            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Salvează
                        </button>

                        <button
                            type="button"
                            onClick={handlePhoneImageReset}
                            disabled={phoneImageStatus === 'saving'}
                            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
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

                <form onSubmit={handleCsvFileSubmit} className="flex flex-col gap-5 rounded bg-white p-5 shadow-sm">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Setări fișier CSV
                        </h2>
                    </div>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Fișier CSV de lucru</span>
                        <div className="flex gap-2">
                            <input
                                value={csvFileSettings.workingCsvPath}
                                onChange={(event) => updateCsvFileField('workingCsvPath', event.target.value)}
                                className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleSelectWorkingCsv}
                                className="shrink-0 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            >
                                Alege CSV
                            </button>
                        </div>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Folder backup CSV</span>
                        <div className="flex gap-2">
                            <input
                                value={csvFileSettings.backupFolderPath}
                                onChange={(event) => updateCsvFileField('backupFolderPath', event.target.value)}
                                className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleSelectBackupFolder}
                                className="shrink-0 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            >
                                Alege folder backup
                            </button>
                        </div>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Folder proiecte salvate</span>
                        <div className="flex gap-2">
                            <input
                                value={csvFileSettings.savedProjectsFolderPath}
                                onChange={(event) => updateCsvFileField('savedProjectsFolderPath', event.target.value)}
                                className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleSelectSavedProjectsFolder}
                                className="shrink-0 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            >
                                Alege folder proiecte salvate
                            </button>
                        </div>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Export CSV Folder</span>
                        <div className="flex gap-2">
                            <input
                                aria-label="Export CSV Folder"
                                value={csvFileSettings.exportCsvFolderPath}
                                onChange={(event) => updateCsvFileField('exportCsvFolderPath', event.target.value)}
                                className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleSelectExportCsvFolder}
                                className="shrink-0 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            >
                                Alege folder export
                            </button>
                        </div>
                        <span className="w-fit max-w-full truncate rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                            {resolvedExportCsvFolder
                                ? `Folder efectiv: ${resolvedExportCsvFolder}`
                                : 'Fallback: folderul Export langa fisierul CSV de lucru'}
                        </span>
                    </label>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={csvFileStatus === 'saving'}
                            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

                <AppUpdatePanel />
            </div>
        </main>
    )
}

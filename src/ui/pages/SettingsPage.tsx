import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    DEFAULT_LOWER_THIRD_TYPE_ID,
    DEFAULT_LOWER_THIRD_TYPES,
    type LowerThirdTypeDefinition,
} from '@/features/lower-thirds/domain/lowerThirdTypes'
import type { EntitiesState } from '@/features/csv-editor/domain/entities'
import { useEntities } from '@/features/csv-editor'
import { csvService } from '@/features/csv-editor/services/csvService'
import { serializeCsv } from '@/features/csv-editor/utils/csvSerializer'
import { useLowerThirdTypes } from '@/ui/hooks/useLowerThirdTypes'

function updateType(
    types: LowerThirdTypeDefinition[],
    typeId: string,
    update: (type: LowerThirdTypeDefinition) => LowerThirdTypeDefinition,
) {
    return types.map((type) => type.id === typeId ? update(type) : type)
}

function createTypeId(existingTypes: LowerThirdTypeDefinition[]) {
    const existing = new Set(existingTypes.map((type) => type.id))
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    let candidate = `custom-${randomId}`
    let suffix = 1
    while (existing.has(candidate)) {
        candidate = `custom-${randomId}-${suffix++}`
    }
    return candidate
}

function reassignDeletedType(entities: EntitiesState, deletedTypeId: string): EntitiesState {
    return {
        ...entities,
        sections: entities.sections.map((section) => ({
            ...section,
            rows: section.rows.map((row) => ({
                ...row,
                title: row.title?.lowerThirdTypeId === deletedTypeId
                    ? { ...row.title, lowerThirdTypeId: DEFAULT_LOWER_THIRD_TYPE_ID, lowerThirdTemplateOverride: '' }
                    : row.title,
                person: row.person?.lowerThirdTypeId === deletedTypeId
                    ? { ...row.person, lowerThirdTypeId: DEFAULT_LOWER_THIRD_TYPE_ID, lowerThirdTemplateOverride: '' }
                    : row.person,
            })),
        })),
    }
}

export function SettingsPage() {
    const navigate = useNavigate()
    const { types, setTypes, isLoaded } = useLowerThirdTypes()
    const { sections, updateEntity } = useEntities()
    const [draft, setDraft] = useState(types)
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        setDraft(types)
    }, [types])

    const save = async () => {
        setIsSaving(true)
        setSaved(false)
        setError('')
        let didSaveTypes = false
        try {
            const savedTypes = await setTypes(draft)
            didSaveTypes = true
            const entities = { sections }
            const write = await csvService.write(serializeCsv(entities), entities, savedTypes)
            if (!write.ok) throw new Error(write.error ?? 'LOWER_THIRD_TYPES_EXPORT_FAILED')
            setSaved(true)
        } catch (saveError) {
            if (didSaveTypes) {
                try {
                    await setTypes(types)
                } catch {
                    // Keep the original save error visible; the settings service reports rollback failure separately.
                }
            }
            const message = saveError instanceof Error ? saveError.message : 'LOWER_THIRD_TYPES_SAVE_FAILED'
            setError(message === 'LOWER_THIRD_TYPES_INVALID_OR_TEMPLATE_NAMES_NOT_UNIQUE'
                ? 'Completează toate câmpurile și folosește un nume de șablon unic pentru fiecare categorie.'
                : message)
        } finally {
            setIsSaving(false)
        }
    }

    const updateName = (typeId: string, name: string) => setDraft((current) => updateType(
        current,
        typeId,
        (type) => ({ ...type, name }),
    ))
    const updatePalette = (typeId: string, key: keyof LowerThirdTypeDefinition['palette'], value: string | number) => setDraft((current) => updateType(
        current,
        typeId,
        (type) => ({ ...type, palette: { ...type.palette, [key]: value } }),
    ))
    const updateTemplate = (typeId: string, kind: 'titles' | 'persons', name: string) => setDraft((current) => updateType(
        current,
        typeId,
        (type) => ({ ...type, templates: { ...type.templates, [kind]: { name } } }),
    ))

    const addType = () => {
        const id = createTypeId(draft)
        const ordinary = draft.find((type) => type.id === DEFAULT_LOWER_THIRD_TYPE_ID) ?? DEFAULT_LOWER_THIRD_TYPES[0]
        setDraft((current) => [...current, {
            ...ordinary,
            id,
            name: 'Tip nou',
            templates: {
                titles: { name: `Titlu_${id}` },
                persons: { name: `Persoana_${id}` },
            },
        }])
        setSaved(false)
    }

    const deleteType = async (typeId: string) => {
        if (typeId === DEFAULT_LOWER_THIRD_TYPE_ID) return
        const nextTypes = draft.filter((type) => type.id !== typeId)
        const nextEntities = reassignDeletedType({ sections }, typeId)
        setIsSaving(true)
        setSaved(false)
        setError('')
        try {
            const savedTypes = await setTypes(nextTypes)
            const write = await csvService.write(serializeCsv(nextEntities), nextEntities, savedTypes)
            if (!write.ok) {
                await setTypes(draft)
                throw new Error(write.error ?? 'LOWER_THIRD_TYPE_DELETE_FAILED')
            }

            for (const section of sections) {
                for (const row of section.rows) {
                    if (row.title?.lowerThirdTypeId === typeId) {
                        updateEntity(section.id, 'titles', row.title.id, {
                            title: row.title.title,
                            supratitle: row.title.supratitle,
                            lowerThirdTypeId: DEFAULT_LOWER_THIRD_TYPE_ID,
                            lowerThirdTemplateOverride: '',
                        })
                    }
                    if (row.person?.lowerThirdTypeId === typeId) {
                        updateEntity(section.id, 'persons', row.person.id, {
                            name: row.person.name,
                            occupation: row.person.occupation,
                            image: row.person.image,
                            lowerThirdTypeId: DEFAULT_LOWER_THIRD_TYPE_ID,
                            lowerThirdTemplateOverride: '',
                        })
                    }
                }
            }
            setDraft(savedTypes)
            setSaved(true)
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'LOWER_THIRD_TYPE_DELETE_FAILED')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <main className="app-settings min-h-screen bg-gray-50 p-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-5">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">Setări lower thirds</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Configurează denumirea, culorile și șabloanele pentru titluri și persoane.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/csv-editor')}
                        className="app-button app-button-secondary rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
                    >
                        Înapoi la editor
                    </button>
                </header>

                <section className="app-panel rounded border bg-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold">Tipuri de lower third</h2>
                            <p className="text-sm text-gray-600">Setările se aplică selectorului din editor și previzualizării.</p>
                        </div>
                        <button
                            type="button"
                            onClick={save}
                            disabled={!isLoaded || isSaving}
                            className="app-button app-button-primary rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                        >
                            {isSaving ? 'Se salvează…' : 'Salvează'}
                        </button>
                    </div>

                    {error && <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
                    {saved && <p role="status" className="mb-3 rounded bg-green-50 p-2 text-sm text-green-700">Setările au fost salvate.</p>}

                    <div className="grid gap-4">
                        {draft.map((type, index) => (
                            <fieldset key={type.id} className="rounded border border-gray-200 p-4">
                                <legend className="px-2 font-semibold">Tip {index + 1}</legend>
                                {type.id !== DEFAULT_LOWER_THIRD_TYPE_ID && (
                                    <button
                                        type="button"
                                        onClick={() => void deleteType(type.id)}
                                        disabled={isSaving}
                                        aria-label={`Șterge tipul ${type.name}`}
                                        className="mb-3 rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        Șterge tipul
                                    </button>
                                )}
                                <div className="grid gap-4 lg:grid-cols-[minmax(180px,1fr)_repeat(3,minmax(130px,0.8fr))_minmax(160px,1fr)]">
                                    <label className="flex flex-col gap-1 text-sm font-medium">
                                        Denumire
                                        <input
                                            aria-label={`Denumire ${type.id}`}
                                            value={type.name}
                                            onChange={(event) => updateName(type.id, event.target.value)}
                                            className="rounded border border-gray-300 px-3 py-2"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm font-medium">
                                        Culoare indicator
                                        <span className="flex items-center gap-2 rounded border border-gray-300 px-2 py-1">
                                            <input
                                                aria-label={`Culoare indicator ${type.id}`}
                                                type="color"
                                                value={type.palette.indicatorColor}
                                                onChange={(event) => updatePalette(type.id, 'indicatorColor', event.target.value)}
                                                className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"
                                            />
                                            <span className="text-xs text-gray-600">{type.palette.indicatorColor}</span>
                                        </span>
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm font-medium">
                                        Culoare fundal
                                        <span className="flex items-center gap-2 rounded border border-gray-300 px-2 py-1">
                                            <input
                                                aria-label={`Culoare fundal ${type.id}`}
                                                type="color"
                                                value={type.palette.backgroundColor}
                                                onChange={(event) => updatePalette(type.id, 'backgroundColor', event.target.value)}
                                                className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"
                                            />
                                            <span className="text-xs text-gray-600">{type.palette.backgroundColor}</span>
                                        </span>
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm font-medium">
                                        Culoare text
                                        <span className="flex items-center gap-2 rounded border border-gray-300 px-2 py-1">
                                            <input
                                                aria-label={`Culoare text ${type.id}`}
                                                type="color"
                                                value={type.palette.textColor}
                                                onChange={(event) => updatePalette(type.id, 'textColor', event.target.value)}
                                                className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"
                                            />
                                            <span className="text-xs text-gray-600">{type.palette.textColor}</span>
                                        </span>
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm font-medium">
                                        Opacitate fundal
                                        <span className="flex items-center gap-2">
                                            <input
                                                aria-label={`Opacitate fundal ${type.id}`}
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={type.palette.opacity}
                                                onChange={(event) => updatePalette(type.id, 'opacity', Number(event.target.value))}
                                                className="min-w-0 flex-1"
                                            />
                                            <span className="w-10 text-right text-xs text-gray-600">{Math.round(type.palette.opacity * 100)}%</span>
                                        </span>
                                    </label>
                                </div>
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    <label className="flex flex-col gap-1 text-sm font-medium">
                                        Șablon titlu
                                        <input
                                            aria-label={`Șablon titlu ${type.id}`}
                                            value={type.templates.titles.name}
                                            onChange={(event) => updateTemplate(type.id, 'titles', event.target.value)}
                                            className="rounded border border-gray-300 px-3 py-2"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm font-medium">
                                        Șablon persoană
                                        <input
                                            aria-label={`Șablon persoană ${type.id}`}
                                            value={type.templates.persons.name}
                                            onChange={(event) => updateTemplate(type.id, 'persons', event.target.value)}
                                            className="rounded border border-gray-300 px-3 py-2"
                                        />
                                    </label>
                                </div>
                            </fieldset>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={addType}
                        className="mt-4 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                    >
                        Adaugă tip
                    </button>
                </section>
            </div>
        </main>
    )
}
